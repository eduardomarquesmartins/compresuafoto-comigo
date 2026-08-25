const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const prisma = require('../lib/prisma');
const archiver = require('archiver');
const https = require('https');
const emailService = require('../services/email');
const { logToFile } = require('../utils/logger');

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-00000000-0000-0000-0000-000000000000' });

const paidStatuses = ['PAID', 'approved'];

const getOrderWhere = (id, allowNumericId = false) => {
    if (!Number.isNaN(Number(id)) && String(id).trim() !== '') {
        if (!allowNumericId) {
            const error = new Error('Numeric order IDs are not allowed for public access');
            error.status = 403;
            throw error;
        }
        return { id: parseInt(id, 10) };
    }

    return { publicId: id };
};

const canAccessOrder = (req, order) => {
    if (!req.user) return false;
    return req.user.role === 'ADMIN' || req.user.userId === order.userId;
};

const buildOrderResponse = async (order, canDownloadOriginals = false) => {
    let photoIds = [];
    try {
        photoIds = JSON.parse(order.items);
    } catch (e) {
        photoIds = [];
    }

    const photos = await prisma.photo.findMany({
        where: { id: { in: photoIds } }
    });

    const isPaid = paidStatuses.includes(order.status);
    const safePhotos = photos.map(photo => ({
        id: photo.id,
        originalUrl: isPaid && canDownloadOriginals ? photo.originalUrl : null,
        watermarkedUrl: photo.watermarkedUrl,
        price: photo.price
    }));

    return {
        id: order.id,
        publicId: order.publicId,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        photos: safePhotos
    };
};

const resolveClientUrl = (req, fallback = 'https://econticomigo.com.br/compresuafoto') => {
    let clientUrl = process.env.CLIENT_URL || fallback;
    const referer = req.headers.referer || req.headers.origin;
    if (referer) {
        try {
            const urlObj = new URL(referer);
            const photoPath = urlObj.pathname.startsWith('/compresuafoto') ? '/compresuafoto' : '';
            clientUrl = `${urlObj.protocol}//${urlObj.host}${photoPath}`;
        } catch (e) {
            // ignore invalid referer
        }
    }
    return clientUrl;
};

const applyCouponRedemption = async (tx, order, userCpf) => {
    if (!order.couponCode) return;

    const coupon = await tx.coupon.findUnique({
        where: { code: order.couponCode.toUpperCase() }
    });

    if (!coupon) return;

    if (coupon.oncePerCpf && userCpf) {
        const existingUsage = await tx.couponUsage.findUnique({
            where: { couponId_cpf: { couponId: coupon.id, cpf: userCpf } }
        });

        if (!existingUsage) {
            await tx.couponUsage.create({
                data: { couponId: coupon.id, cpf: userCpf }
            });
            await tx.coupon.update({
                where: { id: coupon.id },
                data: { usedCount: { increment: 1 } }
            });
            return;
        }

        return;
    }

    await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } }
    });
};

const finalizeApprovedOrder = async (orderId, clientUrl = null) => {
    const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { user: true }
        });

        if (!order) {
            const error = new Error('Order not found');
            error.status = 404;
            throw error;
        }

        if (paidStatuses.includes(order.status)) {
            return { order, alreadyPaid: true };
        }

        const userCpf = order.user?.cpf ? order.user.cpf.replace(/\D/g, '') : null;

        const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: 'approved' },
            include: { user: true }
        });

        await applyCouponRedemption(tx, updatedOrder, userCpf);

        return { order: updatedOrder, alreadyPaid: false };
    });

    if (!result.alreadyPaid && result.order.user?.email) {
        let photoCount = 0;
        try {
            photoCount = JSON.parse(result.order.items).length;
        } catch (e) {
            photoCount = 0;
        }

        const emailResult = await emailService.sendOrderEmail(
            result.order.user.email,
            result.order.publicId || result.order.id,
            photoCount,
            clientUrl
        );

        if (emailResult.success) {
            logToFile(`Email sent to ${result.order.user.email} for order ${result.order.publicId || result.order.id}`);
        } else {
            logToFile(`FAILED email to ${result.order.user.email}: ${emailResult.error}`);
        }
    }

    return result.order;
};

