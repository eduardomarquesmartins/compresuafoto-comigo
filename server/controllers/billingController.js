const prisma = require('../lib/prisma');
const billing = require('../services/mercadoPagoBillingService');

const chargeInclude = { client: { select: { id: true, name: true, email: true, phone: true } }, contract: true, proposal: true, paymentAttempts: { orderBy: { createdAt: 'desc' } }, financialRecords: true };
const parseId = (id) => Number.isInteger(Number(id)) ? Number(id) : null;
const publicCharge = (charge) => ({ publicId: charge.publicId, amount: charge.amount, currency: charge.currency, description: charge.description, status: charge.status, dueDate: charge.dueDate, checkoutUrl: charge.checkoutUrl, paidAt: charge.paidAt, client: { name: charge.client.name } });

const hasValue = (value) => value !== undefined && value !== null && value !== '';

function parseDueDate(value) {
    if (!hasValue(value)) return null;
    const dateOnly = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(value));
    if (dateOnly) {
        const [year, month, day] = dateOnly.slice(1).map(Number);
        const calendarDate = new Date(Date.UTC(year, month - 1, day));
        if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
        // A date-only value is a calendar date, not midnight UTC. Store it at
        // midnight in the billing timezone so its competence does not shift month.
        return new Date(`${value}T00:00:00-03:00`);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function contractCompetenceKey(contractId, dueDate) {
    if (!contractId || !dueDate) return undefined;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(dueDate);
    const year = parts.find(part => part.type === 'year').value;
    const month = parts.find(part => part.type === 'month').value;
    return `contract-${contractId}-${year}-${month}`;
}

function resolveIdempotencyKey({ contractId, dueDate, explicitKey }) {
    return contractCompetenceKey(contractId, dueDate) || explicitKey || undefined;
}

async function verifyLinks({ clientId, contractId, proposalId }, db = prisma) {
    if (contractId) {
        const contract = await db.contract.findUnique({ where: { id: contractId } });
        if (!contract || contract.clientId !== clientId) throw Object.assign(new Error('Contrato incompatível com o cliente.'), { status: 400 });
        if (!contract.signedAt) throw Object.assign(new Error('Contrato deve estar assinado para gerar cobrança.'), { status: 409 });
        if (contract.status !== 'ACTIVE') throw Object.assign(new Error('Contrato deve estar ativo para gerar cobrança.'), { status: 409 });
    }
    if (proposalId) { const proposal = await db.proposal.findUnique({ where: { id: proposalId } }); if (!proposal || proposal.clientId !== clientId) throw Object.assign(new Error('Proposta incompatível com o cliente.'), { status: 400 }); }
}

exports.createCharge = async (req, res) => {
    let charge;
    try {
        const clientId = parseId(req.body.clientId), amount = Number(req.body.amount);
        if (!clientId || !Number.isFinite(amount) || amount <= 0 || !req.body.description?.trim()) return res.status(400).json({ error: 'Cliente, descrição e valor positivo são obrigatórios.' });
        const contractProvided = hasValue(req.body.contractId), proposalProvided = hasValue(req.body.proposalId);
        const contractId = contractProvided ? parseId(req.body.contractId) : null, proposalId = proposalProvided ? parseId(req.body.proposalId) : null;
        if ((contractProvided && !contractId) || (proposalProvided && !proposalId)) return res.status(400).json({ error: 'Contrato ou proposta inválido.' });
        const dueDate = parseDueDate(req.body.dueDate);
        if (hasValue(req.body.dueDate) && !dueDate) return res.status(400).json({ error: 'Vencimento inválido.' });
        const client = await prisma.client.findUnique({ where: { id: clientId } });
        if (!client) return res.status(404).json({ error: 'Cliente não encontrado.' });
        await verifyLinks({ clientId, contractId, proposalId });
        const idempotencyKey = resolveIdempotencyKey({ contractId, dueDate, explicitKey: req.get('Idempotency-Key') });
        if (idempotencyKey) {
            const existing = await prisma.billingCharge.findUnique({ where: { idempotencyKey }, include: chargeInclude });
            if (existing) {
                if (existing.status === 'CANCELLED') return res.status(409).json({ error: 'A cobrança anterior foi cancelada; reemita-a para gerar uma nova cobrança.', chargeId: existing.id });
                return res.status(200).json(existing);
            }
        }
        const publicId = require('crypto').randomUUID();
        charge = await prisma.billingCharge.create({ data: { publicId, clientId, amount: amount.toFixed(2), description: req.body.description.trim(), dueDate, contractId, proposalId, idempotencyKey, externalReference: `econti-billing:${publicId}` } });
        try {
            const preference = await billing.createPreference(charge, client);
            const updated = await prisma.billingCharge.update({ where: { id: charge.id }, data: { preferenceId: String(preference.id), checkoutUrl: preference.init_point || preference.sandbox_init_point, status: 'PENDING' }, include: chargeInclude });
            return res.status(201).json(updated);
        } catch (error) {
            // Mercado Pago may have accepted the preference before a timeout. Never
            // delete this evidence; operations can reconcile it from the charge id.
            try { await prisma.billingCharge.update({ where: { id: charge.id }, data: { status: 'REVIEW' } }); } catch (_) { /* OPEN still remains traceable */ }
            throw Object.assign(error, { status: 502, chargeId: charge.id, publicId: charge.publicId });
        }
    } catch (error) {
        // A concurrent request with the same key lost the unique-index race: return
        // the original charge instead of creating a second Checkout preference.
        const contractId = hasValue(req.body.contractId) ? parseId(req.body.contractId) : null;
        const idempotencyKey = resolveIdempotencyKey({ contractId, dueDate: parseDueDate(req.body.dueDate), explicitKey: req.get('Idempotency-Key') });
        if (error.code === 'P2002' && idempotencyKey) {
            const existing = await prisma.billingCharge.findUnique({ where: { idempotencyKey }, include: chargeInclude });
            if (existing && existing.status !== 'CANCELLED') return res.status(200).json(existing);
        }
        res.status(error.status || 500).json({ error: error.message || 'Erro ao criar cobrança.', ...(error.chargeId ? { chargeId: error.chargeId, publicId: error.publicId } : {}) });
    }
};
exports.reissueCharge = async (req, res) => {
    try {
        const charge = await prisma.billingCharge.findUnique({ where: { id: parseId(req.params.id) }, include: { client: true } });
        if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' });
        if (charge.status !== 'CANCELLED') return res.status(409).json({ error: 'Somente cobranças canceladas podem ser reemitidas.' });
        // The original charge may have been created while its contract was valid.
        // Always check the current contract state before issuing a new link.
        if (charge.contractId) await verifyLinks({ clientId: charge.clientId, contractId: charge.contractId });
        const requestedKey = req.get('Idempotency-Key');
        if (!requestedKey) return res.status(400).json({ error: 'Idempotency-Key é obrigatório para reemissão.' });
        const idempotencyKey = `reissue-${charge.id}-${requestedKey}`;
        const existing = await prisma.billingCharge.findUnique({ where: { idempotencyKey }, include: chargeInclude });
        if (existing) return res.status(200).json(existing);
        const publicId = require('crypto').randomUUID();
        const replacement = await prisma.billingCharge.create({ data: { publicId, clientId: charge.clientId, amount: charge.amount, description: charge.description, dueDate: charge.dueDate, contractId: charge.contractId, proposalId: charge.proposalId, idempotencyKey, externalReference: `econti-billing:${publicId}` } });
        try {
            const preference = await billing.createPreference(replacement, charge.client);
            return res.status(201).json(await prisma.billingCharge.update({ where: { id: replacement.id }, data: { preferenceId: String(preference.id), checkoutUrl: preference.init_point || preference.sandbox_init_point, status: 'PENDING' }, include: chargeInclude }));
        } catch (error) {
            try { await prisma.billingCharge.update({ where: { id: replacement.id }, data: { status: 'REVIEW' } }); } catch (_) { /* retains replacement */ }
            return res.status(502).json({ error: error.message || 'Erro ao reemitir cobrança.', chargeId: replacement.id, publicId: replacement.publicId });
        }
    } catch (error) {
        // Two requests can race after both observed no replacement. The unique
        // reissue key makes the winning replacement the retry result.
        if (error.code === 'P2002') {
            const originalId = parseId(req.params.id);
            const requestedKey = req.get('Idempotency-Key');
            if (originalId && requestedKey) {
                const existing = await prisma.billingCharge.findUnique({ where: { idempotencyKey: `reissue-${originalId}-${requestedKey}` }, include: chargeInclude });
                if (existing) return res.status(200).json(existing);
            }
        }
        res.status(error.status || 500).json({ error: error.message || 'Erro ao reemitir cobrança.' });
    }
};
exports.parseDueDate = parseDueDate;
exports.contractCompetenceKey = contractCompetenceKey;
exports.resolveIdempotencyKey = resolveIdempotencyKey;
exports.verifyLinks = verifyLinks;
exports.listCharges = async (req, res) => { const where = {}; if (req.query.status) where.status = req.query.status; if (req.query.clientId) where.clientId = parseId(req.query.clientId); res.json(await prisma.billingCharge.findMany({ where, include: chargeInclude, orderBy: { createdAt: 'desc' } })); };
exports.getCharge = async (req, res) => { const charge = await prisma.billingCharge.findUnique({ where: { id: parseId(req.params.id) }, include: chargeInclude }); if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' }); res.json(charge); };
exports.cancelCharge = async (req, res) => { const charge = await prisma.billingCharge.findUnique({ where: { id: parseId(req.params.id) } }); if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' }); if (charge.status === 'PAID') return res.status(409).json({ error: 'Cobrança paga não pode ser cancelada.' }); res.json(await prisma.billingCharge.update({ where: { id: charge.id }, data: { status: 'CANCELLED' } })); };
exports.refreshLink = async (req, res) => { try { const charge = await prisma.billingCharge.findUnique({ where: { id: parseId(req.params.id) }, include: { client: true } }); if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' }); if (['PAID', 'CANCELLED'].includes(charge.status)) return res.status(409).json({ error: 'Cobrança não pode ter link renovado.' }); const preference = await billing.createPreference(charge, charge.client); res.json(await prisma.billingCharge.update({ where: { id: charge.id }, data: { preferenceId: String(preference.id), checkoutUrl: preference.init_point || preference.sandbox_init_point, status: 'PENDING' } })); } catch (error) { res.status(500).json({ error: error.message }); } };
exports.getPublicCharge = async (req, res) => { const charge = await prisma.billingCharge.findUnique({ where: { publicId: req.params.publicId }, include: { client: true } }); if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' }); res.json(publicCharge(charge)); };

async function applyPayment(paymentId, payload) {
    const payment = await billing.getPayment(paymentId);
    const ref = String(payment.external_reference || '');
    const charge = await prisma.billingCharge.findUnique({ where: { externalReference: ref } });
    if (!charge || ref !== `econti-billing:${charge.publicId}` || String(payment.currency_id) !== 'BRL' || Number(payment.transaction_amount) !== Number(charge.amount)) throw Object.assign(new Error('Pagamento não corresponde à cobrança.'), { status: 400 });
    const approved = payment.status === 'approved'; const fee = billing.paymentFee(payment);
    await prisma.$transaction(async tx => {
        await tx.paymentAttempt.upsert({ where: { providerPaymentId: String(payment.id) }, create: { providerPaymentId: String(payment.id), billingChargeId: charge.id, status: payment.status, statusDetail: payment.status_detail, paymentMethod: payment.payment_method_id, paymentType: payment.payment_type_id, transactionAmount: payment.transaction_amount, feeAmount: fee || null, approvedAt: approved ? new Date(payment.date_approved || Date.now()) : null, rawPayload: payment }, update: { status: payment.status, statusDetail: payment.status_detail, feeAmount: fee || null, approvedAt: approved ? new Date(payment.date_approved || Date.now()) : null, rawPayload: payment } });
        // Re-read inside the transaction: cancellation is terminal even when an
        // old payment link is approved after the initial lookup. Recording the
        // attempt acknowledges the webhook, so Mercado Pago does not retry it.
        const currentCharge = await tx.billingCharge.findUnique({ where: { id: charge.id } });
        if (currentCharge.status === 'CANCELLED') return;
        if (approved && currentCharge.status !== 'PAID') { await tx.billingCharge.update({ where: { id: charge.id }, data: { status: 'PAID', paidAt: new Date(payment.date_approved || Date.now()) } }); await tx.financialRecord.create({ data: { billingChargeId: charge.id, clientId: charge.clientId, type: 'INCOME', description: charge.description, amount: Number(charge.amount), category: 'Cobrança Mercado Pago', account: 'MERCADO PAGO', status: 'PAID', date: new Date(payment.date_approved || Date.now()) } }); if (fee > 0) await tx.financialRecord.create({ data: { billingChargeId: charge.id, clientId: charge.clientId, type: 'EXPENSE', description: `Taxa Mercado Pago - ${charge.description}`, amount: fee, category: 'Mercado Pago fee', account: 'MERCADO PAGO', status: 'PAID', date: new Date(payment.date_approved || Date.now()) } }); }
        else if (!approved && currentCharge.status !== 'PAID') await tx.billingCharge.update({ where: { id: charge.id }, data: { status: payment.status === 'rejected' ? 'FAILED' : 'PENDING' } });
    });
    return prisma.billingCharge.findUnique({ where: { id: charge.id }, include: { client: true } });
}
exports.applyPayment = applyPayment;
exports.syncPublicCharge = async (req, res) => { try { if (!req.query.payment_id) return res.status(400).json({ error: 'payment_id é obrigatório.' }); const charge = await prisma.billingCharge.findUnique({ where: { publicId: req.params.publicId } }); if (!charge) return res.status(404).json({ error: 'Cobrança não encontrada.' }); const updated = await applyPayment(req.query.payment_id, { source: 'sync' }); if (updated.publicId !== charge.publicId) return res.status(400).json({ error: 'Pagamento incompatível.' }); res.json(publicCharge(updated)); } catch (error) { res.status(error.status || 502).json({ error: error.message }); } };
exports.handleWebhook = async (req, res) => { if (!billing.verifyWebhookSignature(req)) return res.status(401).send('Invalid signature'); const paymentId = req.body?.data?.id || req.query['data.id']; if (!paymentId) return res.status(400).send('Missing payment id'); try { const eventId = `${req.headers['x-request-id'] || 'payment'}:${paymentId}`; const event = await prisma.billingWebhookEvent.upsert({ where: { providerEventId: eventId }, create: { providerEventId: eventId, payload: req.body }, update: {} }); if (event.processedAt) return res.sendStatus(200); const charge = await applyPayment(paymentId, req.body); await prisma.billingWebhookEvent.update({ where: { id: event.id }, data: { billingChargeId: charge.id, processedAt: new Date() } }); res.sendStatus(200); } catch (error) { console.error('[BILLING WEBHOOK]', error); res.status(502).send('Retry'); } };
