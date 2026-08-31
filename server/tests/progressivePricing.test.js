const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateProgressiveTotal } = require('../services/progressivePricing');

test('calcula cada faixa de preço progressivo', () => {
    assert.deepEqual(calculateProgressiveTotal(2), { pricePerPhoto: 20, total: 40 });
    assert.deepEqual(calculateProgressiveTotal(5), { pricePerPhoto: 15, total: 75 });
    assert.deepEqual(calculateProgressiveTotal(10), { pricePerPhoto: 10, total: 100 });
    assert.deepEqual(calculateProgressiveTotal(26), { pricePerPhoto: 9, total: 234 });
});
