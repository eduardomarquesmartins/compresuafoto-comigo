const express = require('express');
const multer = require('multer');
const prisma = require('../lib/prisma');
const { authenticate, isAdmin } = require('../middlewares/auth');
const cloudinary = require('../services/cloudinary');

const router = express.Router();
const allowedKeys = new Set([
    'users', 'workspaces', 'boards', 'lists', 'labels',
    'custom_fields', 'members', 'notifications', 'activities', 'automation_rules'
]);

router.use(authenticate, isAdmin);

const attachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { files: 1, fileSize: 20 * 1024 * 1024 }
});

router.post('/attachments', (req, res, next) => {
    attachmentUpload.single('file')(req, res, (error) => {
        if (error) return res.status(400).json({ error: error.message });
        next();
    });
}, async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Selecione um arquivo para anexar.' });
        const result = await cloudinary.uploadStream(req.file.buffer, 'konti/attachments');
        res.status(201).json({
            url: result.secure_url,
            publicId: result.public_id,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype || 'application/octet-stream'
        });
    } catch (error) {
        next(error);
    }
});

router.delete('/attachments', async (req, res, next) => {
    const { publicId, fileType } = req.body || {};
    if (typeof publicId !== 'string' || !publicId.startsWith('konti/attachments/')) {
        return res.status(400).json({ error: 'Anexo inválido.' });
    }
    try {
        const resourceType = typeof fileType === 'string' && fileType.startsWith('image/')
            ? 'image'
            : typeof fileType === 'string' && fileType.startsWith('video/') ? 'video' : 'raw';
        await cloudinary.v2.uploader.destroy(publicId, { resource_type: resourceType });
        res.status(204).end();
    } catch (error) {
        next(error);
    }
});

router.get('/state', async (req, res, next) => {
    try {
        const rows = await prisma.kontiState.findMany();
        res.json(Object.fromEntries(rows.map(({ key, data }) => [key, data])));
    } catch (error) {
        next(error);
    }
});

router.put('/state/:key', async (req, res, next) => {
    const { key } = req.params;
    if (!allowedKeys.has(key)) return res.status(400).json({ error: 'Estado KONTI inválido' });
    if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'data')) {
        return res.status(400).json({ error: 'O campo data é obrigatório' });
    }

    try {
        const record = await prisma.kontiState.upsert({
            where: { key },
            create: { key, data: req.body.data },
            update: { data: req.body.data }
        });
        res.json({ key: record.key, updatedAt: record.updatedAt });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
