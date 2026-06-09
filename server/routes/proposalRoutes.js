const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticate, isAdmin } = require('../middlewares/auth');

router.use(authenticate, isAdmin);

router.get('/', proposalController.getProposals);
router.get('/:id', proposalController.getProposalById);
router.post('/', proposalController.createProposal);
router.post('/send-email', proposalController.sendProposalEmail);
router.post('/download', proposalController.downloadProposalPdf);
router.put('/:id', proposalController.updateProposal);
router.delete('/:id', proposalController.deleteProposal);
router.patch('/:id/approve', proposalController.approveProposal);
router.patch('/:id/link-client', proposalController.linkProposalClient);

module.exports = router;
