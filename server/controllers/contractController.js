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
const raw = process.env.ECONTI_PUBLIC_URL || process.env.CLIENT_URL || 'https://econticomigo.com.br';
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
    // The proposal snapshot remains immutable in `scope`; pending-contract
    // additions are rendered alongside it without changing that snapshot.
    scope: [
        contract.scope,
        contract.additionalScope ? `Escopo adicional:\n${contract.additionalScope}` : '',
        contract.observation ? `Observações adicionais: ${contract.observation}` : ''
    ].filter(Boolean).join('\n'),
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

const proposalScopeSnapshot = (value) => {
    try {
        const services = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(services) ? services.map(s => s.name || s.serviceName || s.description || String(s)).join('; ') || 'Serviços conforme proposta' : String(value || 'Serviços conforme proposta');
    } catch { return String(value || 'Serviços conforme proposta'); }
};

const getOrCreateLinkedProposalContract = async (proposalId, supplied = {}, { approvePending = false } = {}) => {
    const id = parseInt(proposalId, 10);
    if (!Number.isInteger(id)) throw Object.assign(new Error('proposalId inválido.'), { status: 400 });
    const suppliedClientId = supplied.clientId === undefined || supplied.clientId === null || supplied.clientId === '' ? null : parseInt(supplied.clientId, 10);
    if (supplied.clientId !== undefined && !Number.isInteger(suppliedClientId)) throw Object.assign(new Error('clientId inválido.'), { status: 400 });
    const verify = (contract) => {
        if (supplied.scope && supplied.scope !== contract.scope) throw Object.assign(new Error('Escopo incompatível com o snapshot da proposta.'), { status: 409 });
        if (supplied.monthlyValue !== undefined && Number(supplied.monthlyValue) !== Number(contract.monthlyValue)) throw Object.assign(new Error('Valor incompatível com o snapshot da proposta.'), { status: 409 });
        if (supplied.durationMonths !== undefined && Number(supplied.durationMonths) !== Number(contract.durationMonths)) throw Object.assign(new Error('Vigência incompatível com o contrato vinculado.'), { status: 409 });
        return contract;
    };
    try {
        return await prisma.$transaction(async (tx) => {
            let proposal = await tx.proposal.findUnique({ where: { id }, include: { client: true, contract: { include: { client: true } } } });
            if (!proposal || proposal.status === 'DELETED') throw Object.assign(new Error('Proposta não encontrada.'), { status: 404 });
            if (proposal.clientId && suppliedClientId && proposal.clientId !== suppliedClientId) throw Object.assign(new Error('Cliente incompatível com a proposta.'), { status: 409 });

            if (!proposal.clientId && suppliedClientId) {
                const client = await tx.client.findUnique({ where: { id: suppliedClientId } });
                if (!client) throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
                const changed = await tx.proposal.updateMany({
                    where: { id, status: proposal.status, clientId: null },
                    data: { clientId: client.id, clientName: client.name, clientEmail: client.email }
                });
                if (changed.count !== 1) throw Object.assign(new Error('A proposta foi alterada enquanto o contrato era gerado.'), { status: 409 });
                proposal = await tx.proposal.findUnique({ where: { id }, include: { client: true, contract: { include: { client: true } } } });
            }

            // Legacy send-link requests may still approve a pending proposal, but
            // now may choose its client in the same transaction.
            if (proposal.status === 'PENDING' && approvePending) {
                if (!proposal.clientId) throw Object.assign(new Error('Selecione um cliente antes de enviar para assinatura.'), { status: 400 });
                const changed = await tx.proposal.updateMany({
                    where: { id, status: 'PENDING', clientId: proposal.clientId },
                    data: { status: 'APPROVED', approvedAt: new Date() }
                });
                if (changed.count !== 1) throw Object.assign(new Error('A proposta foi alterada enquanto o link era preparado.'), { status: 409 });
                proposal = await tx.proposal.findUnique({ where: { id }, include: { client: true, contract: { include: { client: true } } } });
            }

            if (proposal.status !== 'APPROVED' || !proposal.clientId) throw Object.assign(new Error('A proposta deve estar aprovada e vinculada a um cliente.'), { status: 409 });
            if (proposal.contract) return verify(proposal.contract);
            if (supplied.durationMonths !== undefined && Number(supplied.durationMonths) !== 6) throw Object.assign(new Error('Vigência incompatível com o snapshot da proposta.'), { status: 409 });
            const startDate = new Date(), endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 6);
            return tx.contract.create({ data: {
                proposalId: proposal.id,
                clientId: proposal.clientId,
                scope: proposalScopeSnapshot(proposal.selectedServices),
                observation: typeof supplied.observation === 'string' ? supplied.observation.trim() || null : null,
                additionalScope: typeof supplied.additionalScope === 'string' ? supplied.additionalScope.trim() || null : null,
                monthlyValue: Number(proposal.total),
                durationMonths: 6,
                paymentDay: parsePaymentDay(supplied.paymentDay),
                startDate,
                endDate,
                status: 'PENDING_SIGNATURE',
                contractDate: new Date().toLocaleDateString('pt-BR'),
                signatureToken: crypto.randomBytes(24).toString('hex')
            }, include: { client: true } });
        });
    } catch (error) {
        if (error.code !== 'P2002') throw error;
        const contract = await prisma.contract.findUnique({ where: { proposalId: id }, include: { client: true } });
        if (!contract) throw error;
        return verify(contract);
    }
};

