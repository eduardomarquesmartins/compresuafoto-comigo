const express = require('express');
const router = express.Router();
const demandController = require('../controllers/demandController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.get('/', demandController.getDemands);
router.post('/', demandController.createDemand);
router.put('/:id', demandController.updateDemand);
router.delete('/:id', demandController.deleteDemand);

module.exports = router;
