const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, optionalAuth, isAdmin } = require('../middlewares/auth');

// Customer routes
router.get('/test', (req, res) => res.send('Router reachable'));
router.post('/', optionalAuth, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);

// Admin routes
router.get('/admin/all', authenticate, isAdmin, orderController.getAllOrders);
router.patch('/:id/status', authenticate, isAdmin, orderController.updateOrderStatus);
router.post('/:id/photos', authenticate, isAdmin, orderController.addPhotosToOrder);

// Public/shared routes
router.get('/:id', orderController.getOrderById);
router.get('/:id/zip', orderController.downloadOrderImages);

module.exports = router;
