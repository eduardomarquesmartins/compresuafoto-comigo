const test = require('node:test');
const assert = require('node:assert/strict');

const {
    parseDueDate,
    contractCompetenceKey,
    resolveIdempotencyKey,
    verifyLinks,
    createCharge,
    reissueCharge,
    applyPayment,
} = require('../controllers/billingController');
const prisma = require('../lib/prisma');
const billing = require('../services/mercadoPagoBillingService');

test('deriva a chave de competência do contrato no fuso America/Sao_Paulo', () => {
    assert.equal(contractCompetenceKey(42, parseDueDate('2026-04-01')), 'contract-42-2026-04');
    assert.equal(contractCompetenceKey(42, parseDueDate('2026-04-01T01:00:00.000Z')), 'contract-42-2026-03');
    assert.equal(resolveIdempotencyKey({ contractId: 42, dueDate: parseDueDate('2026-04-20'), explicitKey: 'ignored' }), 'contract-42-2026-04');
    assert.equal(resolveIdempotencyKey({ contractId: null, dueDate: parseDueDate('2026-04-20'), explicitKey: 'one-off-key' }), 'one-off-key');
});

test('repetir contrato e competência resolve para a mesma chave lógica', () => {
    const first = resolveIdempotencyKey({ contractId: 7, dueDate: parseDueDate('2026-04-02') });
    const second = resolveIdempotencyKey({ contractId: 7, dueDate: parseDueDate('2026-04-30') });
    assert.equal(first, second);
});

test('valida que o contrato pertence ao cliente da cobrança', async () => {
    const db = { contract: { findUnique: async () => ({ id: 8, clientId: 3, signedAt: new Date(), status: 'ACTIVE' }) }, proposal: { findUnique: async () => null } };
    await assert.doesNotReject(() => verifyLinks({ clientId: 3, contractId: 8 }, db));
    await assert.rejects(() => verifyLinks({ clientId: 4, contractId: 8 }, db), { message: 'Contrato incompatível com o cliente.', status: 400 });
});

test('rejeita contrato não assinado ou inativo', async () => {
    const db = { proposal: { findUnique: async () => null }, contract: { findUnique: async () => ({ id: 8, clientId: 3, signedAt: null, status: 'ACTIVE' }) } };
    await assert.rejects(() => verifyLinks({ clientId: 3, contractId: 8 }, db), { message: 'Contrato deve estar assinado para gerar cobrança.', status: 409 });
    db.contract.findUnique = async () => ({ id: 8, clientId: 3, signedAt: new Date(), status: 'CANCELLED' });
    await assert.rejects(() => verifyLinks({ clientId: 3, contractId: 8 }, db), { message: 'Contrato deve estar ativo para gerar cobrança.', status: 409 });
});

test('cobrança repetida de contrato retorna a existente sem nova preferência', async (t) => {
    const original = { client: prisma.client, contract: prisma.contract, billingCharge: prisma.billingCharge, createPreference: billing.createPreference };
    t.after(() => Object.assign(prisma, { client: original.client, contract: original.contract, billingCharge: original.billingCharge }) && (billing.createPreference = original.createPreference));

    const existing = { id: 99, idempotencyKey: 'contract-8-2026-04', publicId: 'existing-charge' };
    prisma.client = { findUnique: async () => ({ id: 3, name: 'Cliente' }) };
    prisma.contract = { findUnique: async () => ({ id: 8, clientId: 3, signedAt: new Date(), status: 'ACTIVE' }) };
    prisma.billingCharge = {
        findUnique: async ({ where }) => where.idempotencyKey === existing.idempotencyKey ? existing : null,
        create: async () => assert.fail('não deve criar uma segunda cobrança'),
    };
    billing.createPreference = async () => assert.fail('não deve criar uma segunda preferência');

    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await createCharge({
        body: { clientId: 3, contractId: 8, amount: 100, description: 'Mensalidade', dueDate: '2026-04-25' },
        get: () => undefined,
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body, existing);
});

test('emissão avulsa não consulta contrato e falha ambígua mantém cobrança em REVIEW', async (t) => {
    const original = { client: prisma.client, billingCharge: prisma.billingCharge, createPreference: billing.createPreference };
    t.after(() => Object.assign(prisma, { client: original.client, billingCharge: original.billingCharge }) && (billing.createPreference = original.createPreference));
    const updates = [];
    prisma.client = { findUnique: async () => ({ id: 3, name: 'Cliente' }) };
    prisma.billingCharge = {
        findUnique: async () => null,
        create: async data => ({ id: 55, ...data.data }),
        update: async args => { updates.push(args); return { id: 55, status: 'REVIEW' }; },
    };
    billing.createPreference = async () => { throw new Error('timeout Mercado Pago'); };
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await createCharge({ body: { clientId: 3, amount: 100, description: 'Avulsa' }, get: () => undefined }, response);
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.chargeId, 55);
    assert.equal(updates[0].data.status, 'REVIEW');
});

