const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

const CATEGORY_RULES = [
    { category: 'Impostos', keywords: ['darf', 'simples nacional', 'imposto', 'tributo', 'receita federal', 'iss', 'icms'] },
    { category: 'Marketing', keywords: ['meta ads', 'facebook', 'instagram', 'google ads', 'anuncio', 'ads'] },
    { category: 'Deslocamento', keywords: ['uber', '99app', 'combustivel', 'gasolina', 'posto', 'estacionamento', 'pedagio'] },
    { category: 'Equipamentos', keywords: ['camera', 'lente', 'cartao de memoria', 'notebook', 'hd ', 'ssd', 'equipamento'] },
    { category: 'Infraestrutura', keywords: ['internet', 'energia', 'luz', 'telefone', 'software', 'assinatura', 'hospedagem', 'dominio'] },
    { category: 'Salarios / Equipe', keywords: ['freelancer', 'equipe', 'salario', 'pagamento colaborador', 'diaria'] }
];

const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const parseMoney = (value) => {
    if (!value) return 0;
    const cleaned = String(value)
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

const findAmount = (text) => {
    const normalized = normalizeText(text);
    const lines = normalized.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const priorityWords = ['valor total', 'total geral', 'total r$', 'total', 'valor pago', 'valor a pagar', 'liquido', 'subtotal'];
    const moneyPattern = /(?:r\$\s*)?\d{1,3}(?:[._]\d{3})*(?:,\d{2})|(?:r\$\s*)?\d+(?:[.,]\d{2})/gi;

    for (const word of priorityWords) {
        const line = lines.find(item => item.includes(word) && item.match(moneyPattern));
        if (line) {
            const amounts = line.match(moneyPattern)?.map(parseMoney).filter(Boolean) || [];
            if (amounts.length) return amounts.sort((a, b) => b - a)[0];
        }
    }

    const allAmounts = normalized.match(moneyPattern)?.map(parseMoney).filter(value => value > 0) || [];
    return allAmounts.sort((a, b) => b - a)[0] || 0;
};

const findDate = (text) => {
    const source = String(text || '');
    const isoMatch = source.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;

    const brMatch = source.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/);
    if (brMatch) return `${brMatch[3]}-${String(brMatch[2]).padStart(2, '0')}-${String(brMatch[1]).padStart(2, '0')}`;

    return new Date().toISOString().split('T')[0];
};

const inferCategory = (text) => {
    const normalized = normalizeText(text);
    const match = CATEGORY_RULES.find(rule => rule.keywords.some(keyword => normalized.includes(normalizeText(keyword))));
    return match?.category || 'Outros';
};

const inferVendor = (text, originalName) => {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length >= 3 && !/^\d+$/.test(line));

    const ignored = ['danfe', 'nf-e', 'nfc-e', 'nota fiscal', 'documento auxiliar', 'cupom fiscal'];
    const vendorLine = lines.find(line => !ignored.some(word => normalizeText(line).includes(word)));

    return vendorLine || String(originalName || 'nota').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
};

const extractPdfText = async (filePath) => {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
};

const extractImageText = async (filePath) => {
    const imageBuffer = await sharp(filePath)
        .rotate()
        .grayscale()
        .normalize()
        .resize({ width: 1800, withoutEnlargement: true })
        .png()
        .toBuffer();

    const worker = await createWorker('por+eng', 1, {
        cachePath: path.join(__dirname, '../uploads/tesseract-cache')
    });
    try {
        const result = await worker.recognize(imageBuffer);
        return result.data.text || '';
    } finally {
        await worker.terminate();
    }
};

exports.readFinancialNote = async (file) => {
    const isPdf = file.mimetype === 'application/pdf';
    const text = isPdf ? await extractPdfText(file.path) : await extractImageText(file.path);
    const amount = findAmount(text);
    const date = findDate(text);
    const category = inferCategory(text);
    const vendor = inferVendor(text, file.originalname);

    return {
        amount,
        date,
        category,
        vendor,
        description: `Nota de custo - ${vendor}`.slice(0, 180),
        extractedText: text.slice(0, 6000),
        confidence: amount ? 'AUTO' : 'NEEDS_REVIEW',
        source: isPdf ? 'PDF_TEXT' : 'IMAGE_OCR'
    };
};
