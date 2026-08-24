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
    const raw = process.env.ECONTI_PUBLIC_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    return raw.replace(/\/+$/, '');
};

const buildSignatureLink = (token) => `${getClientBaseUrl()}/assinar-contrato/${token}`;

const parsePositiveMoney = (value, fieldName) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        const error = new Error(`${fieldName} deve ser maior que zero.`);
        error.status = 400;
        throw error;
    }
    return parsed;
};

const parsePositiveInt = (value, fieldName, fallback) => {
    const parsed = parseInt(value || fallback, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        const error = new Error(`${fieldName} deve ser maior que zero.`);
        error.status = 400;
        throw error;
    }
    return parsed;
};

const parsePaymentDay = (value) => {
    const parsed = parsePositiveInt(value, 'Dia de pagamento', 25);
    if (parsed > 31) {
        const error = new Error('Dia de pagamento deve estar entre 1 e 31.');
        error.status = 400;
        throw error;
    }
    return parsed;
};

const buildPlaceholderClientEmail = (clientName, clientDocument) => {
    const namePart = sanitizeFileName(clientName || 'cliente') || 'cliente';
    const documentPart = String(clientDocument || '').replace(/\D/g, '').slice(-6);
    const fallbackPart = documentPart || Date.now().toString(36);
    return `assinatura+${namePart}-${fallbackPart}@sem-email.local`;
};

const getContractPdfPayload = (contract) => ({
    clientName: contract.client?.name || contract.clientName || 'CONTRATANTE',
    clientDocument: contract.client?.document || '',
    clientAddress: contract.client?.address || '',
    clientCityState: contract.client?.cityState || '',
    signerName: contract.signedName || contract.client?.signerName || '',
    signerDocument: contract.signedDocument || contract.client?.signerDocument || '',
    signedSignatureData: contract.signedSignatureData || '',
    scope: contract.scope,
    monthlyValue: contract.monthlyValue,
    durationMonths: contract.durationMonths,
    paymentDay: contract.paymentDay,
    contractDate: contract.contractDate,
    signedAt: contract.signedAt
});

const resolveContractClient = async ({
    clientId,
    clientName,
    clientEmail,
    clientDocument,
    clientAddress,
    clientCityState,
    signerName,
    signerDocument,
    allowPlaceholderEmail = false
}) => {
    if (clientId) {
        const parsedClientId = parseInt(clientId, 10);
        const client = await prisma.client.findUnique({
            where: { id: parsedClientId }
        });

        if (!client) {
            throw new Error('CLIENT_NOT_FOUND');
        }

        const normalizedEmail = clientEmail ? String(clientEmail).trim().toLowerCase() : '';
        const updateData = {};

        if (clientName && clientName !== client.name) updateData.name = clientName;
        if (normalizedEmail && normalizedEmail !== client.email) updateData.email = normalizedEmail;
        if (clientDocument && clientDocument !== client.document) updateData.document = clientDocument;
        if (clientAddress && clientAddress !== client.address) updateData.address = clientAddress;
        if (clientCityState && clientCityState !== client.cityState) updateData.cityState = clientCityState;
        if (signerName && signerName !== client.signerName) updateData.signerName = signerName;
        if (signerDocument && signerDocument !== client.signerDocument) updateData.signerDocument = signerDocument;

        if (Object.keys(updateData).length > 0) {
            return prisma.client.update({
                where: { id: parsedClientId },
                data: updateData
            });
        }

        return client;
    }

    if (!clientName) {
        throw new Error('MANUAL_CLIENT_REQUIRES_NAME');
    }

    const normalizedEmail = clientEmail ? String(clientEmail).trim().toLowerCase() : '';

    if (!normalizedEmail && !allowPlaceholderEmail) {
        throw new Error('MANUAL_CLIENT_REQUIRES_EMAIL');
    }

    const clientEmailValue = normalizedEmail || buildPlaceholderClientEmail(clientName, clientDocument);
    const existingClient = normalizedEmail
        ? await prisma.client.findUnique({
            where: { email: normalizedEmail }
        })
        : null;

    if (existingClient) {
        return prisma.client.update({
            where: { id: existingClient.id },
            data: {
                name: clientName || existingClient.name,
                email: clientEmailValue,
                document: clientDocument || existingClient.document,
                address: clientAddress || existingClient.address,
                cityState: clientCityState || existingClient.cityState,
                signerName: signerName || existingClient.signerName,
                signerDocument: signerDocument || existingClient.signerDocument
            }
        });
    }

    return prisma.client.create({
        data: {
            name: clientName,
            email: clientEmailValue,
            document: clientDocument || null,
            address: clientAddress || null,
            cityState: clientCityState || null,
            signerName: signerName || null,
            signerDocument: signerDocument || null,
            status: 'ACTIVE'
        }
    });
};

