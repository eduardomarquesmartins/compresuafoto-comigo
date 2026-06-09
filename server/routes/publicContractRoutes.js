const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

router.get('/:token', contractController.getPublicContractByToken);
router.get('/:token/pdf', contractController.getPublicContractPdfByToken);
router.post('/:token/sign', contractController.signPublicContract);

module.exports = router;
