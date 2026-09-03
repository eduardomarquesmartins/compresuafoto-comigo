const emailService = require('../services/email');
const pdfService = require('../services/pdfService');
const prisma = require('../lib/prisma');
const crypto = require('crypto');

const createPublicToken = () => crypto.randomBytes(32).toString('base64url');
const isPublicToken = (token) => /^[A-Za-z0-9_-]{40,}$/.test(String(token || ''));
const getClientBaseUrl = () => String(process.env.ECONTI_PUBLIC_URL || process.env.CLIENT_URL || 'https://econticomigo.com.br').replace(/\/+$/, '');
const buildSignatureLink = (token) => `${getClientBaseUrl()}/assinar-contrato/${token}`;
const parseServicesSnapshot = (value) => {
    try {
        const services = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(services) ? services.map(s => s.name || s.serviceName || s.description || String(s)).join('; ') || 'Serviços conforme proposta' : String(value || 'Serviços conforme proposta');
    } catch { return String(value || 'Serviços conforme proposta'); }
};
const transitionProposal = (proposal, action, { allowUnlinked = false } = {}) => {
    if (!proposal || proposal.status === 'DELETED') throw Object.assign(new Error('Proposta não encontrada.'), { status: 404 });
    if (action === 'approve' || action === 'accept') {
        if (proposal.status === 'DECLINED') throw Object.assign(new Error('Uma proposta recusada não pode ser aprovada.'), { status: 409 });
        if (!proposal.clientId && !allowUnlinked) throw Object.assign(new Error('A proposta precisa estar vinculada a um cliente antes da aprovação.'), { status: 400 });
        return {
            status: 'APPROVED',
            ...(action === 'accept' ? { acceptedAt: proposal.acceptedAt || new Date() } : {}),
            approvedAt: proposal.approvedAt || new Date()
        };
    }
    if (action === 'decline') {
        if (proposal.status === 'APPROVED') throw Object.assign(new Error('Uma proposta aprovada não pode ser recusada.'), { status: 409 });
        return { status: 'DECLINED', declinedAt: proposal.declinedAt || new Date() };
    }
    throw new Error('Transição de proposta inválida.');
};
const qualificationError = (message) => Object.assign(new Error(message), { status: 400 });
const requiredText = (value) => typeof value === 'string' && value.trim();
const validateQualification = (payload = {}) => {
    // These are the Client model fields. Do not infer a client from an e-mail:
    // public acceptance is only allowed to create the client for this proposal.
    const name = requiredText(payload.name);
    const email = requiredText(payload.email);
    const document = requiredText(payload.document);
    const address = requiredText(payload.address);
    const cityState = requiredText(payload.cityState);
    if (!name || name.split(/\s+/).length < 2) throw qualificationError('Informe o nome completo do contratante.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw qualificationError('Informe um e-mail válido do contratante.');
    const documentDigits = document && document.replace(/\D/g, '');
    if (!documentDigits || ![11, 14].includes(documentDigits.length)) throw qualificationError('Informe um CPF ou CNPJ válido.');
    if (!address) throw qualificationError('Informe o endereço do contratante.');
    if (!cityState) throw qualificationError('Informe a cidade/UF do contratante.');
    return {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        document: document.trim(),
        address: address.trim(),
        cityState: cityState.trim(),
        ...(requiredText(payload.phone) ? { phone: payload.phone.trim() } : {}),
        ...(requiredText(payload.signerName) ? { signerName: payload.signerName.trim() } : {}),
        ...(requiredText(payload.signerDocument) ? { signerDocument: payload.signerDocument.trim() } : {})
    };
};
const createContractFromApprovedProposal = async (tx, proposal) => {
    if (!proposal) throw Object.assign(new Error('Proposta não encontrada.'), { status: 404 });
    if (proposal.status !== 'APPROVED' || !proposal.clientId) throw Object.assign(new Error('A proposta deve estar aprovada e vinculada a um cliente.'), { status: 409 });
    const existing = await tx.contract.findUnique({ where: { proposalId: proposal.id }, include: { client: true } });
    if (existing) return existing;
    const startDate = new Date(), durationMonths = 6, endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + durationMonths);
    return tx.contract.create({ data: { proposalId: proposal.id, clientId: proposal.clientId, scope: parseServicesSnapshot(proposal.selectedServices), monthlyValue: Number(proposal.total), durationMonths, paymentDay: 25, startDate, endDate, status: 'PENDING_SIGNATURE', contractDate: new Date().toLocaleDateString('pt-BR'), signatureToken: crypto.randomBytes(24).toString('hex') }, include: { client: true } });
};
const approveAndGetContract = async (proposalId, action, qualification = null) => {
    try {
        return await prisma.$transaction(async (tx) => {
            const current = await tx.proposal.findUnique({ where: { id: proposalId } });
            if (!current || current.status === 'DELETED') throw Object.assign(new Error('Proposta não encontrada.'), { status: 404 });
            // A public acceptance is the one place a proposal may acquire its
            // client.  The create, link, approval and contract are atomic so a
            // failed/racing acceptance cannot leave an orphan Client behind.
            if (action === 'accept' && !current.clientId) {
                if (!qualification) throw qualificationError('Informe os dados do contratante para aceitar esta proposta.');
                const data = transitionProposal(current, action, { allowUnlinked: true });
                const client = await tx.client.create({ data: { ...qualification, status: 'ACTIVE' } });
                const changed = await tx.proposal.updateMany({
                    where: { id: proposalId, status: current.status, clientId: null },
                    data: { ...data, clientId: client.id, clientName: client.name, clientEmail: client.email }
                });
                if (changed.count === 1) {
                    const proposal = await tx.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
                    return { proposal, contract: await createContractFromApprovedProposal(tx, proposal) };
                }
                // Causes the transaction (including Client creation) to roll back.
                throw Object.assign(new Error('A proposta foi aceita por outra solicitação.'), { status: 409, code: 'ACCEPTANCE_RACE' });
            }

            const data = transitionProposal(current, action);
            if (current.status === 'PENDING') {
                // The status predicate is the compare-and-set: a competing terminal
                // transition cannot overwrite this one after it commits.
                const changed = await tx.proposal.updateMany({ where: { id: proposalId, status: 'PENDING' }, data });
                if (changed.count === 1) {
                    const proposal = await tx.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
                    return { proposal, contract: action === 'decline' ? null : await createContractFromApprovedProposal(tx, proposal) };
                }
            }
            const terminal = await tx.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
            if (terminal.status === 'DECLINED' && action === 'decline') return { proposal: terminal, contract: null };
            if (terminal.status === 'APPROVED' && (action === 'approve' || action === 'accept')) {
                // A client acceptance of a previously admin-approved proposal records
                // acceptance but never changes the commercial snapshot.
                const proposal = action === 'accept' && !terminal.acceptedAt
                    ? await tx.proposal.update({ where: { id: proposalId }, data: { acceptedAt: new Date() }, include: { client: true } })
                    : terminal;
                return { proposal, contract: await createContractFromApprovedProposal(tx, proposal) };
            }
            throw Object.assign(new Error('Ação conflitante para o estado atual da proposta.'), { status: 409 });
        });
    } catch (error) {
        if (error.code === 'P2002' || error.code === 'ACCEPTANCE_RACE') {
            const [proposal, contract] = await Promise.all([prisma.proposal.findUnique({ where: { id: proposalId }, include: { client: true } }), prisma.contract.findUnique({ where: { proposalId: proposalId }, include: { client: true } })]);
            if (proposal?.status === 'APPROVED' && contract) return { proposal, contract };
            if (error.code === 'P2002') throw Object.assign(new Error('Já existe um cliente cadastrado com este e-mail. A proposta não foi vinculada a ele.'), { status: 409 });
        }
        throw error;
    }
};
const publicProposal = (proposal, contract = null) => ({ clientName: proposal.clientName, clientEmail: proposal.clientEmail, hasClient: Boolean(proposal.clientId), selectedServices: (() => { try { return JSON.parse(proposal.selectedServices); } catch { return proposal.selectedServices; } })(), total: proposal.total, proposalType: proposal.proposalType, status: proposal.status, acceptedAt: proposal.acceptedAt, declinedAt: proposal.declinedAt, signatureLink: contract?.signatureToken ? buildSignatureLink(contract.signatureToken) : null });

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
                status: 'PENDING',
                publicToken: createPublicToken()
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

        const existing = await prisma.proposal.findUnique({ where: { id: parseInt(id) }, include: { contract: true } });
        if (!existing || existing.status === 'DELETED') return res.status(404).json({ error: 'Proposta não encontrada.' });
        if (existing.status === 'APPROVED' || existing.status === 'DECLINED' || existing.contract) return res.status(409).json({ error: 'Propostas aprovadas, recusadas ou com contrato não podem ser alteradas.' });
        const data = {
                clientId: matchedClient?.id || null,
                clientName: matchedClient?.name || clientName,
                clientEmail: matchedClient?.email || clientEmail,
                selectedServices: JSON.stringify(selectedServices),
                total,
                ...(proposalType ? { proposalType } : {})
        };
        const changed = await prisma.proposal.updateMany({ where: { id: parseInt(id), status: 'PENDING', contract: { is: null } }, data });
        if (changed.count !== 1) return res.status(409).json({ error: 'A proposta foi finalizada ou contratada durante a atualização.' });
        const proposal = await prisma.proposal.findUnique({ where: { id: parseInt(id) }, include: { client: true } });

        res.json({
            ...proposal,
            selectedServices: typeof proposal.selectedServices === 'string' ? JSON.parse(proposal.selectedServices) : proposal.selectedServices
        });
    } catch (err) {
        console.error('[UPDATE PROPOSAL ERROR]:', err);
        res.status(err.status || 500).json({ error: err.message || 'Erro ao atualizar a proposta.' });
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
        const result = await approveAndGetContract(parseInt(req.params.id, 10), 'approve');
        res.json({ ...result.proposal, contract: result.contract, signatureLink: buildSignatureLink(result.contract.signatureToken) });
    } catch (err) {
        console.error('[APPROVE PROPOSAL ERROR]:', err);
        res.status(err.status || 500).json({ error: err.message || 'Erro ao aprovar proposta.' });
    }
};

