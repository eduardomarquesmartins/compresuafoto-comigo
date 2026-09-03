const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { publicTokenGuard } = require('../middlewares/publicTokenGuard');

router.get('/:token', publicTokenGuard, contractController.getPublicContractByToken);
router.get('/:token/pdf', publicTokenGuard, contractController.getPublicContractPdfByToken);
router.post('/:token/sign', publicTokenGuard, contractController.signPublicContract);

module.exports = router;