exports.generateContract = async (req, res) => {
    try {
        const { clientName, clientDocument, scope, monthlyValue, durationMonths, paymentDay } = req.body;

        if (!clientName || !clientDocument || !scope) {
            return res.status(400).json({ error: 'Nome/Razao social, CPF/CNPJ e escopo sao obrigatorios.' });
        }

        parsePositiveMoney(monthlyValue, 'Valor mensal');
        parsePositiveInt(durationMonths, 'Vigencia', 6);
        parsePaymentDay(paymentDay);

        const pdfBuffer = await contractService.generateContractBuffer(req.body);
        const fileName = `contrato_${sanitizeFileName(clientName)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[CONTRACT GENERATE ERROR]:', error);
        res.status(error.status || 500).json({ error: error.status ? error.message : 'Erro ao gerar contrato.' });
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
            return res.status(400).json({ error: 'Cliente, escopo e valor mensal sao obrigatorios.' });
        }

        const parsedClientId = parseInt(clientId, 10);
        const start = startDate ? new Date(startDate) : new Date();
        const parsedMonthlyValue = parsePositiveMoney(monthlyValue, 'Valor mensal');
        const duration = parsePositiveInt(durationMonths, 'Vigencia', 6);
        const parsedPaymentDay = parsePaymentDay(paymentDay);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);

        const contract = await prisma.contract.create({
            data: {
                clientId: parsedClientId,
                scope,
                monthlyValue: parsedMonthlyValue,
                durationMonths: duration,
                paymentDay: parsedPaymentDay,
                startDate: start,
                endDate: end,
                status: 'ACTIVE',
                contractDate: contractDate || new Date().toLocaleDateString('pt-BR')
            },
            include: {
                client: true
            }
        });
        res.status(201).json(contract);
    } catch (err) {
        console.error('[CREATE CONTRACT ERROR]:', err);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Erro ao criar contrato: ' + err.message });
    }
};

exports.sendSignatureLink = async (req, res) => {
    try {
        const {
            clientId,
            clientName,
            clientEmail,
            clientDocument,
            clientAddress,
            clientCityState,
            signerName,
            signerDocument,
            scope,
            monthlyValue,
            durationMonths,
            paymentDay,
            startDate,
            contractDate,
            delivery = 'email'
        } = req.body;

        if (!scope || !monthlyValue) {
            return res.status(400).json({ error: 'Escopo e valor mensal sao obrigatorios.' });
        }

        const parsedMonthlyValue = parsePositiveMoney(monthlyValue, 'Valor mensal');
        const duration = parsePositiveInt(durationMonths, 'Vigencia', 6);
        const parsedPaymentDay = parsePaymentDay(paymentDay);

        let client;
        try {
            client = await resolveContractClient({
                clientId,
                clientName,
                clientEmail,
                clientDocument,
                clientAddress,
                clientCityState,
                signerName,
                signerDocument,
                allowPlaceholderEmail: delivery === 'copy'
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
                return res.status(404).json({ error: 'Cliente não encontrado.' });
            }

            if (error instanceof Error && error.message === 'MANUAL_CLIENT_REQUIRES_NAME') {
                return res.status(400).json({ error: 'Para gerar o link sem selecionar um cliente, preencha o nome do contratante.' });
            }

            if (error instanceof Error && error.message === 'MANUAL_CLIENT_REQUIRES_EMAIL') {
                return res.status(400).json({ error: 'Para enviar o link por e-mail sem selecionar um cliente, preencha o e-mail do contratante.' });
            }

            throw error;
        }

        if (delivery === 'email' && !client.email) {
            return res.status(400).json({ error: 'O cliente precisa ter e-mail cadastrado para receber o link de assinatura.' });
        }

        const start = startDate ? new Date(startDate) : new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);
        const signatureToken = crypto.randomBytes(24).toString('hex');

        const contract = await prisma.contract.create({
            data: {
                clientId: client.id,
                scope,
                monthlyValue: parsedMonthlyValue,
                durationMonths: duration,
                paymentDay: parsedPaymentDay,
                startDate: start,
                endDate: end,
                status: 'PENDING_SIGNATURE',
                contractDate: contractDate || new Date().toLocaleDateString('pt-BR'),
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
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Erro ao enviar link de assinatura: ' + err.message });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contract.delete({
            where: { id: parseInt(id, 10) }
        });
        res.json({ message: 'Contrato excluido com sucesso.' });
    } catch (err) {
        console.error('[DELETE CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir contrato.' });
    }
};

exports.getContractPdfById = async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await prisma.contract.findUnique({
            where: { id: parseInt(id, 10) },
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
        console.error('[GET CONTRACT PDF ERROR]:', err);
        res.status(500).json({ error: 'Erro ao gerar o PDF do contrato.' });
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
        const { signerName, signerDocument, signedSignatureData } = req.body;

        if (!String(signedSignatureData).startsWith('data:image/')) {
            return res.status(400).json({ error: 'Formato de assinatura inválido.' });
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
            return res.status(409).json({ error: 'Este contrato ja foi assinado.' });
        }

        const resolvedSignerName =
            signerName ||
            contract.client?.signerName ||
            contract.client?.name ||
            contract.clientName;
        const resolvedSignerDocument =
            signerDocument ||
            contract.client?.signerDocument ||
            contract.client?.document;

        if (!resolvedSignerName || !resolvedSignerDocument || !signedSignatureData) {
            return res.status(400).json({ error: 'Não encontrei os dados do assinante vinculados ao contrato.' });
        }

        const signedAt = new Date();
        const updatedContract = await prisma.contract.update({
            where: { id: contract.id },
            data: {
                status: 'ACTIVE',
                signedAt,
                signedName: resolvedSignerName,
                signedDocument: resolvedSignerDocument,
                signedSignatureData
            },
            include: {
                client: true
            }
        });

        if (updatedContract.clientId) {
            await prisma.client.update({
                where: { id: updatedContract.clientId },
                data: {
                    signerName: resolvedSignerName,
                    signerDocument: resolvedSignerDocument
                }
            });
        }

        const signedPdfBuffer = await contractService.generateContractBuffer({
            ...getContractPdfPayload({
                ...updatedContract,
                signedAt
            }),
            clientName: updatedContract.client?.name || updatedContract.clientName || 'CONTRATANTE',
            signerName: resolvedSignerName,
            signerDocument: resolvedSignerDocument,
            signedSignatureData,
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
