const express = require('express');
const multer = require('multer');
const router = express.Router();
const clientEmailController = require('../controllers/clientEmailController');
const { authenticate, isAdmin } = require('../middlewares/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 8,
        fileSize: 20 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        cb(new Error('Tipo de arquivo não permitido para anexo.'));
    }
});

router.use(authenticate, isAdmin);

router.post('/send', (req, res, next) => {
    upload.array('attachments', 8)(req, res, (error) => {
        if (error) {
            return res.status(400).json({ error: error.message });
        }

        next();
    });
}, clientEmailController.sendClientEmail);

module.exports = router;
