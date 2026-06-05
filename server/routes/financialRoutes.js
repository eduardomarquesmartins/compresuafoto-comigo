const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financialController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.get('/', financialController.getFinancials);
router.get('/stats', financialController.getFinancialStats);
router.post('/', financialController.createFinancial);
router.put('/:id', financialController.updateFinancial);
router.delete('/:id', financialController.deleteFinancial);

module.exports = router;