exports.updatePendingContract = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Contrato inválido.' });
        const { observation, additionalScope, paymentDay } = req.body;
        const data = {};
        if (observation !== undefined) {
            if (observation !== null && typeof observation !== 'string') return res.status(400).json({ error: 'Observação inválida.' });
            data.observation = observation?.trim() || null;
        }
        if (additionalScope !== undefined) {
            if (additionalScope !== null && typeof additionalScope !== 'string') return res.status(400).json({ error: 'Escopo adicional inválido.' });
            data.additionalScope = additionalScope?.trim() || null;
        }
        if (paymentDay !== undefined) data.paymentDay = parsePaymentDay(paymentDay);
        if (!Object.keys(data).length) return res.status(400).json({ error: 'Informe ao menos um campo editável.' });
        const changed = await prisma.contract.updateMany({ where: { id, status: 'PENDING_SIGNATURE', signedAt: null }, data });
        if (changed.count !== 1) return res.status(409).json({ error: 'Somente contratos pendentes de assinatura podem ser alterados.' });
        const contract = await prisma.contract.findUnique({ where: { id }, include: { client: true } });
        res.json(contract);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Erro ao atualizar contrato.' });
    }
};

exports.generateContract = async (req, res) => {
    try {
        const { clientName, clientDocument, scope, monthlyValue, durationMonths, paymentDay } = req.body;

        if (!clientName || !scope) {
            return res.status(400).json({ error: 'Nome/Razao social e escopo sao obrigatorios.' });
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
        const { clientId, proposalId, scope, monthlyValue, durationMonths, paymentDay, observation, additionalScope, startDate, contractDate } = req.body;
        if (proposalId) {
            const contract = await getOrCreateLinkedProposalContract(proposalId, { clientId, scope, monthlyValue, durationMonths, paymentDay, observation, additionalScope });
            return res.status(200).json(contract);
        }
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
            observation,
            additionalScope,
            startDate,
            contractDate,
            proposalId,
            delivery = 'email'
        } = req.body;

        if (!proposalId && (!scope || !monthlyValue)) {
            return res.status(400).json({ error: 'Escopo e valor mensal sao obrigatorios.' });
        }

        const parsedMonthlyValue = proposalId ? null : parsePositiveMoney(monthlyValue, 'Valor mensal');
        const duration = proposalId ? null : parsePositiveInt(durationMonths, 'Vigencia', 6);
        const parsedPaymentDay = proposalId ? null : parsePaymentDay(paymentDay);

        let client;
        let linkedContract = null;
        if (proposalId) {
            linkedContract = await getOrCreateLinkedProposalContract(
                proposalId,
                { clientId, scope, monthlyValue, durationMonths, paymentDay, observation, additionalScope },
                { approvePending: true }
            );
            if (linkedContract.signedAt || !linkedContract.signatureToken) return res.status(409).json({ error: 'O contrato vinculado não está disponível para nova assinatura.' });
            client = linkedContract.client;
        } else try {
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

        let contract = linkedContract;
        if (!contract) {
            const start = startDate ? new Date(startDate) : new Date();
            const end = new Date(start);
            end.setMonth(end.getMonth() + duration);
            const signatureToken = crypto.randomBytes(24).toString('hex');
            contract = await prisma.contract.create({ data: { clientId: client.id, scope, monthlyValue: parsedMonthlyValue, durationMonths: duration, paymentDay: parsedPaymentDay, startDate: start, endDate: end, status: 'PENDING_SIGNATURE', contractDate: contractDate || new Date().toLocaleDateString('pt-BR'), signatureToken }, include: { client: true } });
        }

        const pdfBuffer = await contractService.generateContractBuffer({
            ...getContractPdfPayload(contract),
            clientName: contract.client?.name || contract.clientName
        });
        const signLink = buildSignatureLink(contract.signatureToken);

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
        const contract = await prisma.contract.findUnique({ where: { id: parseInt(id, 10) }, select: { id: true } });
        if (!contract) return res.status(404).json({ error: 'Contrato não encontrado.' });
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
        const signed = await prisma.contract.updateMany({
            where: { id: contract.id, signedAt: null },
            data: {
                status: 'ACTIVE',
                signedAt,
                signedName: resolvedSignerName,
                signedDocument: resolvedSignerDocument,
                signedSignatureData
            }
        });
        if (signed.count !== 1) return res.status(409).json({ error: 'Este contrato ja foi assinado.' });
        const updatedContract = await prisma.contract.findUnique({ where: { id: contract.id }, include: { client: true } });

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

exports._internals = { getOrCreateLinkedProposalContract, proposalScopeSnapshot };
