const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debtController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.get('/', debtController.getDebts);
router.post('/', debtController.createDebt);
router.put('/:id', debtController.updateDebt);
router.delete('/:id', debtController.deleteDebt);

module.exports = router;
