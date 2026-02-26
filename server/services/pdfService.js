const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Logo local — lido do disco
const LOGO_PATH = path.join(__dirname, '../../client/public/logo.png');

const CATEGORY_DESCRIPTIONS = {
    "Social Media": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização.",
    "Social Media + Audiovisual": "Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização, social media, + fotografias, vídeos e drone (uma vez ao mês) + cadastro Google meu negócio.",
    "Tráfego Pago": "Gestão estratégica de anúncios para maximizar alcance, leads e conversões através de plataformas de alta performance.",
    "Audiovisual / Fotos": "Produção de conteúdo visual de alto impacto, incluindo fotografia profissional e vídeos dinâmicos para plataformas digitais.",
    "Artes Adicionais": "Criação de identidades visuais e artes gráficas exclusivas para fortalecer a comunicação da sua marca."
};

const BLUE_ACCENT = '#2563eb';
const SLATE_900 = '#0f172a';
const SLATE_500 = '#64748b';
const SLATE_400 = '#94a3b8';
const SLATE_200 = '#e2e8f0';

// Helper: Desenha Header e Footer nas páginas internas
const drawHeaderFooter = (doc, dateStr) => {
    // --- Header ---
    if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 55, 30, { height: 25 });
    } else {
        doc.fillColor(SLATE_900).fontSize(12).font('Helvetica-Bold')
            .text('& CONTI', 55, 35, { characterSpacing: 2 });
    }

    doc.fillColor(SLATE_400).fontSize(9).font('Helvetica-Bold')
        .text('PROPOSTA COMERCIAL', 0, 38, { align: 'center', characterSpacing: 2 });

    doc.fillColor(SLATE_400).fontSize(8).font('Helvetica')
        .text(dateStr, 55, 38, { align: 'right' });

    doc.strokeColor(SLATE_200).lineWidth(1).moveTo(55, 65).lineTo(doc.page.width - 55, 65).stroke();

    // --- Footer ---
    const footerY = doc.page.height - 45;
    doc.strokeColor(SLATE_200).lineWidth(1).moveTo(55, footerY).lineTo(doc.page.width - 55, footerY).stroke();

    doc.fillColor(BLUE_ACCENT).fontSize(10).font('Helvetica-Bold')
        .text('& CONTI', 0, footerY + 10, { align: 'center', characterSpacing: 4 });

    doc.fillColor(SLATE_400).fontSize(7).font('Helvetica')
        .text('TRANSFORMANDO VISÃO EM RESULTADOS DIGITAIS', 0, footerY + 25, { align: 'center', characterSpacing: 2 });
};

