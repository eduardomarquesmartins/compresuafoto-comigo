const test = require('node:test');
const assert = require('node:assert/strict');
const { _internals } = require('../controllers/proposalController');
const proposalController = require('../controllers/proposalController');
const contractController = require('../controllers/contractController');
const prisma = require('../lib/prisma');

test('proposal public tokens are opaque and unique-looking', () => {
    const first = _internals.createPublicToken();
    const second = _internals.createPublicToken();
    assert.match(first, /^[A-Za-z0-9_-]{40,}$/);
    assert.notEqual(first, second);
});

test('approval and acceptance transitions are idempotent', () => {
    const approved = _internals.transitionProposal({ id: 1, clientId: 2, status: 'APPROVED', acceptedAt: new Date('2026-01-01'), approvedAt: new Date('2026-01-01') }, 'accept');
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.acceptedAt.toISOString(), '2026-01-01T00:00:00.000Z');
    assert.throws(() => _internals.transitionProposal({ id: 1, clientId: 2, status: 'DECLINED' }, 'approve'), { status: 409 });
});

test('accept × decline and approve × decline are conflicting terminal transitions', () => {
    const pending = { id: 1, clientId: 2, status: 'PENDING' };
    const accepted = _internals.transitionProposal(pending, 'accept');
    assert.equal(accepted.status, 'APPROVED');
    assert.throws(() => _internals.transitionProposal({ ...pending, status: accepted.status }, 'decline'), { status: 409 });
    const declined = _internals.transitionProposal(pending, 'decline');
    assert.equal(declined.status, 'DECLINED');
    assert.throws(() => _internals.transitionProposal({ ...pending, status: declined.status }, 'approve'), { status: 409 });
});

test('invalid public tokens have no valid token shape', () => {
    assert.equal(_internals.isPublicToken('not a valid token!'), false);
    assert.equal(_internals.isPublicToken(_internals.createPublicToken()), true);
});

test('contract scope uses a proposal services snapshot', () => {
    assert.equal(_internals.parseServicesSnapshot(JSON.stringify([{ name: 'SEO' }, { description: 'Mídia paga' }])), 'SEO; Mídia paga');
});

test('public proposal exposes a safe client-link indicator without clientId', () => {
    const result = _internals.publicProposal({ id: 1, clientId: 9, clientName: 'Cliente', clientEmail: 'cliente@example.test', selectedServices: '[]', total: 300, proposalType: 'empresarial', status: 'PENDING' });
    assert.equal(result.hasClient, true);
    assert.equal(result.clientEmail, 'cliente@example.test');
    assert.equal('clientId' in result, false);
});

test('public acceptance qualification requires Client model identity and address fields', () => {
    assert.throws(() => _internals.validateQualification({ name: 'Ana', email: 'ana@example.test', document: '123.456.789-00', address: 'Rua A, 1', cityState: 'São Paulo/SP' }), { status: 400 });
    assert.throws(() => _internals.validateQualification({ name: 'Ana Silva', email: 'invalid', document: '123', address: '', cityState: '' }), { status: 400 });
    assert.deepEqual(_internals.validateQualification({
        name: ' Ana Silva ', email: 'ANA@EXAMPLE.TEST ', document: '12.345.678/0001-90',
        address: ' Rua A, 1 ', cityState: ' São Paulo/SP ', phone: ' 11999999999 '
    }), {
        name: 'Ana Silva', email: 'ana@example.test', document: '12.345.678/0001-90',
        address: 'Rua A, 1', cityState: 'São Paulo/SP', phone: '11999999999'
    });
});

test('accept transition can be prepared before an unlinked proposal is atomically linked', () => {
    assert.throws(() => _internals.transitionProposal({ id: 1, clientId: null, status: 'PENDING' }, 'accept'), { status: 400 });
    assert.equal(_internals.transitionProposal({ id: 1, clientId: null, status: 'PENDING' }, 'accept', { allowUnlinked: true }).status, 'APPROVED');
});

