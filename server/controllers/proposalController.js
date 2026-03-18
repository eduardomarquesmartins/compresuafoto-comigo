const emailService = require('../services/email');
const pdfService = require('../services/pdfService');
const prisma = require('../lib/prisma');

exports.sendProposalEmail = async (req, res) => {
    try {
        const { email, clientName, selectedServices, total } = req.body;
        if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });
        const result = await emailService.sendProposalEmail(email, clientName, selectedServices, total);
        if (result.success) return res.json({ message: 'Proposta enviada com sucesso.' });
        return res.status(500).json({ error: 'Erro ao enviar e-mail.' });
    } catch (err) {
        console.error('[PROPOSAL EMAIL ERROR]:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.downloadProposalPdf = async (req, res) => {
    try {
        const { clientName, selectedServices, total } = req.body;
        const pdfBuffer = await pdfService.generatePDFBuffer(clientName, selectedServices, total);
        const fileName = `proposta_${clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[DOWNLOAD PDF ERROR]:', err);
        res.status(500).json({ error: 'Erro ao gerar o PDF.' });
    }
};

exports.createProposal = async (req, res) => {
    try {
        const { clientName, clientEmail, selectedServices, total } = req.body;
        const proposal = await prisma.proposal.create({
            data: {
                clientName,
                clientEmail,
                selectedServices: JSON.stringify(selectedServices),
                total,
                status: 'PENDING'
            }
        });
        res.status(201).json(proposal);
    } catch (err) {
        console.error('[CREATE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao salvar a proposta: ' + err.message });
    }
};

exports.getProposals = async (req, res) => {
    try {
        const proposals = await prisma.proposal.findMany({
            where: { status: { not: 'DELETED' } }
        });
        const formattedProposals = proposals.map(p => ({
            ...p,
            selectedServices: typeof p.selectedServices === 'string' ? JSON.parse(p.selectedServices) : p.selectedServices
        }));
        res.json(formattedProposals);
    } catch (err) {
        console.error('[GET PROPOSALS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar propostas.' });
    }
};

exports.deleteProposal = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.proposal.update({
            where: { id: parseInt(id) },
            data: { status: 'DELETED' }
        });
        res.json({ message: 'Proposta apagada com sucesso.' });
    } catch (err) {
        console.error('[DELETE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao apagar proposta.' });
    }
};

exports.approveProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await prisma.proposal.update({
            where: { id: parseInt(id) },
            data: { status: 'APPROVED' }
        });
        res.json(proposal);
    } catch (err) {
        console.error('[APPROVE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao aprovar proposta.' });
    }
};