exports.generatePDFBuffer = (clientName, selectedServices, total) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Proposta Comercial - ${clientName}`,
                    Author: '& CONTI'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            const year = new Date().getFullYear();
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // ──────────────────────────────────────────────────────────
            // PAGINA 1: CAPA
            // ──────────────────────────────────────────────────────────
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#000000');
            if (fs.existsSync(LOGO_PATH)) {
                doc.image(LOGO_PATH, doc.page.width / 2 - 130, 80, { width: 260 });
            }
            doc.fillColor('#ffffff').opacity(0.05).fontSize(500).font('Helvetica-Bold')
                .text('&', 0, doc.page.height / 2 - 250, { align: 'center' });
            doc.opacity(1);

            const midY = doc.page.height / 2;
            doc.fillColor(BLUE_ACCENT).rect(doc.page.width / 2 - 60, midY - 60, 120, 4).fill();
            doc.fillColor('#ffffff').fontSize(40).font('Helvetica-Bold')
                .text('PROPOSTA', 0, midY - 20, { align: 'center', characterSpacing: 6 });
            doc.fillColor(BLUE_ACCENT).fontSize(24).font('Helvetica')
                .text('COMERCIAL', 0, midY + 30, { align: 'center', characterSpacing: 12 });

            doc.fillColor(SLATE_400).fontSize(14).font('Helvetica-Bold')
                .text('PREPARADO EXCLUSIVAMENTE PARA:', 0, midY + 150, { align: 'center', characterSpacing: 3 });
            doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold')
                .text(clientName.toUpperCase(), 0, midY + 180, { align: 'center' });

            doc.fillColor(BLUE_ACCENT).fontSize(14).font('Helvetica-Bold')
                .text('& CONTI', 0, doc.page.height - 100, { align: 'center', characterSpacing: 4 });
            doc.fillColor(SLATE_500).fontSize(11).font('Helvetica')
                .text(`${year} \u00A9 MARKETING DIGITAL`, 0, doc.page.height - 80, { align: 'center' });


            // ──────────────────────────────────────────────────────────
            // PAGINA 2: SERVIÇOS
            // ──────────────────────────────────────────────────────────
            doc.addPage({ margin: 55 });
            drawHeaderFooter(doc, dateStr);

            let currentY = 90; // Start right below the header

            doc.fillColor(SLATE_900).fontSize(22).font('Helvetica-Bold')
                .text('Seus Serviços', 55, currentY);
            currentY += 25;

            doc.fillColor(SLATE_500).fontSize(12).font('Helvetica')
                .text('Confira abaixo o detalhamento estratégico do seu projeto.', 55, currentY);
            currentY += 40;

            const groupedServices = selectedServices.reduce((acc, s) => {
                if (!acc[s.category]) acc[s.category] = [];
                acc[s.category].push(s);
                return acc;
            }, {});

            Object.entries(groupedServices).forEach(([category, items]) => {
                // Check if we need a new page for the category title
                if (currentY > doc.page.height - 180) {
                    doc.addPage({ margin: 55 });
                    drawHeaderFooter(doc, dateStr);
                    currentY = 90; // Reset Y right below header
                }

                doc.fillColor(BLUE_ACCENT).rect(55, currentY + 18, 40, 2).fill();
                doc.fillColor(BLUE_ACCENT).fontSize(15).font('Helvetica-Bold')
                    .text(category.toUpperCase(), 55, currentY);
                doc.fillColor(SLATE_200).rect(55, currentY + 22, doc.page.width - 110, 1).fill();
                currentY += 35;

                if (CATEGORY_DESCRIPTIONS[category]) {
                    doc.fillColor(SLATE_500).fontSize(10).font('Helvetica-Oblique')
                        .text(CATEGORY_DESCRIPTIONS[category], 55, currentY, { width: doc.page.width - 110 });
                    currentY += doc.heightOfString(CATEGORY_DESCRIPTIONS[category], { width: doc.page.width - 110 }) + 15;
                }

                items.forEach(item => {
                    // Check if we need a new page for an item
                    if (currentY > doc.page.height - 120) {
                        doc.addPage({ margin: 55 });
                        drawHeaderFooter(doc, dateStr);
                        currentY = 90;
                    }

                    doc.fillColor(SLATE_900).fontSize(13).font('Helvetica-Bold')
                        .text(item.name, 65, currentY);
                    const priceStr = `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    doc.text(priceStr, 55, currentY, { align: 'right' });

                    if (item.description) {
                        currentY += 16;
                        doc.fillColor(SLATE_400).fontSize(10).font('Helvetica')
                            .text(item.description, 65, currentY, { width: doc.page.width - 250 });
                        currentY += doc.heightOfString(item.description, { width: doc.page.width - 250 });
                    }
                    currentY += 15;
                });
                currentY += 15;
            });

            // Resumo do Investimento
            if (currentY > doc.page.height - 180) {
                doc.addPage({ margin: 55 });
                drawHeaderFooter(doc, dateStr);
                currentY = 90;
            }

            const boxWidth = 220;
            const boxX = doc.page.width - 55 - boxWidth;
            doc.fillColor('#f8fafc').rect(boxX, currentY, boxWidth, 70).fill();
            doc.fillColor(BLUE_ACCENT).rect(boxX, currentY, 4, 70).fill();
            doc.fillColor(SLATE_400).fontSize(9).font('Helvetica-Bold')
                .text('INVESTIMENTO TOTAL', boxX + 20, currentY + 18, { characterSpacing: 1.5 });
            const totalStr = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            doc.fillColor(SLATE_900).fontSize(24).font('Helvetica-Bold')
                .text(totalStr, boxX + 20, currentY + 32);


            // ──────────────────────────────────────────────────────────
            // PAGINA 3: FECHAMENTO
            // ──────────────────────────────────────────────────────────
            doc.addPage({ margin: 0 });
            doc.fillColor('#000000').opacity(0.03).fontSize(400).font('Helvetica-Bold')
                .text('&', 0, doc.page.height / 2 - 200, { align: 'center' });
            doc.opacity(1);

            if (fs.existsSync(LOGO_PATH)) {
                // Aumentar o logo e centralizar melhor
                doc.image(LOGO_PATH, doc.page.width / 2 - 75, 60, { width: 150 });
            }

            doc.fillColor(SLATE_900).fontSize(60).font('Helvetica-Bold')
                .text('Obrigado!', 0, midY - 60, { align: 'center' });

            doc.fillColor(BLUE_ACCENT).rect(doc.page.width / 2 - 50, midY + 10, 100, 3).fill();

            doc.fillColor('#f8fafc').rect(doc.page.width / 2 - 130, midY + 70, 260, 50).fill();
            doc.fillColor(SLATE_500).fontSize(11).font('Helvetica-Bold')
                .text('PROPOSTA VÁLIDA POR 30 DIAS', 0, midY + 90, { align: 'center', characterSpacing: 2 });

            doc.fillColor(SLATE_200).rect(doc.page.width / 2 - 100, midY + 170, 200, 1).fill();
            doc.fillColor(SLATE_900).fontSize(15).font('Helvetica-Bold')
                .text('EDUARDA CONTI & FERNANDO', 0, midY + 190, { align: 'center' });
            doc.fillColor(BLUE_ACCENT).fontSize(11).font('Helvetica-Bold')
                .text('CEOs & ESTRATEGISTAS', 0, midY + 210, { align: 'center', characterSpacing: 2 });

            doc.fillColor(SLATE_400).fontSize(9).font('Helvetica')
                .text('TRANSFORMANDO VISÃO EM RESULTADOS DIGITAIS', 0, doc.page.height - 60, { align: 'center', characterSpacing: 3 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

exports.CATEGORY_DESCRIPTIONS = CATEGORY_DESCRIPTIONS;
