const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const competenceName = (competence) => {
    const [year, month] = competence.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

exports.generateReceiptBuffer = ({ collaborator, competence, completions }) => new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margin: 52 });
    const chunks = [];
    pdf.on('data', chunk => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const name = collaborator.fullName || collaborator.name || 'Colaborador';
    const total = completions.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
    const logoPath = path.join(__dirname, '..', '..', 'client', 'public', 'logo.png');
    if (fs.existsSync(logoPath)) pdf.image(logoPath, 215, 45, { fit: [165, 54] });
    pdf.fillColor('#111111').font('Helvetica-Bold').fontSize(20).text('RECIBO DE SERVICOS', 52, 118);
    pdf.moveDown(.35).fillColor('#666666').font('Helvetica').fontSize(10).text(`Competencia: ${competenceName(competence)}`);
    pdf.moveDown(1.6).fillColor('#111111').fontSize(11).text(`Recebi da & CONTI MARKETING DIGITAL os valores referentes aos servicos realizados por ${name}.`);
    pdf.moveDown(1.7);
    const left = 52, right = 543, columns = { service: 60, quantity: 340, unit: 402, total: 480 };
    let y = pdf.y;
    const header = () => {
        pdf.fillColor('#111111').rect(left, y, right - left, 24).fill();
        pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        pdf.text('SERVICO', columns.service, y + 8, { width: 265 });
        pdf.text('QTD.', columns.quantity, y + 8, { width: 45, align: 'right' });
        pdf.text('UNITARIO', columns.unit, y + 8, { width: 66, align: 'right' });
        pdf.text('TOTAL', columns.total, y + 8, { width: 55, align: 'right' });
        y += 24;
    };
    header();
    completions.forEach((item, index) => {
        const height = 32;
        if (y + height > 700) { pdf.addPage(); y = 52; header(); }
        if (index % 2 === 0) pdf.fillColor('#F5F5F5').rect(left, y, right - left, height).fill();
        pdf.fillColor('#111111').font('Helvetica').fontSize(9);
        pdf.text(item.service.name, columns.service, y + 11, { width: 255, ellipsis: true });
        pdf.text(String(item.quantity), columns.quantity, y + 11, { width: 45, align: 'right' });
        pdf.text(money(item.unitValue), columns.unit, y + 11, { width: 66, align: 'right' });
        pdf.font('Helvetica-Bold').text(money(item.totalValue), columns.total, y + 11, { width: 55, align: 'right' });
        y += height;
    });
    pdf.strokeColor('#111111').moveTo(left, y).lineTo(right, y).stroke();
    y += 16;
    pdf.fillColor('#111111').font('Helvetica-Bold').fontSize(13).text(`TOTAL RECEBIDO: ${money(total)}`, left, y, { width: right - left, align: 'right' });
    y += 85;
    pdf.strokeColor('#333333').moveTo(150, y).lineTo(445, y).stroke();
    pdf.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(name, 150, y + 8, { width: 295, align: 'center' });
    pdf.font('Helvetica').fontSize(9).text('Assinatura do colaborador', 150, y + 22, { width: 295, align: 'center' });
    pdf.end();
});
