const emailService = require('../services/email');
const pdfService = require('../services/pdfService');
const prisma = require('../lib/prisma');

exports.sendProposalEmail = async (req, res) => {
    try {
        const { email, clientName, selectedServices, total, proposalType = 'empresarial' } = req.body;
        if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });
        const result = await emailService.sendProposalEmail(email, clientName, selectedServices, total, proposalType);
        if (result.success) return res.json({ message: 'Proposta enviada com sucesso.' });
        return res.status(500).json({ error: 'Erro ao enviar e-mail.' });
    } catch (err) {
        console.error('[PROPOSAL EMAIL ERROR]:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.downloadProposalPdf = async (req, res) => {
    try {
        const { clientName, selectedServices, total, proposalType = 'empresarial' } = req.body;
        const pdfBuffer = await pdfService.generatePDFBuffer(clientName, selectedServices, total, proposalType);
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
        const { clientId, clientName, clientEmail, selectedServices, total, proposalType = 'empresarial' } = req.body;
        const parsedClientId = clientId ? parseInt(clientId) : null;
        const matchedClient = parsedClientId
            ? await prisma.client.findUnique({ where: { id: parsedClientId } })
            : clientEmail
                ? await prisma.client.findUnique({ where: { email: clientEmail } })
                : null;

        const proposal = await prisma.proposal.create({
            data: {
                clientId: matchedClient?.id || null,
                clientName: matchedClient?.name || clientName,
                clientEmail: matchedClient?.email || clientEmail,
                selectedServices: JSON.stringify(selectedServices),
                total,
                proposalType,
                status: 'PENDING'
            },
            include: {
                client: true
            }
        });
        res.status(201).json(proposal);
    } catch (err) {
        console.error('[CREATE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao salvar a proposta: ' + err.message });
    }
};

exports.updateProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, clientName, clientEmail, selectedServices, total, proposalType } = req.body;
        const parsedClientId = clientId ? parseInt(clientId) : null;
        const matchedClient = parsedClientId
            ? await prisma.client.findUnique({ where: { id: parsedClientId } })
            : clientEmail
                ? await prisma.client.findUnique({ where: { email: clientEmail } })
                : null;

        const proposal = await prisma.proposal.update({
            where: { id: parseInt(id) },
            data: {
                clientId: matchedClient?.id || null,
                clientName: matchedClient?.name || clientName,
                clientEmail: matchedClient?.email || clientEmail,
                selectedServices: JSON.stringify(selectedServices),
                total,
                ...(proposalType ? { proposalType } : {})
            },
            include: {
                client: true
            }
        });

        res.json({
            ...proposal,
            selectedServices: typeof proposal.selectedServices === 'string' ? JSON.parse(proposal.selectedServices) : proposal.selectedServices
        });
    } catch (err) {
        console.error('[UPDATE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao atualizar a proposta: ' + err.message });
    }
};

exports.getProposals = async (req, res) => {
    try {
        const proposals = await prisma.proposal.findMany({
            where: { status: { not: 'DELETED' } },
            include: {
                client: true
            },
            orderBy: {
                createdAt: 'desc'
            }
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
            data: { status: 'APPROVED' },
            include: {
                client: true
            }
        });
        res.json(proposal);
    } catch (err) {
        console.error('[APPROVE PROPOSAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao aprovar proposta.' });
    }
};

exports.linkProposalClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId } = req.body;
        const parsedClientId = clientId ? parseInt(clientId) : null;
        const client = parsedClientId
            ? await prisma.client.findUnique({ where: { id: parsedClientId } })
            : null;

        const proposal = await prisma.proposal.update({
            where: { id: parseInt(id) },
            data: {
                clientId: client?.id || null,
                ...(client ? { clientName: client.name, clientEmail: client.email } : {})
            },
            include: {
                client: true
            }
        });

        res.json({
            ...proposal,
            selectedServices: typeof proposal.selectedServices === 'string' ? JSON.parse(proposal.selectedServices) : proposal.selectedServices
        });
    } catch (err) {
        console.error('[LINK PROPOSAL CLIENT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao vincular cliente à proposta.' });
    }
};

exports.getProposalById = async (req, res) => {
    try {
        const { id } = req.params;
        const proposal = await prisma.proposal.findUnique({
            where: { id: parseInt(id) },
            include: {
                client: true
            }
        });
        if (!proposal || proposal.status === 'DELETED') {
            return res.status(404).json({ error: 'Proposta não encontrada.' });
        }
        const formattedProposal = {
            ...proposal,
            selectedServices: typeof proposal.selectedServices === 'string' ? JSON.parse(proposal.selectedServices) : proposal.selectedServices
        };
        res.json(formattedProposal);
    } catch (err) {
        console.error('[GET PROPOSAL BY ID ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar proposta.' });
    }
};
