const prisma = require('../lib/prisma');

// Get all coupons
exports.getCoupons = async (req, res) => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
    try {
        const { code, discountType, discountValue, expiryDate, maxUses, isActive, freePhotos, oncePerCpf } = req.body;

        // Check if code already exists
        const existing = await prisma.coupon.findUnique({ where: { code } });
        if (existing) {
            return res.status(400).json({ error: "Este código de cupom já existe." });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code,
                discountType,
                discountValue,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                maxUses: maxUses ? parseInt(maxUses) : null,
                isActive: isActive !== undefined ? isActive : true,
                freePhotos: freePhotos ? parseInt(freePhotos) : 0,
                oncePerCpf: oncePerCpf === true || oncePerCpf === 'true'
            }
        });
        res.status(201).json(coupon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update a coupon
exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discountType, discountValue, expiryDate, maxUses, isActive, freePhotos, oncePerCpf } = req.body;

        const coupon = await prisma.coupon.update({
            where: { id: parseInt(id) },
            data: {
                code,
                discountType,
                discountValue,
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                maxUses: maxUses ? parseInt(maxUses) : null,
                isActive,
                freePhotos: freePhotos ? parseInt(freePhotos) : 0,
                oncePerCpf: oncePerCpf === true || oncePerCpf === 'true'
            }
        });
        res.json(coupon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Delete a coupon
exports.deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Cupom excluído com sucesso." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Validate a coupon (Public/Checkout)
exports.validateCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const { cpf } = req.query; // optional CPF for per-CPF validation

        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!coupon) {
            return res.status(404).json({ error: "Cupom não encontrado." });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ error: "Este cupom não está ativo." });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ error: "Este cupom expirou." });
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ error: "Este cupom atingiu o limite de uso." });
        }

        // Check per-CPF restriction
        if (coupon.oncePerCpf && cpf) {
            const cleanCpf = cpf.replace(/\D/g, '');
            const existingUsage = await prisma.couponUsage.findUnique({
                where: { couponId_cpf: { couponId: coupon.id, cpf: cleanCpf } }
            });
            if (existingUsage) {
                return res.status(400).json({ error: "Este cupom já foi utilizado com o seu CPF." });
            }
        }

        res.json({
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            freePhotos: coupon.freePhotos,
            oncePerCpf: coupon.oncePerCpf
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
