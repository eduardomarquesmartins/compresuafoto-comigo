const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const financialController = require('../controllers/financialController');
const { authenticate, isAdmin } = require('../middlewares/auth');

const notesDir = path.join(__dirname, '../uploads/financial-notes');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(notesDir)) {
            fs.mkdirSync(notesDir, { recursive: true });
        }
        cb(null, notesDir);
    },
    filename: (req, file, cb) => {
        const safeBaseName = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^\w.-]+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80) || 'nota';
        cb(null, `${Date.now()}-${safeBaseName}${path.extname(file.originalname).toLowerCase()}`);
    }
});

const noteUpload = multer({
    storage,
    limits: {
        fileSize: 12 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Formato inválido. Envie PDF, JPG, PNG ou WEBP.'));
    }
});

router.use(authenticate, isAdmin);

router.get('/', financialController.getFinancials);
router.get('/stats', financialController.getFinancialStats);
router.post('/note-upload', noteUpload.single('note'), financialController.createFinancialFromNote);
router.post('/', financialController.createFinancial);
router.put('/:id', financialController.updateFinancial);
router.delete('/:id', financialController.deleteFinancial);

module.exports = router;
