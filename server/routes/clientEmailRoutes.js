const express = require('express');
const router = express.Router();
const clientEmailController = require('../controllers/clientEmailController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.post('/send', clientEmailController.sendClientEmail);

module.exports = router;