exports.getOrCreateProposalContract = async (req, res) => {
    try {
        const proposalId = parseInt(req.params.id, 10);
        let result;
        try {
            result = await prisma.$transaction(async (tx) => {
                const proposal = await tx.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
                const contract = await createContractFromApprovedProposal(tx, proposal);
                return { proposal, contract };
            });
        } catch (error) {
            if (error.code !== 'P2002') throw error;
            const [proposal, contract] = await Promise.all([prisma.proposal.findUnique({ where: { id: proposalId } }), prisma.contract.findUnique({ where: { proposalId } })]);
            if (!proposal || !contract) throw error;
            result = { proposal, contract };
        }
        res.json({ contract: result.contract, signatureLink: buildSignatureLink(result.contract.signatureToken) });
    } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Erro ao obter contrato da proposta.' }); }
};

exports.getPublicProposalByToken = async (req, res) => {
    try {
        if (!isPublicToken(req.params.token)) return res.status(404).json({ error: 'Proposta não encontrada.' });
        const proposal = await prisma.proposal.findUnique({ where: { publicToken: req.params.token }, include: { contract: true } });
        if (!proposal || proposal.status === 'DELETED') return res.status(404).json({ error: 'Proposta não encontrada.' });
        res.json(publicProposal(proposal, proposal.contract));
    } catch { res.status(500).json({ error: 'Erro ao carregar proposta.' }); }
};
exports.acceptPublicProposal = async (req, res) => {
    try {
        if (!isPublicToken(req.params.token)) return res.status(404).json({ error: 'Proposta não encontrada.' });
        const proposal = await prisma.proposal.findUnique({ where: { publicToken: req.params.token } });
        if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada.' });
        // Linked proposals intentionally retain their existing Client data. A
        // qualification payload is mandatory only when acceptance must create it.
        const qualification = proposal.clientId ? null : validateQualification(req.body);
        const result = await approveAndGetContract(proposal.id, 'accept', qualification);
        res.json(publicProposal(result.proposal, result.contract));
    } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Erro ao aceitar proposta.' }); }
};
exports.declinePublicProposal = async (req, res) => {
    try {
        if (!isPublicToken(req.params.token)) return res.status(404).json({ error: 'Proposta não encontrada.' });
        const proposal = await prisma.proposal.findUnique({ where: { publicToken: req.params.token } });
        if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada.' });
        const result = await approveAndGetContract(proposal.id, 'decline');
        res.json(publicProposal(result.proposal));
    } catch (err) { res.status(err.status || 500).json({ error: err.message || 'Erro ao recusar proposta.' }); }
};

