const PDFDocument = require('pdfkit');
const fs = require('fs');
const { PDFDocument: PdfLibDocument } = require('pdf-lib');

const PAGE_LEFT = 48;
const PAGE_WIDTH = 499;
const BLUE = '#0f4cdd';
const TEXT = '#101828';
const MUTED = '#475467';
const LINE = '#d0d5dd';
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const clean = (value) => String(value || '').replace(/[\r\n]+/g, ' ').trim();
const periodLabel = (competence) => new Date(`${competence}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const fullText = (doc, text, options = {}) => {
    doc.x = PAGE_LEFT;
    doc.text(text, PAGE_LEFT, doc.y, { width: PAGE_WIDTH, ...options });
    doc.x = PAGE_LEFT;
};

const section = (doc, title, paragraphs) => {
    doc.moveDown(0.85).font('Helvetica-Bold').fontSize(10).fillColor(TEXT);
    fullText(doc, title);
    paragraphs.forEach((paragraph) => {
        doc.moveDown(0.3).font('Helvetica').fontSize(9.5).fillColor(TEXT);
        fullText(doc, paragraph, { align: 'justify', lineGap: 2 });
    });
};

const footer = (doc) => {
    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page += 1) {
        doc.switchToPage(page);
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
            .text(`&CONTI Marketing Digital - Anexo I - Pagina ${page + 1} de ${pages.count}`, PAGE_LEFT, 802, { width: PAGE_WIDTH, align: 'center' });
    }
};

const buildAnnex = ({ collaborator, competence, completions, additionalClauses, closingDate }) => new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_LEFT, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const name = clean(collaborator.fullName || collaborator.name || collaborator.email);
    const period = periodLabel(competence);
    const total = completions.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);

    doc.font('Helvetica-Bold').fontSize(14).fillColor(BLUE);
    fullText(doc, '&CONTI', { characterSpacing: 1.2 });
    doc.moveDown(0.45).fontSize(18).fillColor(TEXT);
    fullText(doc, 'ANEXO I - FECHAMENTO MENSAL DE SERVICOS');
    doc.moveDown(0.35).font('Helvetica').fontSize(10).fillColor(MUTED);
    fullText(doc, `Competencia: ${period.charAt(0).toUpperCase() + period.slice(1)}`);
    doc.moveDown(0.9).strokeColor(LINE).moveTo(PAGE_LEFT, doc.y).lineTo(PAGE_LEFT + PAGE_WIDTH, doc.y).stroke();

    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(10).fillColor(TEXT); fullText(doc, 'PARTES');
    doc.moveDown(0.3).font('Helvetica').fontSize(9.5); fullText(doc, 'CONTRATANTE: &CONTI MARKETING DIGITAL, doravante denominada CONTRATANTE.');
    doc.moveDown(0.2); fullText(doc, `CONTRATADO(A): ${name}, e-mail ${clean(collaborator.email)}.`);

    section(doc, '1. SERVICOS DA COMPETENCIA', [
        `Este anexo registra os servicos realizados pelo(a) CONTRATADO(A) na competencia de ${period}, vinculado ao contrato-base firmado entre as partes.`,
        'Os itens, quantidades e valores desta competencia sao os seguintes:'
    ]);

    const columns = { service: 56, quantity: 278, unit: 345, total: 438 };
    const header = () => {
        const y = doc.y + 8;
        doc.rect(PAGE_LEFT, y, PAGE_WIDTH, 24).fill(BLUE);
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        doc.text('SERVICO', columns.service, y + 8, { width: 200 });
        doc.text('QTD.', columns.quantity, y + 8, { width: 50, align: 'center' });
        doc.text('UNITARIO', columns.unit, y + 8, { width: 80, align: 'right' });
        doc.text('TOTAL', columns.total, y + 8, { width: 100, align: 'right' });
        doc.y = y + 24; doc.x = PAGE_LEFT;
    };
    header();
    completions.forEach((item, index) => {
        const service = clean(item.service?.name || 'Servico');
        const height = Math.max(25, 14 + Math.ceil(service.length / 38) * 10);
        if (doc.y + height > 750) { doc.addPage(); header(); }
        const y = doc.y;
        doc.rect(PAGE_LEFT, y, PAGE_WIDTH, height).fill(index % 2 ? '#f8fafc' : '#ffffff').strokeColor(LINE).stroke();
        doc.fillColor(TEXT).font('Helvetica').fontSize(8.5);
        doc.text(service, columns.service, y + 7, { width: 200 });
        doc.text(String(item.quantity), columns.quantity, y + 7, { width: 50, align: 'center' });
        doc.text(money(item.unitValue), columns.unit, y + 7, { width: 80, align: 'right' });
        doc.text(money(item.totalValue), columns.total, y + 7, { width: 100, align: 'right' });
        doc.y = y + height; doc.x = PAGE_LEFT;
    });
    doc.moveDown(0.45).font('Helvetica-Bold').fontSize(11).fillColor(TEXT);
    fullText(doc, `TOTAL DA COMPETENCIA: ${money(total)}`, { align: 'right' });

    section(doc, '2. REMUNERACAO E PAGAMENTO', [
        `Pelos servicos listados, a CONTRATANTE pagara ao(à) CONTRATADO(A) o valor total de ${money(total)}, conforme a forma e data de pagamento acordadas entre as partes.`,
        'Os valores foram calculados conforme o catalogo individual e as quantidades registradas nesta competencia.'
    ]);
    section(doc, '3. VINCULACAO AO CONTRATO-BASE', [
        'Este anexo complementa o contrato-base, sem substitui-lo. Todas as clausulas, responsabilidades e condicoes do documento original permanecem validas.',
        'O(A) CONTRATADO(A) declara que os servicos relacionados foram realizados ou aprovados para a competencia indicada.'
    ]);
    if (clean(additionalClauses)) section(doc, '4. OBSERVACOES ADICIONAIS', [clean(additionalClauses)]);

    if (doc.y > 660) doc.addPage();
    const contractDate = /^\d{4}-\d{2}-\d{2}$/.test(String(closingDate || ''))
        ? new Date(`${closingDate}T12:00:00`).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
    doc.moveDown(2).font('Helvetica').fontSize(9.5).fillColor(MUTED);
    fullText(doc, `Viamao/RS, ${contractDate}.`, { align: 'center' });
    doc.moveDown(3.5).strokeColor(LINE).moveTo(75, doc.y).lineTo(280, doc.y).stroke().moveTo(320, doc.y).lineTo(525, doc.y).stroke();
    doc.moveDown(0.35).font('Helvetica').fontSize(8.5).fillColor(MUTED);
    const signatureY = doc.y;
    doc.text('&CONTI MARKETING DIGITAL', 75, signatureY, { width: 205, align: 'center' });
    doc.text(name, 320, signatureY, { width: 205, align: 'center' });
    footer(doc);
    doc.end();
});

exports.generateMonthlyContractBuffer = async ({ baseContractPath, ...data }) => {
    const annexBuffer = await buildAnnex(data);
    if (!baseContractPath || !fs.existsSync(baseContractPath)) return annexBuffer;
    const [base, annex] = await Promise.all([PdfLibDocument.load(fs.readFileSync(baseContractPath)), PdfLibDocument.load(annexBuffer)]);
    const merged = await PdfLibDocument.create();
    (await merged.copyPages(base, base.getPageIndices())).forEach((page) => merged.addPage(page));
    (await merged.copyPages(annex, annex.getPageIndices())).forEach((page) => merged.addPage(page));
    return Buffer.from(await merged.save());
};
