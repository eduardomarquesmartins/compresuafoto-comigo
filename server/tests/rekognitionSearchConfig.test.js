const test = require('node:test');
const assert = require('node:assert/strict');

const { createSearchFacesByImageInput } = require('../services/rekognition');

test('busca rostos suficientes antes de filtrar as fotos pelo evento', () => {
    const input = createSearchFacesByImageInput(Buffer.from('selfie'));

    assert.equal(input.FaceMatchThreshold, 80);
    assert.ok(input.MaxFaces >= 200);
});