exports.createOrder = async (req, res) => {
    try {
        const { photoIds, eventName, couponCode } = req.body;
        const userId = req.user ? req.user.userId : null;

        if (!userId) {
            return res.status(401).json({ error: 'Login required to create an order.' });
        }

        if (!Array.isArray(photoIds) || photoIds.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto valida selecionada.' });
        }

        // 1. Server-side price calculation with progressive tiers
        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds } }
        });

        if (photos.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto válida selecionada.' });
        }

        // Progressive pricing tiers (must match client-side useCartStore)
        const count = photos.length;
        const UNIT_PRICE = 20; // Base price R$ 20 per photo
        let pricePerPhoto = UNIT_PRICE;
        if (count >= 20) pricePerPhoto = 9;
        else if (count >= 10) pricePerPhoto = 10;
        else if (count >= 5) pricePerPhoto = 15;

        let serverTotal = count * pricePerPhoto;

        // 2. Fetch user and check for CPF
        let userCpf = null;
        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { cpf: true } });
            if (!user || !user.cpf || !user.cpf.trim()) {
                return res.status(403).json({ error: 'Perfil incompleto. Por favor, cadastre seu CPF antes de finalizar a compra.' });
            }
            userCpf = user.cpf.replace(/\D/g, '');
        }

        // 3. Apply coupon discount server-side
        let validCoupon = null;
        if (couponCode) {
            validCoupon = await prisma.coupon.findUnique({
                where: { code: couponCode.toUpperCase() }
            });

            if (validCoupon && validCoupon.isActive) {
                // Check expiry
                if (validCoupon.expiryDate && new Date(validCoupon.expiryDate) < new Date()) {
                    validCoupon = null;
                }
                // Check max uses
                if (validCoupon && validCoupon.maxUses && validCoupon.usedCount >= validCoupon.maxUses) {
                    validCoupon = null;
                }
                // Check per-CPF restriction
                if (validCoupon && validCoupon.oncePerCpf && userCpf) {
                    const existingUsage = await prisma.couponUsage.findUnique({
                        where: { couponId_cpf: { couponId: validCoupon.id, cpf: userCpf } }
                    });
                    if (existingUsage) {
                        return res.status(400).json({ error: 'Este cupom já foi utilizado com o seu CPF.' });
                    }
                }
            } else {
                validCoupon = null;
            }

            if (validCoupon) {
                let discount = 0;
                if (validCoupon.discountType === 'PERCENTAGE') {
                    discount = serverTotal * (validCoupon.discountValue / 100);
                } else if (validCoupon.discountType === 'FIXED') {
                    discount = validCoupon.discountValue;
                }

                // Free photos discount (use the tier-adjusted price per photo)
                if (validCoupon.freePhotos > 0) {
                    const applicableFreePhotos = Math.min(count, validCoupon.freePhotos);
                    discount += applicableFreePhotos * pricePerPhoto;
                }

                serverTotal = Math.max(0, serverTotal - discount);
            }
        }

        // 3. Create Order in DB
        const result = await prisma.order.create({
            data: {
                total: parseFloat(serverTotal.toFixed(2)),
                items: JSON.stringify(photoIds),
                status: 'PENDING',
                userId: userId,
                couponCode: couponCode || null
            }
        });

        // 4. Handle Zero-Total Checkout (Skip Mercado Pago)
        if (serverTotal === 0) {
            const clientUrl = resolveClientUrl(req);
            await finalizeApprovedOrder(result.id, clientUrl);

            return res.status(201).json({
                orderId: result.publicId || result.id,
                status: 'PAID',
                message: 'Pedido processado gratuitamente.'
            });
        }

        // 5. Create Preference in Mercado Pago
        const preference = new Preference(client);

        // Dynamically determine Client URL (handle localhost vs production)
        const CLIENT_URL = resolveClientUrl(req);

        // Dynamically determine Backend URL for Webhooks
        let SERVER_URL = process.env.SERVER_URL || 'https://compresuafoto-comigo.onrender.com';
        const host = req.get('host');
        if (host && host.includes('localhost')) {
            SERVER_URL = `http://${host}`;
        }

        const preferencePayload = {
            body: {
                items: [
                    {
                        id: 'photos',
                        title: `Fotos - ${eventName || 'Evento'}`,
                        quantity: 1,
                        unit_price: Number(serverTotal.toFixed(2))
                    }
                ],
                external_reference: result.publicId || result.id.toString(),
                notification_url: `${SERVER_URL}/api/webhooks/mercadopago`,
                back_urls: {
                    success: `${CLIENT_URL}/orders/success`,
                    failure: `${CLIENT_URL}/orders/failure`,
                    pending: `${CLIENT_URL}/orders/pending`
                },
                auto_return: 'approved'
            }
        };

        const response = await preference.create(preferencePayload);

        res.status(201).json({
            orderId: result.publicId || result.id,
            init_point: response.init_point,
            sandbox_init_point: response.sandbox_init_point
        });

    } catch (error) {
        console.error("Order Error:", error);
        res.status(500).json({ error: error.message, details: error.cause });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        if (!req.user || !req.user.userId) return res.status(401).json({ error: 'Unauthorized' });

        const orders = await prisma.order.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);
    } catch (error) {
        console.error("Get My Orders Error:", error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const isNumericId = !Number.isNaN(Number(id)) && String(id).trim() !== '';
        const where = getOrderWhere(id, !!req.user);

        const order = await prisma.order.findUnique({
            where: where
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (isNumericId && !canAccessOrder(req, order)) {
            return res.status(403).json({ error: 'Order access denied' });
        }

        res.json(await buildOrderResponse(order, canAccessOrder(req, order)));

    } catch (error) {
        console.error("Get Order Error:", error);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to fetch order' });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Support both ID (int) and PublicID (UUID)
        let where = {};
        if (!isNaN(id)) {
            where = { id: parseInt(id) };
        } else {
            where = { publicId: id };
        }

        if (status === 'approved' || status === 'PAID') {
            const existingOrder = await prisma.order.findUnique({ where, select: { id: true } });
            if (!existingOrder) {
                return res.status(404).json({ error: 'Order not found' });
            }

            const finalizedOrder = await finalizeApprovedOrder(existingOrder.id);
            return res.json(finalizedOrder);
        }

        const order = await prisma.order.update({
            where: where,
            data: { status }
        });

        res.json(order);
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
};

exports.syncOrderWithMercadoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_id } = req.query;

        console.log(`[SYNC] Syncing order ${id} with payment_id: ${payment_id}`);

        // 1. Get order from DB. Numeric IDs require authenticated owner/admin access.
        const isNumericId = !Number.isNaN(Number(id)) && String(id).trim() !== '';
        const where = getOrderWhere(id, !!req.user);

        const order = await prisma.order.findUnique({
            where,
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (isNumericId && !canAccessOrder(req, order)) {
            return res.status(403).json({ error: 'Order access denied' });
        }

        if (!payment_id && !canAccessOrder(req, order)) {
            return res.status(400).json({ error: 'payment_id is required to sync public orders' });
        }

        // If already paid, just return it
        if (paidStatuses.includes(order.status)) {
            return res.json(await buildOrderResponse(order, canAccessOrder(req, order)));
        }

        // 2. If we have a payment_id, verify it with Mercado Pago
        if (payment_id) {
            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: payment_id });

            if (paymentDetails.status === 'approved' && paymentDetails.external_reference === (order.publicId || order.id.toString())) {
                const updatedOrder = await finalizeApprovedOrder(order.id, resolveClientUrl(req));
                console.log(`[SYNC] Order ${id} manually synced to 'approved'`);
                return res.json(await buildOrderResponse(updatedOrder, canAccessOrder(req, updatedOrder)));
            }
        }

        res.json(await buildOrderResponse(order, canAccessOrder(req, order)));
    } catch (error) {
        console.error("Sync Error:", error);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to sync with payment provider' });
    }
};