exports.linkProposalClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId } = req.body;
        const existing = await prisma.proposal.findUnique({ where: { id: parseInt(id) }, include: { contract: true } });
        if (!existing || existing.status === 'DELETED') return res.status(404).json({ error: 'Proposta não encontrada.' });
        if (existing.status === 'APPROVED' || existing.status === 'DECLINED' || existing.contract) return res.status(409).json({ error: 'Não é possível alterar o cliente de uma proposta finalizada ou contratada.' });
        const parsedClientId = clientId ? parseInt(clientId) : null;
        const client = parsedClientId
            ? await prisma.client.findUnique({ where: { id: parsedClientId } })
            : null;

        const changed = await prisma.proposal.updateMany({
            where: { id: parseInt(id), status: 'PENDING', contract: { is: null } },
            data: {
                clientId: client?.id || null,
                ...(client ? { clientName: client.name, clientEmail: client.email } : {})
            }
        });
        if (changed.count !== 1) return res.status(409).json({ error: 'A proposta foi finalizada ou contratada durante o vínculo.' });
        const proposal = await prisma.proposal.findUnique({ where: { id: parseInt(id) }, include: { client: true } });

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

exports._internals = { createPublicToken, isPublicToken, parseServicesSnapshot, transitionProposal, validateQualification, publicProposal, approveAndGetContract };
