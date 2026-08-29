const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, optionalAuth, isAdmin } = require('../middlewares/auth');

// Customer routes
router.post('/', optionalAuth, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);

// Admin routes
router.get('/admin/all', authenticate, isAdmin, orderController.getAllOrders);
router.post('/admin/merge', authenticate, isAdmin, orderController.mergePendingOrders);
router.patch('/:id/status', authenticate, isAdmin, orderController.updateOrderStatus);
router.post('/:id/photos', authenticate, isAdmin, orderController.addPhotosToOrder);

// Public/shared routes
router.get('/:id', optionalAuth, orderController.getOrderById);
router.post('/:id/payment-link', authenticate, orderController.resumePendingOrderPayment);
router.post('/:id/sync', optionalAuth, orderController.syncOrderWithMercadoPago);
router.get('/:id/zip', optionalAuth, orderController.downloadOrderImages);

module.exports = router;
