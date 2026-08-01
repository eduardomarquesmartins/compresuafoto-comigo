const express = require('express');
const router = express.Router();
const controller = require('../controllers/collaboratorController');
const { authenticate, isAdmin, isCollaborator } = require('../middlewares/auth');

router.get('/portal', authenticate, isCollaborator, controller.getMyPortal);
router.get('/portal/receipt', authenticate, isCollaborator, controller.downloadMyReceipt);
router.post('/portal/completions', authenticate, isCollaborator, controller.createCompletion);
router.delete('/portal/completions/:id', authenticate, isCollaborator, controller.deleteMyCompletion);
router.get('/admin', authenticate, isAdmin, controller.getAdminOverview);
router.post('/admin/services', authenticate, isAdmin, controller.createService);
router.patch('/admin/services/:id', authenticate, isAdmin, controller.updateService);
router.patch('/admin/completions/:id/pay', authenticate, isAdmin, controller.markPaid);
router.post('/admin/completions', authenticate, isAdmin, controller.createAdminCompletion);
router.delete('/admin/completions/:id', authenticate, isAdmin, controller.deleteAdminCompletion);
router.post('/admin/monthly-contract', authenticate, isAdmin, controller.generateMonthlyContract);
module.exports = router;
