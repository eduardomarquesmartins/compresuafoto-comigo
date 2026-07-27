const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('../middlewares/rateLimit');
const { authenticate } = require('../middlewares/auth');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8 });

router.post('/register', registerLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/security-question', passwordResetLimiter, authController.getSecurityQuestion);
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-with-token', passwordResetLimiter, authController.resetPasswordWithToken);
router.post('/google', authLimiter, authController.googleLogin);
router.get('/me', authenticate, authController.me);

module.exports = router;
