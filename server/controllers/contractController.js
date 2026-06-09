const crypto = require('crypto');
const contractService = require('../services/contractService');
const emailService = require('../services/email');
const prisma = require('../lib/prisma');

const sanitizeFileName = (value) => {
    return String(value || 'contrato')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
};

const getClientBaseUrl = () => {
    const raw = process.env.CLIENT_URL || 'http://localhost:3000';
    return raw.replace(/\/+$/, '');
};

const buildSignatureLink = (token) => `${getClientBaseUrl()}/assinar-contrato/${token}`;

const getContractPdfPayload = (contract) => ({
    clientName: contract.client?.name || contract.clientName || 'CONTRATANTE',
    clientDocument: contract.client?.document || '',
    clientAddress: contract.client?.address || '',
    clientCityState: contract.client?.cityState || '',
    signerName: contract.signedName || contract.client?.signerName || '',
    signerDocument: contract.signedDocument || contract.client?.signerDocument || '',
    scope: contract.scope,
    monthlyValue: contract.monthlyValue,
    durationMonths: contract.durationMonths,
    paymentDay: contract.paymentDay,
    contractDate: contract.contractDate,
    signedAt: contract.signedAt
});

exports.generateContract = async (req, res) => {
    try {
        const { clientName, clientDocument } = req.body;

        if (!clientName || !clientDocument) {
            return res.status(400).json({ error: 'Nome/Razão social e CPF ou CNPJ são obrigatórios.' });
        }

        const pdfBuffer = await contractService.generateContractBuffer(req.body);
        const fileName = `contrato_${sanitizeFileName(clientName)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[CONTRACT GENERATE ERROR]:', error);
        res.status(500).json({ error: 'Erro ao gerar contrato.' });
    }
};

exports.getContracts = async (req, res) => {
    try {
        const contracts = await prisma.contract.findMany({
            include: {
                client: {
                    select: {
                        name: true,
                        email: true,
                        document: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(contracts);
    } catch (err) {
        console.error('[GET CONTRACTS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar contratos.' });
    }
};

exports.createContract = async (req, res) => {
    try {
        const { clientId, scope, monthlyValue, durationMonths, paymentDay, startDate, contractDate } = req.body;
        if (!clientId || !scope || !monthlyValue) {
            return res.status(400).json({ error: 'Cliente, escopo e valor mensal são obrigatórios.' });
        }

        const parsedClientId = parseInt(clientId);
        const start = startDate ? new Date(startDate) : new Date();
        const duration = parseInt(durationMonths || 6);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);

        const contract = await prisma.contract.create({
            data: {
                clientId: parsedClientId,
                scope,
                monthlyValue: parseFloat(monthlyValue),
                durationMonths: duration,
                paymentDay: parseInt(paymentDay || 25),
                startDate: start,
                endDate: end,
                status: 'ACTIVE',
                contractDate: contractDate || new Date().toLocaleDateString("pt-BR")
            },
            include: {
                client: true
            }
        });
        res.status(201).json(contract);
    } catch (err) {
        console.error('[CREATE CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar contrato: ' + err.message });
    }
};

exports.sendSignatureLink = async (req, res) => {
    try {
        const { clientId, scope, monthlyValue, durationMonths, paymentDay, startDate, contractDate, delivery = 'email' } = req.body;

        if (!clientId || !scope || !monthlyValue) {
            return res.status(400).json({ error: 'Cliente, escopo e valor mensal são obrigatórios.' });
        }

        const parsedClientId = parseInt(clientId);
        const client = await prisma.client.findUnique({
            where: { id: parsedClientId }
        });

        if (!client) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        if (!client.email) {
            return res.status(400).json({ error: 'O cliente precisa ter e-mail cadastrado para receber o link de assinatura.' });
        }

        const start = startDate ? new Date(startDate) : new Date();
        const duration = parseInt(durationMonths || 6);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);
        const signatureToken = crypto.randomBytes(24).toString('hex');

        const contract = await prisma.contract.create({
            data: {
                clientId: parsedClientId,
                scope,
                monthlyValue: parseFloat(monthlyValue),
                durationMonths: duration,
                paymentDay: parseInt(paymentDay || 25),
                startDate: start,
                endDate: end,
                status: 'PENDING_SIGNATURE',
                contractDate: contractDate || new Date().toLocaleDateString("pt-BR"),
                signatureToken
            },
            include: {
                client: true
            }
        });

        const pdfBuffer = await contractService.generateContractBuffer({
            ...getContractPdfPayload(contract),
            clientName: contract.client?.name || contract.clientName
        });
        const signLink = buildSignatureLink(signatureToken);
        if (delivery === 'email') {
            const emailResult = await emailService.sendContractSignatureLinkEmail(
                client.email,
                client.name,
                pdfBuffer,
                signLink
            );

            if (!emailResult.success) {
                return res.status(500).json({
                    error: 'Contrato criado, mas não consegui enviar o e-mail de assinatura.',
                    contract,
                    signLink
                });
            }
        }

        res.status(201).json({
            contract,
            signLink,
            message: delivery === 'email'
                ? 'Link de assinatura enviado com sucesso.'
                : 'Link de assinatura criado com sucesso.'
        });
    } catch (err) {
        console.error('[SEND SIGNATURE LINK ERROR]:', err);
        res.status(500).json({ error: 'Erro ao enviar link de assinatura: ' + err.message });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contract.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Contrato excluído com sucesso.' });
    } catch (err) {
        console.error('[DELETE CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir contrato.' });
    }
};

exports.getPublicContractByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const contract = await prisma.contract.findFirst({
            where: { signatureToken: token },
            include: {
                client: true
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        }

        res.json({
            ...contract,
            signed: Boolean(contract.signedAt)
        });
    } catch (err) {
        console.error('[PUBLIC CONTRACT LOOKUP ERROR]:', err);
        res.status(500).json({ error: 'Erro ao carregar contrato.' });
    }
};

exports.getPublicContractPdfByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const contract = await prisma.contract.findFirst({
            where: { signatureToken: token },
            include: {
                client: true
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        }

        const pdfBuffer = await contractService.generateContractBuffer(getContractPdfPayload(contract));
        const fileName = `contrato_${sanitizeFileName(contract.client?.name || contract.clientName || 'cliente')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[PUBLIC CONTRACT PDF ERROR]:', err);
        res.status(500).json({ error: 'Erro ao gerar o PDF do contrato.' });
    }
};

exports.signPublicContract = async (req, res) => {
    try {
        const { token } = req.params;
        const { signerName, signerDocument } = req.body;

        if (!signerName || !signerDocument) {
            return res.status(400).json({ error: 'Nome e documento do assinante são obrigatórios.' });
        }

        const contract = await prisma.contract.findFirst({
            where: { signatureToken: token },
            include: {
                client: true
            }
        });

        if (!contract) {
            return res.status(404).json({ error: 'Contrato não encontrado.' });
        }

        if (contract.signedAt) {
            return res.status(409).json({ error: 'Este contrato já foi assinado.' });
        }

        const signedAt = new Date();
        const updatedContract = await prisma.contract.update({
            where: { id: contract.id },
            data: {
                status: 'ACTIVE',
                signedAt,
                signedName: signerName,
                signedDocument: signerDocument
            },
            include: {
                client: true
            }
        });

        if (updatedContract.clientId) {
            await prisma.client.update({
                where: { id: updatedContract.clientId },
                data: {
                    signerName,
                    signerDocument
                }
            });
        }

        const signedPdfBuffer = await contractService.generateContractBuffer({
            ...getContractPdfPayload({
                ...updatedContract,
                signedAt
            }),
            clientName: updatedContract.client?.name || updatedContract.clientName || 'CONTRATANTE',
            signerName,
            signerDocument,
            signedAt
        });

        if (updatedContract.client?.email) {
            await emailService.sendSignedContractEmail(
                updatedContract.client.email,
                updatedContract.client?.name || updatedContract.clientName || 'CONTRATANTE',
                signedPdfBuffer
            );
        }

        res.json({
            message: 'Contrato assinado com sucesso.',
            contract: {
                ...updatedContract,
                signedAt
            }
        });
    } catch (err) {
        console.error('[SIGN PUBLIC CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao assinar contrato.' });
    }
};

