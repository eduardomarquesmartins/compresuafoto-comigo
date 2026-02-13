const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.get('/', authenticate, isAdmin, userController.getUsers);
router.post('/', authenticate, isAdmin, userController.createUser);
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);
router.patch('/profile', authenticate, userController.updateProfile);

module.exports = router;
