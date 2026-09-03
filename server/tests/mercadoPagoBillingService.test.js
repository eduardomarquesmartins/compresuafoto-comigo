const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBillingPreferencePayload } = require('../services/mercadoPagoBillingService');

test('buildBillingPreferencePayload creates isolated Econti Checkout Pro payload', () => {
    process.env.ECONTI_PUBLIC_URL = 'https://app.econti.test/';
    process.env.ECONTI_BILLING_SERVER_URL = 'https://api.econti.test/';
    const payload = buildBillingPreferencePayload({
        charge: { publicId: 'opaque-id', externalReference: 'econti-billing:opaque-id', amount: '12.50', description: 'Consultoria' },
        client: { name: 'Cliente', email: 'cliente@example.test', document: '123.456.789-00' },
    });
    assert.equal(payload.body.external_reference, 'econti-billing:opaque-id');
    assert.equal(payload.body.items[0].currency_id, 'BRL');
    assert.equal(payload.body.items[0].unit_price, 12.5);
    assert.equal(payload.body.notification_url, 'https://api.econti.test/api/webhooks/mercadopago/billing');
    assert.equal(payload.body.back_urls.success, 'https://app.econti.test/cobranca/opaque-id');
});

test('uses the due date as Checkout Pro expiration at end of Sao Paulo day', () => {
    process.env.ECONTI_PUBLIC_URL = 'https://app.econti.test';
    process.env.ECONTI_BILLING_SERVER_URL = 'https://api.econti.test';
    const payload = buildBillingPreferencePayload({
        charge: { publicId: 'due-id', externalReference: 'ref', amount: 10, description: 'x', dueDate: new Date('2026-04-25T03:00:00.000Z') },
        client: { name: 'Cliente' },
    });
    assert.equal(payload.body.date_of_expiration, '2026-04-25T23:59:59.999-03:00');
});

test('buildBillingPreferencePayload rejects non-positive amounts', () => {
    process.env.ECONTI_PUBLIC_URL = 'https://app.econti.test';
    process.env.ECONTI_BILLING_SERVER_URL = 'https://api.econti.test';
    assert.throws(() => buildBillingPreferencePayload({ charge: { publicId: 'id', externalReference: 'ref', amount: 0, description: 'x' }, client: { name: 'x' } }));
});
