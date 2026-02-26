const { MercadoPagoConfig, Preference } = require('mercadopago');
const prisma = require('../lib/prisma');
const archiver = require('archiver');
const https = require('https');
const emailService = require('../services/email');

// Initialize Mercado Pago
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-00000000-0000-0000-0000-000000000000' });

exports.createOrder = async (req, res) => {
    try {
        const { photoIds, total, eventName, couponCode } = req.body;
        const userId = req.user ? req.user.userId : null;

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
                status: serverTotal === 0 ? 'PAID' : 'PENDING', // Auto-approve if 0
                userId: userId,
                couponCode: couponCode || null
            }
        });

        // 4. Increment Coupon Usage Count and register CPF usage
        if (validCoupon) {
            try {
                await prisma.coupon.update({
                    where: { code: couponCode.toUpperCase() },
                    data: { usedCount: { increment: 1 } }
                });
                // Register CPF usage if oncePerCpf is enabled
                if (validCoupon.oncePerCpf && userCpf) {
                    await prisma.couponUsage.create({
                        data: { couponId: validCoupon.id, cpf: userCpf }
                    });
                }
            } catch (e) {
                console.error("Failed to increment coupon count:", e);
            }
        }

        // 5. Handle Zero-Total Checkout (Skip Mercado Pago)
        if (serverTotal === 0) {
            if (userId) {
                const user = await prisma.user.findUnique({ where: { id: userId } });
                if (user && user.email) {
                    let clientUrl = process.env.CLIENT_URL || 'https://compresuafoto-comigo.vercel.app';
                    const referer = req.headers.referer || req.headers.origin;
                    if (referer) {
                        try {
                            const urlObj = new URL(referer);
                            clientUrl = `${urlObj.protocol}//${urlObj.host}`;
                        } catch (e) { }
                    }

                    console.log(`[DEBUG] Disparando e-mail para pedido gratuito: ${user.email} usando ${clientUrl}`);
                    await emailService.sendOrderEmail(user.email, result.publicId || result.id, photos.length, clientUrl);
                }
            }

            return res.status(201).json({
                orderId: result.publicId || result.id,
                status: 'PAID',
                message: 'Pedido processado gratuitamente.'
            });
        }

        // 6. Create Preference in Mercado Pago
        const preference = new Preference(client);

        // Dynamically determine Client URL (handle localhost vs production)
        let CLIENT_URL = process.env.CLIENT_URL || 'https://compresuafoto-comigo.vercel.app';
        const referer = req.headers.referer;
        if (referer && referer.includes('localhost')) {
            const urlObj = new URL(referer);
            CLIENT_URL = `${urlObj.protocol}//${urlObj.host}`;
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
            where: {
                userId: req.user.userId,
                status: { in: ['PAID', 'approved'] }
            },
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

        // Support both ID (int) and PublicID (UUID)
        let where = {};
        if (!isNaN(id)) {
            where = { id: parseInt(id) };
        } else {
            where = { publicId: id };
        }

        const order = await prisma.order.findUnique({
            where: where
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        // Parse items
        let photoIds = [];
        try {
            photoIds = JSON.parse(order.items);
        } catch (e) {
            photoIds = [];
        }

        const photos = await prisma.photo.findMany({
            where: { id: { in: photoIds } }
        });

        const isPaid = order.status === 'PAID' || order.status === 'approved';

        const safePhotos = photos.map(photo => ({
            id: photo.id,
            originalUrl: isPaid ? photo.originalUrl : null,
            watermarkedUrl: photo.watermarkedUrl,
            price: photo.price
        }));

        res.json({
            id: order.id,
            publicId: order.publicId,
            status: order.status,
            total: order.total,
            createdAt: order.createdAt,
            photos: safePhotos
        });

    } catch (error) {
        console.error("Get Order Error:", error);
        res.status(500).json({ error: 'Failed to fetch order' });
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

exports.downloadOrderImages = async (req, res) => {
    try {
        const { id } = req.params;

        // Support both ID (int) and PublicID (UUID)
        let where = {};
        if (!isNaN(id)) {
            where = { id: parseInt(id) };
        } else {
            where = { publicId: id };
        }

        const order = await prisma.order.findUnique({ where });

        if (!order) return res.status(404).send('Order not found');

        const isPaid = order.status === 'PAID' || order.status === 'approved';
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
            res.status(500).json({ error: 'Failed to generate zip' });
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

        // Enrich with photo count and event info
        const enriched = await Promise.all(orders.map(async (order) => {
            console.log(`Processing order ${order.id}`);
            let photoIds = [];
            try {
                if (order.items) {
                    photoIds = JSON.parse(order.items);
                }
            } catch (e) {
                console.error(`Error parsing items for order ${order.id}:`, e.message);
            }

            if (!Array.isArray(photoIds)) {
                photoIds = [];
            }

            let event = null;
            if (photoIds.length > 0) {
                try {
                    const firstPhotoId = parseInt(photoIds[0]);
                    if (!isNaN(firstPhotoId)) {
                        const firstPhoto = await prisma.photo.findUnique({
                            where: { id: firstPhotoId },
                            include: { event: { select: { id: true, name: true, status: true } } }
                        });
                        if (firstPhoto && firstPhoto.event) {
                            event = firstPhoto.event;
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching event for order ${order.id}:`, err.message);
                }
            }

            return {
                ...order,
                photoCount: photoIds.length,
                event: event
            };
        }));

        console.log(`Finished processing ${enriched.length} orders`);
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