test('unlinked public acceptance creates one Client and reuses one Contract on retries', async () => {
    const original = {
        transaction: prisma.$transaction,
        proposalFind: prisma.proposal.findUnique,
        proposalUpdateMany: prisma.proposal.updateMany,
        proposalUpdate: prisma.proposal.update,
        clientCreate: prisma.client.create,
        contractFind: prisma.contract.findUnique,
        contractCreate: prisma.contract.create
    };
    const proposal = { id: 88, clientId: null, clientName: 'Lead', clientEmail: null, status: 'PENDING', total: 300, selectedServices: JSON.stringify([{ name: 'SEO' }]) };
    let client = null;
    let contract = null;
    let clientCreates = 0;
    let contractCreates = 0;
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.proposal.findUnique = async () => ({ ...proposal, client });
    prisma.proposal.updateMany = async ({ where, data }) => {
        if (where.status !== proposal.status || where.clientId !== proposal.clientId) return { count: 0 };
        Object.assign(proposal, data);
        return { count: 1 };
    };
    prisma.proposal.update = async ({ data }) => Object.assign(proposal, data);
    prisma.client.create = async ({ data }) => {
        if (client) { const error = new Error('unique email'); error.code = 'P2002'; throw error; }
        clientCreates += 1;
        client = { id: 18, ...data };
        return client;
    };
    prisma.contract.findUnique = async () => contract;
    prisma.contract.create = async ({ data }) => {
        if (contract) { const error = new Error('unique proposal'); error.code = 'P2002'; throw error; }
        contractCreates += 1;
        contract = { id: 91, ...data, client };
        return contract;
    };
    try {
        const qualification = _internals.validateQualification({ name: 'Ana Silva', email: 'ana@example.test', document: '123.456.789-00', address: 'Rua A, 1', cityState: 'São Paulo/SP' });
        const first = await _internals.approveAndGetContract(88, 'accept', qualification);
        const retry = await _internals.approveAndGetContract(88, 'accept', qualification);
        assert.equal(clientCreates, 1);
        assert.equal(contractCreates, 1);
        assert.equal(proposal.clientId, 18);
        assert.equal(first.contract.paymentDay, 25);
        assert.equal(first.contract.id, retry.contract.id);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
        prisma.proposal.updateMany = original.proposalUpdateMany;
        prisma.proposal.update = original.proposalUpdate;
        prisma.client.create = original.clientCreate;
        prisma.contract.findUnique = original.contractFind;
        prisma.contract.create = original.contractCreate;
    }
});

test('concurrent legacy creation with proposalId persists exactly one linked contract', async () => {
    const original = { transaction: prisma.$transaction, proposalFind: prisma.proposal.findUnique, contractFind: prisma.contract.findUnique, contractCreate: prisma.contract.create };
    let persisted = null;
    let successfulCreates = 0;
    prisma.proposal.findUnique = async () => ({ id: 44, clientId: 9, status: 'APPROVED', total: 300, paymentDay: 8, selectedServices: JSON.stringify([{ name: 'SEO' }]), contract: persisted, client: { id: 9, name: 'Cliente' } });
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.contract.findUnique = async () => persisted;
    prisma.contract.create = async ({ data }) => {
        if (persisted) { const error = new Error('unique'); error.code = 'P2002'; throw error; }
        successfulCreates += 1;
        persisted = { id: 71, ...data, client: { id: 9, name: 'Cliente' } };
        return persisted;
    };
    try {
        const [first, second] = await Promise.all([
            contractController._internals.getOrCreateLinkedProposalContract(44),
            contractController._internals.getOrCreateLinkedProposalContract(44),
        ]);
        assert.equal(successfulCreates, 1);
        assert.equal(first.id, second.id);
        assert.equal(first.proposalId, 44);
        assert.equal(first.paymentDay, 8);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
        prisma.contract.findUnique = original.contractFind;
        prisma.contract.create = original.contractCreate;
    }
});

