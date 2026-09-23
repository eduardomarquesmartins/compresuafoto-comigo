const test = require('node:test');
const assert = require('node:assert/strict');

const { generatePDFBuffer } = require('../services/pdfService');

const longName = 'Tipo de proposta: empresarial. Plano contratado: Pacote 03 + Audiovisual. Quantidade de postagens: 3 postagens semanais para Instagram/Facebook. Gestão de tráfego pago (Meta Ads): não. Audiovisual incluso no plano: sim. Serviços contratados: Pacote 03 + Audiovisual (Social Media + Audiovisual).';

test('nomes longos não invadem o preço nem as linhas seguintes', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const buffer = await generatePDFBuffer('Cliente Teste', [
        { category: 'Contrato Convertido', name: longName, price: 500, description: 'Descrição adicional do contrato convertido.' },
        { category: 'Contrato Convertido', name: 'Serviço seguinte', price: 100 }
    ], 600);
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
    try {
        const page = await pdf.getPage(2);
        const { items } = await page.getTextContent();
        const text = items.filter(item => item.str.trim());
        const price = text.find(item => item.str.includes('R$ 500,00'));
        assert.ok(price, 'o preço do serviço deve aparecer na página de serviços');

        const start = text.findIndex(item => item.str.includes('Tipo de proposta:'));
        assert.ok(start >= 0, 'o nome longo deve aparecer na página de serviços');
        const description = text.findIndex(item => item.str.includes('Descrição adicional'));
        assert.ok(description > start, 'a descrição deve vir após o nome');
        const nameLines = text.slice(start, description).filter(item => item.str.trim() && !item.str.includes('R$'));
        assert.ok(nameLines.length > 1, 'o nome deve ocupar múltiplas linhas');

        for (const line of nameLines) {
            const sameBaseline = Math.abs(line.transform[5] - price.transform[5]) < 2;
            const horizontalOverlap = line.transform[4] < price.transform[4] + price.width &&
                price.transform[4] < line.transform[4] + line.width;
            assert.ok(!sameBaseline || !horizontalOverlap, `nome "${line.str}" sobrepõe o preço`);
        }

        const following = text.find(item => item.str.includes('Serviço seguinte'));
        assert.ok(following, 'o serviço seguinte deve aparecer');
        const linesInOrder = [...nameLines, text[description], following];
        for (let i = 1; i < linesInOrder.length; i++) {
            const previous = linesInOrder[i - 1];
            const next = linesInOrder[i];
            assert.ok(previous.transform[5] - next.transform[5] >= next.height - 2,
                `linha "${next.str}" colide verticalmente com "${previous.str}"`);
        }
    } finally {
        await pdf.destroy();
    }
});
