const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOrderPreferencePayload } = require('../services/mercadoPagoCheckout');

test('reabre o checkout no mesmo pedido pendente', () => {
    const payload = buildOrderPreferencePayload({
        orderReference: 'pedido-publico-123',
        eventName: 'Evento de teste',
        total: 40,
        clientUrl: 'https://www.econticomigo.com.br/compresuafoto/',
        serverUrl: 'https://compresuafoto-comigo.onrender.com/',
    });

    assert.equal(payload.body.external_reference, 'pedido-publico-123');
    assert.equal(payload.body.items[0].unit_price, 40);
    assert.equal(payload.body.items[0].title, 'Fotos - Evento de teste');
    assert.equal(payload.body.notification_url, 'https://compresuafoto-comigo.onrender.com/api/webhooks/mercadopago');
    assert.equal(payload.body.back_urls.success, 'https://www.econticomigo.com.br/compresuafoto/orders/success');
});
