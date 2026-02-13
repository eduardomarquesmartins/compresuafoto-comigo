const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/security-question', authController.getSecurityQuestion);
router.post('/reset-password', authController.resetPassword);
router.post('/google', authController.googleLogin);

module.exports = router;
