const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.get('/stats', authenticate, isAdmin, dashboardController.getStats);
router.get('/chart-data', authenticate, isAdmin, dashboardController.getChartData);

module.exports = router;
