const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.get('/', contractController.getContracts);
router.post('/', contractController.createContract);
router.post('/send-sign-link', contractController.sendSignatureLink);
router.delete('/:id', contractController.deleteContract);
router.post('/generate', contractController.generateContract);
router.get('/:id/pdf', contractController.getContractPdfById);

module.exports = router;