test('cobrança cancelada não é retornada como sucesso e reemissão é idempotente', async (t) => {
    const original = { client: prisma.client, contract: prisma.contract, billingCharge: prisma.billingCharge, createPreference: billing.createPreference };
    t.after(() => Object.assign(prisma, { client: original.client, contract: original.contract, billingCharge: original.billingCharge }) && (billing.createPreference = original.createPreference));
    const cancelled = { id: 9, status: 'CANCELLED', idempotencyKey: 'contract-8-2026-04', clientId: 3, amount: '10.00', description: 'Mensalidade', dueDate: null, contractId: 8, proposalId: null, client: { name: 'Cliente' } };
    prisma.client = { findUnique: async () => ({ id: 3, name: 'Cliente' }) };
    prisma.contract = { findUnique: async () => ({ id: 8, clientId: 3, signedAt: new Date(), status: 'ACTIVE' }) };
    prisma.billingCharge = { findUnique: async ({ where }) => where.idempotencyKey ? cancelled : null };
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    await createCharge({ body: { clientId: 3, amount: 10, description: 'x', contractId: 8, dueDate: '2026-04-25' }, get: () => undefined }, response);
    assert.equal(response.statusCode, 409);

    const reissued = { id: 10, status: 'PENDING' };
    prisma.billingCharge = {
        findUnique: async ({ where }) => where.id === 9 ? cancelled : (where.idempotencyKey ? reissued : null),
        create: async () => assert.fail('retry must not create another reissue'),
    };
    await reissueCharge({ params: { id: '9' }, get: name => name === 'Idempotency-Key' ? 'apr-issue-1' : undefined }, response);
    assert.equal(response.statusCode, 200);
    assert.equal(response.body, reissued);
});

test('reemissão revalida contrato atual e bloqueia contrato não assinado ou inativo', async (t) => {
    const original = { contract: prisma.contract, billingCharge: prisma.billingCharge };
    t.after(() => Object.assign(prisma, original));
    const cancelled = { id: 9, status: 'CANCELLED', clientId: 3, contractId: 8, client: { name: 'Cliente' } };
    prisma.billingCharge = { findUnique: async () => cancelled };
    const response = { statusCode: null, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };

    prisma.contract = { findUnique: async () => ({ id: 8, clientId: 3, signedAt: null, status: 'ACTIVE' }) };
    await reissueCharge({ params: { id: '9' }, get: () => 'retry-1' }, response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error, 'Contrato deve estar assinado para gerar cobrança.');

    prisma.contract = { findUnique: async () => ({ id: 8, clientId: 3, signedAt: new Date(), status: 'CANCELLED' }) };
    await reissueCharge({ params: { id: '9' }, get: () => 'retry-2' }, response);
    assert.equal(response.statusCode, 409);
    assert.equal(response.body.error, 'Contrato deve estar ativo para gerar cobrança.');
});

test('pagamento aprovado de link cancelado fica apenas como tentativa auditável', async (t) => {
    const original = { billingCharge: prisma.billingCharge, $transaction: prisma.$transaction, getPayment: billing.getPayment, paymentFee: billing.paymentFee };
    t.after(() => Object.assign(prisma, { billingCharge: original.billingCharge, $transaction: original.$transaction }) && Object.assign(billing, { getPayment: original.getPayment, paymentFee: original.paymentFee }));
    const cancelled = { id: 15, publicId: 'cancelled-charge', externalReference: 'econti-billing:cancelled-charge', clientId: 3, amount: '100.00', description: 'Mensalidade', status: 'CANCELLED', client: { name: 'Cliente' } };
    const attempts = [];
    prisma.billingCharge = { findUnique: async () => cancelled };
    prisma.$transaction = async callback => callback({
        paymentAttempt: { upsert: async args => attempts.push(args) },
        billingCharge: { findUnique: async () => cancelled, update: async () => assert.fail('cobrança cancelada não pode ser atualizada') },
        financialRecord: { create: async () => assert.fail('cobrança cancelada não pode gerar registro financeiro') },
    });
    billing.getPayment = async () => ({ id: 'mp-15', external_reference: cancelled.externalReference, currency_id: 'BRL', transaction_amount: 100, status: 'approved', date_approved: '2026-04-01T12:00:00Z' });
    billing.paymentFee = () => 9.5;

    const result = await applyPayment('mp-15', { source: 'webhook' });
    assert.equal(result.status, 'CANCELLED');
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].create.billingChargeId, cancelled.id);
    assert.equal(attempts[0].create.status, 'approved');
});
