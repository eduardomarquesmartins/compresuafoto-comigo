const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
// Assume verifyToken or similar middleware exists for admin
const { authenticate, isAdmin } = require('../middlewares/auth');

// Public route to validate coupon
router.get('/validate/:code', couponController.validateCoupon);

// Admin routes
router.get('/', authenticate, isAdmin, couponController.getCoupons);
router.post('/', authenticate, isAdmin, couponController.createCoupon);
router.put('/:id', authenticate, isAdmin, couponController.updateCoupon);
router.delete('/:id', authenticate, isAdmin, couponController.deleteCoupon);

module.exports = router;
