const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');

router.get('/', proposalController.getProposals);
router.post('/', proposalController.createProposal);
router.post('/send-email', proposalController.sendProposalEmail);
router.post('/download', proposalController.downloadProposalPdf);
router.delete('/:id', proposalController.deleteProposal);
router.patch('/:id/approve', proposalController.approveProposal);

module.exports = router;
