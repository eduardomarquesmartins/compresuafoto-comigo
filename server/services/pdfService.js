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
            // Background Preto
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#000000');

            // Logo Centralizado
            if (fs.existsSync(LOGO_PATH)) {
                doc.image(LOGO_PATH, doc.page.width / 2 - 130, 80, { width: 260 });
            }

            // Marca d'água "&" gigante
            doc.fillColor('#ffffff').opacity(0.05)
                .fontSize(500).font('Helvetica-Bold')
                .text('&', 0, doc.page.height / 2 - 250, { align: 'center' });
            doc.opacity(1);

            // Conteúdo Central
            const midY = doc.page.height / 2;
            doc.fillColor(BLUE_ACCENT).rect(doc.page.width / 2 - 60, midY - 60, 120, 4).fill();

            doc.fillColor('#ffffff').fontSize(40).font('Helvetica-Bold')
                .text('PROPOSTA', 0, midY - 20, { align: 'center', characterSpacing: 6 });

            doc.fillColor(BLUE_ACCENT).fontSize(24).font('Helvetica')
                .text('COMERCIAL', 0, midY + 30, { align: 'center', characterSpacing: 12 });

            // Cliente
            doc.fillColor(SLATE_400).fontSize(14).font('Helvetica-Bold')
                .text('PREPARADO EXCLUSIVAMENTE PARA:', 0, midY + 150, { align: 'center', characterSpacing: 3 });

            doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold')
                .text(clientName.toUpperCase(), 0, midY + 180, { align: 'center' });

            // Rodapé Capa
            doc.fillColor(BLUE_ACCENT).fontSize(14).font('Helvetica-Bold')
                .text('& CONTI', 0, doc.page.height - 100, { align: 'center', characterSpacing: 4 });
            doc.fillColor(SLATE_500).fontSize(11).font('Helvetica')
                .text(`${year} \u00A9 MARKETING DIGITAL`, 0, doc.page.height - 80, { align: 'center' });


            // ──────────────────────────────────────────────────────────
            // PAGINA 2: SERVIÇOS
            // ──────────────────────────────────────────────────────────
            doc.addPage({ margin: 55 });

            // Header Pequeno (Top Right)
            doc.fillColor(SLATE_900).fontSize(24).font('Helvetica-Bold')
                .text('Seus Serviços', 55, 60);
            doc.fillColor(SLATE_500).fontSize(14).font('Helvetica')
                .text('Confira abaixo o detalhamento estratégico do seu projeto.', 55, 95);

            let currentY = 150;

            const groupedServices = selectedServices.reduce((acc, s) => {
                if (!acc[s.category]) acc[s.category] = [];
                acc[s.category].push(s);
                return acc;
            }, {});

            Object.entries(groupedServices).forEach(([category, items]) => {
                // Verificar espaço na página
                if (currentY > doc.page.height - 150) {
                    doc.addPage({ margin: 55 });
                    currentY = 60;
                }

                // Categoria
                doc.fillColor(BLUE_ACCENT).rect(55, currentY + 18, 55, 2).fill(); // Pequena linha blue underline (fake)
                doc.fillColor(BLUE_ACCENT).fontSize(16).font('Helvetica-Bold')
                    .text(category.toUpperCase(), 55, currentY);

                doc.fillColor('#000000').rect(55, currentY + 22, doc.page.width - 110, 1.5).fill();
                currentY += 35;

                // Descrição da Categoria
                if (CATEGORY_DESCRIPTIONS[category]) {
                    doc.fillColor(SLATE_500).fontSize(11).font('Helvetica-Oblique')
                        .text(CATEGORY_DESCRIPTIONS[category], 55, currentY, { width: doc.page.width - 110 });
                    currentY += doc.heightOfString(CATEGORY_DESCRIPTIONS[category], { width: doc.page.width - 110 }) + 15;
                }

                // Itens
                items.forEach(item => {
                    doc.fillColor(SLATE_900).fontSize(14).font('Helvetica-Bold')
                        .text(item.name, 65, currentY);

                    const priceStr = `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    doc.text(priceStr, 55, currentY, { align: 'right' });

                    if (item.description) {
                        currentY += 18;
                        doc.fillColor(SLATE_400).fontSize(11).font('Helvetica')
                            .text(item.description, 65, currentY, { width: doc.page.width - 250 });
                        currentY += doc.heightOfString(item.description, { width: doc.page.width - 250 });
                    }
                    currentY += 15;
                });

                currentY += 20;
            });

            // Resumo do Investimento
            if (currentY > doc.page.height - 120) {
                doc.addPage({ margin: 55 });
                currentY = 60;
            }

            const boxWidth = 250;
            const boxX = doc.page.width - 55 - boxWidth;
            doc.fillColor('#f8fafc').rect(boxX, currentY, boxWidth, 80).fill();
            doc.fillColor(BLUE_ACCENT).rect(boxX, currentY, 4, 80).fill();

            doc.fillColor(SLATE_400).fontSize(10).font('Helvetica-Bold')
                .text('INVESTIMENTO TOTAL', boxX + 25, currentY + 20, { characterSpacing: 2 });

            const totalStr = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            doc.fillColor(SLATE_900).fontSize(26).font('Helvetica-Bold')
                .text(totalStr, boxX + 25, currentY + 38);


            // ──────────────────────────────────────────────────────────
            // PAGINA 3: FECHAMENTO
            // ──────────────────────────────────────────────────────────
            doc.addPage({ margin: 0 });

            // Marca d'água "&" no fundo
            doc.fillColor('#000000').opacity(0.03)
                .fontSize(400).font('Helvetica-Bold')
                .text('&', 0, doc.page.height / 2 - 200, { align: 'center' });
            doc.opacity(1);

            // Logo
            if (fs.existsSync(LOGO_PATH)) {
                doc.image(LOGO_PATH, doc.page.width / 2 - 40, 80, { height: 60 });
            }

            // Mensagem
            doc.fillColor(SLATE_900).fontSize(70).font('Helvetica')
                .text('Obrigado!', 0, midY - 100, { align: 'center' });

            doc.fillColor(BLUE_ACCENT).rect(doc.page.width / 2 - 60, midY - 10, 120, 4).fill();

            // Validade
            doc.fillColor('#f8fafc').rect(doc.page.width / 2 - 150, midY + 60, 300, 60).fill();
            doc.fillColor(SLATE_500).fontSize(13).font('Helvetica-Bold')
                .text('PROPOSTA VÁLIDA POR 30 DIAS', 0, midY + 85, { align: 'center', characterSpacing: 3 });

            // Assinatura
            doc.fillColor(SLATE_200).rect(doc.page.width / 2 - 125, midY + 180, 250, 1).fill();
            doc.fillColor(SLATE_900).fontSize(16).font('Helvetica-Bold')
                .text('EDUARDA CONTI & FERNANDO', 0, midY + 200, { align: 'center', characterSpacing: 1 });
            doc.fillColor(BLUE_ACCENT).fontSize(12).font('Helvetica-Bold')
                .text('CEOs & ESTRATEGISTAS', 0, midY + 225, { align: 'center', characterSpacing: 3 });

            // Slogan final
            doc.fillColor(SLATE_400).fontSize(10).font('Helvetica')
                .text('TRANSFORMANDO VISÃO EM RESULTADOS DIGITAIS', 0, doc.page.height - 80, { align: 'center', characterSpacing: 4 });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

exports.CATEGORY_DESCRIPTIONS = CATEGORY_DESCRIPTIONS;