exports.finalizeApprovedOrder = finalizeApprovedOrder;


exports.downloadOrderImages = async (req, res) => {
    try {
        const { id } = req.params;
        const isNumericId = !Number.isNaN(Number(id)) && String(id).trim() !== '';
        const where = getOrderWhere(id, !!req.user);

        const order = await prisma.order.findUnique({ where });

        if (!order) return res.status(404).send('Order not found');

        if (!canAccessOrder(req, order)) {
            return res.status(403).send('Order access denied');
        }

        const isPaid = paidStatuses.includes(order.status);
        if (!isPaid) return res.status(403).send('Order not paid');

        let photoIds = [];
        try { photoIds = JSON.parse(order.items); } catch (e) { }

        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds } }
        });

        // Initialize Archiver
        const archive = archiver('zip', {
            zlib: { level: 9 } // Compression level
        });

        // Handle error events
        archive.on('error', function (err) {
            console.error("Archive Error:", err);
            if (!res.headersSent) res.status(500).send({ error: err.message });
        });

        // Pipe archive data to the response
        res.attachment(`pedido-${order.publicId || order.id}.zip`);
        archive.pipe(res);

        // Fetch each photo from Cloudinary and append to archive
        for (const photo of photos) {
            await new Promise((resolve, reject) => {
                const url = photo.originalUrl;
                // Ensure URL is valid
                if (!url || !url.startsWith('http')) {
                    console.warn(`Invalid URL for photo ${photo.id}: ${url}`);
                    return resolve(); // Skip
                }

                https.get(url, (response) => {
                    if (response.statusCode === 200) {
                        archive.append(response, { name: `foto-${photo.id}.jpg` });
                        resolve();
                    } else {
                        console.warn(`Failed to fetch photo ${photo.id} from Cloudinary. Status: ${response.statusCode}`);
                        response.resume(); // Consume data to free memory
                        resolve(); // Resolve to continue
                    }
                }).on('error', (err) => {
                    console.error(`Error downloading photo ${photo.id}:`, err);
                    resolve(); // Resolve to continue
                });
            });
        }

        await archive.finalize();

    } catch (error) {
        console.error("Download Zip Error:", error);
        if (!res.headersSent) {
            res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to generate zip' });
        }
    }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, cpf: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parse all items and collect first photo IDs for batch query
        const parsedOrders = orders.map(order => {
            let photoIds = [];
            try {
                if (order.items) {
                    photoIds = JSON.parse(order.items);
                }
            } catch (e) {
                // ignore malformed JSON
            }
            if (!Array.isArray(photoIds)) photoIds = [];
            return { ...order, photoIds };
        });

        // Batch fetch: get all first photos in a single query to find their events
        const firstPhotoIds = parsedOrders
            .map(o => parseInt(o.photoIds[0]))
            .filter(id => !isNaN(id));

        const uniqueFirstPhotoIds = [...new Set(firstPhotoIds)];

        const firstPhotos = uniqueFirstPhotoIds.length > 0
            ? await prisma.photo.findMany({
                where: { id: { in: uniqueFirstPhotoIds } },
                include: { event: { select: { id: true, name: true, status: true } } }
            })
            : [];

        // Build a map of photoId -> event for O(1) lookup
        const photoEventMap = new Map();
        firstPhotos.forEach(photo => {
            if (photo.event) {
                photoEventMap.set(photo.id, photo.event);
            }
        });

        // Enrich orders with photo count and event info
        const enriched = parsedOrders.map(order => {
            const firstPhotoId = parseInt(order.photoIds[0]);
            const event = !isNaN(firstPhotoId) ? (photoEventMap.get(firstPhotoId) || null) : null;

            return {
                ...order,
                photoIds: undefined, // Remove internal field
                photoCount: order.photoIds.length,
                event
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error("Get All Orders Error:", error);
        res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
    }
};

// Admin: Add photos to an existing order
exports.addPhotosToOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { photoIds: newPhotoIds } = req.body;

        if (!newPhotoIds || !Array.isArray(newPhotoIds) || newPhotoIds.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto informada.' });
        }

        // Support both ID (int) and PublicID (UUID)
        let where = {};
        if (!isNaN(id)) {
            where = { id: parseInt(id) };
        } else {
            where = { publicId: id };
        }

        const order = await prisma.order.findUnique({ where });
        if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });

        // Merge existing photo IDs with new ones (avoid duplicates)
        let existingIds = [];
        try { existingIds = JSON.parse(order.items); } catch (e) { }

        const mergedIds = [...new Set([...existingIds, ...newPhotoIds])];
        const photos = await prisma.photo.findMany({
            where: { id: { in: mergedIds } },
            select: { id: true, eventId: true }
        });

        if (photos.length !== mergedIds.length) {
            return res.status(400).json({ error: 'Uma ou mais fotos informadas não existem.' });
        }
        if (new Set(photos.map(photo => photo.eventId)).size > 1) {
            return res.status(400).json({ error: 'Só é possível adicionar fotos do mesmo evento ao pedido.' });
        }

        const updated = await prisma.order.update({
            where,
            data: { items: JSON.stringify(mergedIds) }
        });

        res.json({ ...updated, photoCount: mergedIds.length });
    } catch (error) {
        console.error("Add Photos To Order Error:", error);
        res.status(500).json({ error: 'Falha ao adicionar fotos ao pedido.' });
    }
};