test('sending a proposal for signature confirms it and uses the contract payment day default', async () => {
    const original = {
        transaction: prisma.$transaction,
        proposalFind: prisma.proposal.findUnique,
        proposalUpdateMany: prisma.proposal.updateMany,
        contractCreate: prisma.contract.create
    };
    const proposal = {
        id: 45,
        clientId: 10,
        status: 'PENDING',
        total: 500,
        selectedServices: JSON.stringify([{ name: 'Gestão de redes' }]),
        client: { id: 10, name: 'Cliente' },
        contract: null
    };
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.proposal.findUnique = async () => ({ ...proposal });
    prisma.proposal.updateMany = async ({ where, data }) => {
        assert.equal(where.status, 'PENDING');
        Object.assign(proposal, data);
        return { count: 1 };
    };
    prisma.contract.create = async ({ data }) => ({ id: 72, ...data, client: proposal.client });
    try {
        const contract = await contractController._internals.getOrCreateLinkedProposalContract(45, {}, { approvePending: true });
        assert.equal(proposal.status, 'APPROVED');
        assert.equal(contract.paymentDay, 25);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
        prisma.proposal.updateMany = original.proposalUpdateMany;
        prisma.contract.create = original.contractCreate;
    }
});

test('proposal payment-day update persists on an unlinked proposal', async () => {
    const original = {
        transaction: prisma.$transaction,
        proposalFind: prisma.proposal.findUnique,
        proposalUpdate: prisma.proposal.update
    };
    const proposal = { id: 51, status: 'APPROVED', paymentDay: null, contract: null };
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.proposal.findUnique = async () => proposal;
    prisma.proposal.update = async ({ data }) => Object.assign(proposal, data);
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    try {
        await proposalController.updateProposalPaymentDay({ params: { id: '51' }, body: { paymentDay: 12 } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.proposal.paymentDay, 12);
        assert.equal(proposal.paymentDay, 12);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
        prisma.proposal.update = original.proposalUpdate;
    }
});

test('proposal payment-day update also synchronizes its pending contract', async () => {
    const original = {
        transaction: prisma.$transaction,
        proposalFind: prisma.proposal.findUnique,
        proposalUpdate: prisma.proposal.update,
        contractUpdateMany: prisma.contract.updateMany,
        contractFind: prisma.contract.findUnique
    };
    const contract = { id: 62, proposalId: 61, status: 'PENDING_SIGNATURE', signedAt: null, paymentDay: 25 };
    const proposal = { id: 61, status: 'APPROVED', paymentDay: 25, contract };
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.proposal.findUnique = async () => proposal;
    prisma.proposal.update = async ({ data }) => Object.assign(proposal, data);
    prisma.contract.updateMany = async ({ data }) => {
        Object.assign(contract, data);
        return { count: 1 };
    };
    prisma.contract.findUnique = async () => contract;
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    try {
        await proposalController.updateProposalPaymentDay({ params: { id: '61' }, body: { paymentDay: 18 } }, response);
        assert.equal(response.statusCode, 200);
        assert.equal(proposal.paymentDay, 18);
        assert.equal(contract.paymentDay, 18);
        assert.equal(response.body.contract.paymentDay, 18);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
        prisma.proposal.update = original.proposalUpdate;
        prisma.contract.updateMany = original.contractUpdateMany;
        prisma.contract.findUnique = original.contractFind;
    }
});

test('proposal payment-day update refuses to mutate a signed contract', async () => {
    const original = { transaction: prisma.$transaction, proposalFind: prisma.proposal.findUnique };
    prisma.$transaction = async (callback) => callback(prisma);
    prisma.proposal.findUnique = async () => ({
        id: 71,
        status: 'APPROVED',
        contract: { id: 72, status: 'SIGNED', signedAt: new Date() }
    });
    const response = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    try {
        await proposalController.updateProposalPaymentDay({ params: { id: '71' }, body: { paymentDay: 10 } }, response);
        assert.equal(response.statusCode, 409);
        assert.match(response.body.error, /aditivo/);
    } finally {
        prisma.$transaction = original.transaction;
        prisma.proposal.findUnique = original.proposalFind;
    }
});
