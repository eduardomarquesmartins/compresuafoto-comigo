const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { authenticate, isAdmin } = require('../middlewares/auth');
const { publicTokenGuard } = require('../middlewares/publicTokenGuard');

router.get('/public/:token', publicTokenGuard, proposalController.getPublicProposalByToken);
router.post('/public/:token/accept', publicTokenGuard, proposalController.acceptPublicProposal);
router.post('/public/:token/decline', publicTokenGuard, proposalController.declinePublicProposal);

router.use(authenticate, isAdmin);

router.get('/', proposalController.getProposals);
router.get('/:id', proposalController.getProposalById);
router.post('/', proposalController.createProposal);
router.post('/send-email', proposalController.sendProposalEmail);
router.post('/download', proposalController.downloadProposalPdf);
router.put('/:id', proposalController.updateProposal);
router.delete('/:id', proposalController.deleteProposal);
router.patch('/:id/approve', proposalController.approveProposal);
router.post('/:id/contract', proposalController.getOrCreateProposalContract);
router.patch('/:id/link-client', proposalController.linkProposalClient);

module.exports = router;
