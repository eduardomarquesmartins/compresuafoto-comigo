const express = require('express');
const router = express.Router();
const multer = require('multer');
const excelController = require('../controllers/excelController');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Configurar o multer para upload de arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limite de 10MB
});

router.use(authenticate, isAdmin);

// Rota de importação
router.post('/import', upload.single('file'), excelController.importExcel);

module.exports = router;
