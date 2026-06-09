const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../../client/public/logo.png');
const CONTI_SIGNATURE_PATH = path.join(__dirname, '../assets/conti-signature.png');

const BLUE = '#2563eb';
const NAVY = '#172b49';
const TEXT = '#111827';
const MUTED = '#64748b';
const LIGHT = '#e5e7eb';

const formatCurrency = (value) => {
    const number = Number(value || 0);
    return number.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
};

const formatDuration = (durationMonths) => {
    const value = String(durationMonths || '6').trim();
    return `${value} (${value}) meses`;
};

const sanitize = (value, fallback = '') => String(value || fallback).trim();

const getDocumentLabel = (value) => {
    const digits = sanitize(value).replace(/\D/g, '');
    return digits.length <= 11 ? 'CPF' : 'CNPJ';
};

const buildClauses = (data) => {
    const scope = sanitize(data.scope, 'gestão de redes sociais e serviços de marketing digital conforme proposta aprovada pelas partes');
    const monthlyValue = formatCurrency(data.monthlyValue);
    const duration = formatDuration(data.durationMonths);
    const durationRaw = sanitize(data.durationMonths, '6');
    const paymentDay = sanitize(data.paymentDay, '25');

    return [
        {
            title: '1 - OBJETO',
            paragraphs: [
                `1.1. O presente contrato tem por objeto a prestação de serviços de ${scope}.`
            ]
        },
        {
            title: '2 - OBRIGAÇÕES DA CONTRATADA',
            paragraphs: [
                '2.1. A CONTRATADA prestará os serviços contratados com técnica, qualidade e dentro dos padrões profissionais de marketing digital, cumprindo o escopo estabelecido no presente contrato.',
                '2.2. A CONTRATADA disponibilizará à CONTRATANTE os sistemas organizacionais utilizados pela empresa, tais como Trello, Asaas e Google Forms, não sendo responsável por falhas, instabilidades ou limitações das plataformas de terceiros.',
                '2.3. A CONTRATADA compromete-se a realizar o atendimento e suporte digital de segunda a sexta-feira, das 09h às 18h, por meio dos canais oficiais de comunicação: WhatsApp comercial, e-mail e Trello.',
                '2.4. A CONTRATADA realizará o planejamento, criação, revisão e publicação das postagens conforme o plano contratado pela CONTRATANTE, respeitando as quantidades e formatos definidos no escopo.',
                '2.5. A CONTRATADA enviará mensalmente a Pesquisa de Conteúdo via Google Forms, que deverá ser preenchida pela CONTRATANTE para definição das postagens do mês subsequente. Conteúdos não solicitados dentro do prazo previsto não serão produzidos naquele mês.',
                '2.6. A CONTRATADA compromete-se a programar e executar as postagens nos dias acordados, desde que o material e as aprovações necessárias tenham sido enviados pela CONTRATANTE dentro dos prazos estabelecidos.',
                '2.7. A CONTRATADA compromete-se a manter sigilo absoluto sobre qualquer informação estratégica, dados internos, conversas, materiais ou conteúdos fornecidos pela CONTRATANTE, não podendo divulgá-los a terceiros sem autorização expressa.',
                '2.8. A CONTRATADA permitirá até 2 (duas) alterações por arte, card, texto ou material enviado para aprovação. A partir da 3ª alteração, poderá ser cobrada taxa adicional correspondente a 5% do valor mensal do plano ou R$ 30,00 por alteração.',
                '2.9. Solicitações feitas com menos de 48 horas úteis de antecedência poderão ter taxas entre R$ 30,00 e R$ 50,00 por card ou peça solicitada, conforme complexidade.',
                '2.10. A CONTRATADA não se responsabiliza por atrasos, falhas, instabilidades ou limitações das plataformas Instagram, Facebook, WhatsApp, Meta Business, Trello, Asaas ou qualquer outro sistema de terceiros utilizado para execução dos serviços.',
                '2.11. Reuniões de alinhamento serão realizadas conforme necessidade identificada pela CONTRATADA ou solicitada pela CONTRATANTE, não havendo periodicidade mínima obrigatória.'
            ]
        },
        {
            title: '3 - OBRIGAÇÕES DA CONTRATANTE',
            paragraphs: [
                '3.1. A CONTRATANTE deverá fornecer todas as informações, materiais, fotos, vídeos, textos, logotipos, senhas e demais recursos necessários para a execução dos serviços dentro dos prazos solicitados pela CONTRATADA.',
                `3.2. A CONTRATANTE se compromete a realizar o pagamento do valor mensal contratado na data de vencimento do dia ${paymentDay} de cada mês, através das formas disponibilizadas pela CONTRATADA.`,
                '3.3. A CONTRATANTE deverá responder a Pesquisa de Conteúdo mensal enviada via Google Forms pela CONTRATADA, no prazo determinado, para viabilizar a organização das postagens do mês subsequente.',
                '3.4. A CONTRATANTE é responsável por revisar, aprovar ou solicitar ajustes nos materiais enviados pela CONTRATADA dentro do prazo informado. Caso não haja retorno, a CONTRATADA poderá considerar o material como aprovado para publicação.',
                '3.5. A CONTRATANTE deverá comunicar com antecedência mínima de 48 horas úteis qualquer alteração de pauta, solicitação extra ou demanda urgente, estando ciente de que pedidos fora desse prazo poderão gerar taxas adicionais.',
                '3.6. A CONTRATANTE deverá manter, no grupo de WhatsApp e no Trello disponibilizados pela CONTRATADA, um representante responsável pelas comunicações e aprovações oficiais.',
                '3.7. É de responsabilidade da CONTRATANTE garantir que todas as informações fornecidas à CONTRATADA sejam verdadeiras, atualizadas e condizentes com a realidade da empresa.',
                '3.8. A CONTRATANTE compromete-se a disponibilizar acesso às redes sociais e demais plataformas necessárias, enviando logins, senhas e permissões quando solicitado.',
                '3.9. A CONTRATANTE declara estar ciente de que conteúdos não solicitados dentro do prazo da Pesquisa Mensal não serão produzidos no mês corrente.',
                '3.10. O valor investido em anúncios não está incluso na mensalidade, sendo de responsabilidade da CONTRATANTE.',
                '3.11. A CONTRATANTE não poderá exigir da CONTRATADA serviços não previstos no escopo contratado, salvo contratação adicional.'
            ]
        },
        {
            title: '4 - PAUTA E IDENTIDADE VISUAL',
            paragraphs: [
                '4.1. Caso a CONTRATANTE já possua Identidade Visual, a CONTRATADA seguirá tais diretrizes no desenvolvimento das artes e postagens.',
                '4.2. Caso a CONTRATANTE não possua Identidade Visual definida, deverá informar suas preferências de cores, estilos e referências no início da contratação.',
                '4.3. A CONTRATANTE deverá encaminhar, no prazo máximo de 7 (sete) dias úteis após a assinatura deste contrato, todas as informações necessárias para início do projeto.',
                '4.4. Após o recebimento de todas as informações e materiais necessários, a CONTRATADA terá o prazo de até 7 (sete) dias úteis para elaborar a estratégia de pauta e organização do mês.',
                '4.5. Todo material adicional que não esteja incluído no escopo deverá ser previamente acordado com a CONTRATADA e poderá gerar cobrança extra.',
                '4.6. O não envio das informações dentro dos prazos estabelecidos poderá atrasar o início das publicações, não gerando compensação, reposição ou direito a postagens retroativas.',
                '4.7. Mudanças significativas na Identidade Visual após a definição da pauta poderão gerar retrabalho e custos adicionais.',
                '4.8. A CONTRATADA não se responsabiliza pela baixa qualidade de fotos ou vídeos enviados pela CONTRATANTE.'
            ]
        },
        {
            title: '5 - AUDIOVISUAL',
            paragraphs: [
                '5.1. Os serviços de gravação de conteúdo audiovisual estarão incluídos apenas quando especificados no escopo do plano.',
                '5.2. Caso a CONTRATANTE deseje contratar gravação de conteúdo presencial, fotografia profissional, captação de vídeos, reels, depoimentos, eventos ou similares, deverá solicitar orçamento separado à CONTRATADA.',
                '5.3. Para solicitações de gravação fora da cidade de atuação da CONTRATADA ou em locais que demandem deslocamento significativo, serão cobrados adicionalmente deslocamento, alimentação, transporte de equipamentos e, se necessário, hospedagem.',
                '5.4. A CONTRATADA somente realizará gravações mediante agendamento prévio e disponibilidade na agenda de audiovisual da equipe.',
                '5.5. Gravações extras ao longo do mês serão cobradas separadamente, conforme tabela de audiovisual vigente.',
                '5.6. A CONTRATADA não se responsabiliza por alterações climáticas, eventos externos ou fatores de força maior que impeçam a realização de gravações, podendo remarcar conforme disponibilidade.'
            ]
        },
        {
            title: '6 - PAGAMENTO',
            paragraphs: [
                `6.1. O valor mensal do presente contrato é de ${monthlyValue}, correspondente ao plano contratado pela CONTRATANTE, com vigência de ${duration}.`,
                `6.2. O pagamento será realizado todo dia ${paymentDay} de cada mês, por meio de cobrança automática emitida pelo sistema Asaas, ou, em alternativa, via Pix para a chave 30.795.540/0001-70.`,
                '6.3. O não pagamento na data de vencimento acarretará multa de 2%, juros de 1% ao mês, correção monetária pelo IPCA acumulado do período, taxa administrativa de R$ 50,00 por reativação do serviço, suspensão dos serviços a partir do 3º dia de atraso e rescisão automática após 30 dias de inadimplência.',
                '6.4. Durante o período de suspensão por atraso, não haverá reposição retroativa de postagens, programação, artes, suporte de WhatsApp ou acesso ao Trello.',
                '6.5. A falta de pagamento por período superior a 30 (trinta) dias autoriza a CONTRATADA a rescindir o contrato imediatamente, aplicando-se a multa prevista na cláusula de fidelidade.',
                '6.6. Solicitações de urgência realizadas com menos de 48 horas úteis poderão gerar cobrança adicional, conforme tabela vigente.'
            ]
        },
        {
            title: '7 - PRAZO E FIDELIDADE',
            paragraphs: [
                `7.1. O presente contrato terá vigência inicial de ${duration}, a contar da data de início dos serviços.`,
                `7.2. Ao término do período inicial, o contrato será renovado automaticamente por mais ${durationRaw} meses, mantendo-se o valor mensal de ${monthlyValue}, salvo manifestação expressa da CONTRATANTE em sentido contrário, com antecedência mínima de 30 (trinta) dias antes do término do período.`,
                `7.3. Após o primeiro ciclo de ${Number(durationRaw || 6) * 2 || 12} meses, o contrato seguirá sendo renovado automaticamente por períodos sucessivos de ${durationRaw} meses, obedecendo as mesmas condições e prazos de aviso prévio.`,
                '7.4. A cada período completo de 12 (doze) meses de contrato, o valor mensal será reajustado automaticamente com base no IGP-M/FGV, ou índice oficial que vier a substituí-lo. Caso o índice seja negativo, aplica-se reajuste zero.'
            ]
        },
        {
            title: '8 - DISPOSIÇÕES GERAIS',
            paragraphs: [
                '8.1. Todo o conteúdo criado, desenvolvido e entregue pela CONTRATADA para a CONTRATANTE passa a ser de uso exclusivo da CONTRATANTE após a quitação da mensalidade correspondente ao período.',
                '8.2. Todas as informações fornecidas pela CONTRATANTE à CONTRATADA serão tratadas como informações confidenciais.',
                '8.3. A CONTRATADA não se responsabiliza por falhas, instabilidades ou limitações das plataformas de terceiros utilizadas na execução do serviço.',
                '8.4. A CONTRATADA não se responsabiliza por bloqueios, quedas, instabilidades, limitações de alcance, mudanças de algoritmo ou remoção de conteúdo por parte das plataformas de redes sociais.',
                '8.5. A CONTRATADA não poderá ser responsabilizada por atrasos ou prejuízos decorrentes de falta de envio de informações, imagens, vídeos, textos ou aprovações pela CONTRATANTE.',
                '8.6. A divulgação deste contrato ou de qualquer comunicação interna só poderá ser realizada pela CONTRATANTE mediante autorização prévia.',
                '8.7. A CONTRATADA não estabelece vínculo empregatício com nenhum colaborador da CONTRATANTE, e a CONTRATANTE não estabelece vínculo com nenhum colaborador da CONTRATADA.',
                '8.8. Caso a CONTRATANTE deseje contratar novos serviços, aumentar o escopo, solicitar consultorias extras, gravações ou pacotes adicionais, deverá solicitar orçamento à CONTRATADA.',
                '8.9. Este contrato é regido pela legislação brasileira vigente, especialmente pelas normas do Código Civil.',
                '8.10. A CONTRATANTE autoriza expressamente a CONTRATADA a utilizar sua imagem, voz, logotipo, fotos, vídeos e demais conteúdos produzidos no âmbito deste contrato para divulgação em redes sociais, portfólio digital, site e demais materiais institucionais da CONTRATADA.'
            ]
        },
        {
            title: '9 - RESCISÃO CONTRATUAL',
            paragraphs: [
                '9.1. O presente contrato poderá ser rescindido por qualquer uma das partes, desde que respeitadas as condições previstas nesta cláusula.',
                '9.2. A rescisão poderá ocorrer imediatamente, sem multa, nos casos de falência ou dissolução de qualquer das partes, descumprimento grave de obrigações contratuais ou impossibilidade total de continuidade por motivo de força maior comprovada.',
                `9.3. Caso a CONTRATANTE solicite o cancelamento antes de completar ${durationRaw} meses de contrato, será aplicada multa rescisória equivalente a 50% do valor das mensalidades restantes até o fim do período mínimo.`,
                `9.4. Após os ${durationRaw} meses iniciais, o contrato poderá ser encerrado sem multa, desde que a CONTRATANTE comunique a rescisão com 30 (trinta) dias de antecedência.`,
                '9.4.1. Caso a CONTRATANTE deseje cancelar sem cumprir o aviso prévio de 30 dias, será aplicada multa rescisória no valor de 1 (uma) mensalidade vigente.',
                '9.5. Durante o período dos 30 dias de aviso prévio, a CONTRATADA manterá os serviços normalmente, desde que todos os pagamentos estejam em dia.',
                '9.6. Em caso de inadimplência superior a 15 dias, a CONTRATADA poderá suspender imediatamente a prestação dos serviços. Persistindo a inadimplência por período superior a 60 dias, a CONTRATADA poderá rescindir o contrato de forma imediata.',
                '9.7. A CONTRATADA poderá suspender ou cancelar o contrato se houver atrasos recorrentes, descumprimento de cláusulas, uso indevido de conteúdo ou comportamento abusivo, ofensivo ou desrespeitoso nas comunicações.',
                '9.8. A CONTRATANTE concorda que nenhum conteúdo deixará de ser cobrado caso tenha sido produzido ou programado antes da rescisão.',
                '9.9. Em caso de rescisão antecipada, não serão devolvidos valores já pagos pela CONTRATANTE, incluindo mensalidades, taxas ou valores de produção.'
            ]
        },
        {
            title: '10 - FORO',
            paragraphs: [
                '10.1. Para dirimir quaisquer controvérsias oriundas deste contrato, fica eleito o foro da Comarca de Viamão/RS, com renúncia expressa a qualquer outro, por mais privilegiado que seja.'
            ]
        }
    ];
};

const drawHeader = (doc) => {
    if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 55, 36, { width: 112 });
    } else {
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(16).text('&CONTI', 55, 42);
    }

    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(9).text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 0, 45, {
        width: doc.page.width,
        align: 'center',
        characterSpacing: 1.5
    });
    doc.strokeColor(LIGHT).lineWidth(1).moveTo(55, 78).lineTo(doc.page.width - 55, 78).stroke();
};

const drawContractTop = (doc) => {
    const pageWidth = doc.page.width;
    const topHeight = 156;
    const gradient = doc.linearGradient(0, 0, pageWidth, 0);
    gradient.stop(0, '#172b49').stop(0.55, '#344d70').stop(1, '#d1d5db');

    doc.rect(0, 0, pageWidth, topHeight).fill(gradient);

    if (fs.existsSync(LOGO_PATH)) {
        doc.image(LOGO_PATH, 65, 42, { width: 132 });
    } else {
        doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(30).text('&CONTI', 65, 50);
        doc.fillColor('#ffffff').font('Helvetica').fontSize(8).text('MARKETING DIGITAL', 67, 88, { characterSpacing: 4 });
    }

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 220, 94, {
        width: 350,
        align: 'center',
        characterSpacing: 1.5,
        lineBreak: false
    });
    doc.rect(220, 122, 350, 4).fill('#ffffff');
    doc.rect(0, topHeight - 11, pageWidth, 11).fill('#e5e7eb');
};

const ensureSpace = (doc, neededHeight) => {
    if (doc.y + neededHeight > doc.page.height - 55) {
        doc.addPage();
    }
};

const sectionTitle = (doc, title) => {
    ensureSpace(doc, 50);
    doc.moveDown(0.45);

    const x = 55;
    const width = doc.page.width - 110;
    const height = 28;
    const y = doc.y;

    doc.rect(x, y, width, height).fill(NAVY);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(title.toUpperCase(), x, y + 8, {
        width,
        align: 'center',
        characterSpacing: 3
    });
    doc.y = y + height + 12;
};

const paragraph = (doc, text) => {
    doc.x = 55;
    
    if (!text.includes('**')) {
        doc.fillColor(TEXT).font('Helvetica').fontSize(9.5).text(text, {
            align: 'justify',
            lineGap: 2
        });
    } else {
        const parts = text.split(/(\*\*.*?\*\*)/g).filter(Boolean);
        parts.forEach((part, index) => {
            const isBold = part.startsWith('**') && part.endsWith('**');
            const content = isBold ? part.slice(2, -2) : part;
            const isLast = index === parts.length - 1;
            
            doc.fillColor(TEXT)
               .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
               .fontSize(9.5)
               .text(content, {
                   continued: !isLast,
                   align: 'justify',
                   lineGap: 2
               });
        });
    }
    
    doc.moveDown(0.7);
};

const calculatePartyBoxBodyHeight = (doc, lines, width = 220) => {
    let totalLinesHeight = 0;
    const activeLines = lines.filter(Boolean);
    activeLines.forEach((line) => {
        let fontSize = 7.6;
        while (fontSize > 6.2 && doc.fontSize(fontSize).widthOfString(line) > width - 24) {
            fontSize -= 0.2;
        }
        doc.fontSize(fontSize);
        const textHeight = doc.heightOfString(line, { width: width - 24, align: 'center' });
        totalLinesHeight += Math.max(11, textHeight + 2);
    });
    return totalLinesHeight + 24; // 12px padding top and bottom
};

const drawPartyBox = (doc, title, lines, x, y = 190, width = 220, bodyHeight = 116) => {
    const headerHeight = 28;

    doc.rect(x, y, width, headerHeight).fill(NAVY);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(title, x, y + 8, {
        width,
        align: 'center',
        characterSpacing: 3.6
    });

    doc.rect(x, y + headerHeight + 5, width, bodyHeight).strokeColor('#06b6d4').lineWidth(1).stroke();
    doc.fillColor(TEXT).font('Helvetica-Bold');
    let lineY = y + headerHeight + 17;
    lines.filter(Boolean).forEach((line) => {
        let fontSize = 7.6;
        while (fontSize > 6.2 && doc.fontSize(fontSize).widthOfString(line) > width - 24) {
            fontSize -= 0.2;
        }
        doc.fontSize(fontSize);
        const textHeight = doc.heightOfString(line, { width: width - 24, align: 'center' });
        doc.text(line, x + 12, lineY, { width: width - 24, align: 'center', lineGap: 0 });
        lineY += Math.max(11, textHeight + 2);
    });
};

const drawSignatureBlock = (doc, data) => {
    ensureSpace(doc, 200);
    doc.moveDown(4);

    const y = doc.y + 115;
    if (fs.existsSync(CONTI_SIGNATURE_PATH)) {
        doc.image(CONTI_SIGNATURE_PATH, 124, y - 110, { width: 72 });
    }

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(70, y).lineTo(255, y).stroke();
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(340, y).lineTo(525, y).stroke();

    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(9).text('& CONTI MARKETING DIGITAL', 70, y + 10, { width: 185, align: 'center' });
    doc.font('Helvetica').fontSize(8).text('CNPJ: 30.795.540/0001-70', 70, y + 25, { width: 185, align: 'center' });
    doc.text('Representante: Fernando Barbosa', 70, y + 38, { width: 185, align: 'center' });
    doc.text('CPF: 853.143.150-68', 70, y + 51, { width: 185, align: 'center' });

    doc.font('Helvetica-Bold').fontSize(9).text(sanitize(data.clientName, 'CONTRATANTE'), 340, y + 10, { width: 185, align: 'center' });
    doc.font('Helvetica').fontSize(8).text(`${getDocumentLabel(data.clientDocument)}: ${sanitize(data.clientDocument)}`, 340, y + 25, { width: 185, align: 'center' });
    if (data.signerName) doc.text(`Representante: ${sanitize(data.signerName)}`, 340, y + 38, { width: 185, align: 'center' });
    if (data.signerDocument) doc.text(`CPF: ${sanitize(data.signerDocument)}`, 340, y + 51, { width: 185, align: 'center' });
    if (data.signedAt) {
        const signedLabel = new Date(data.signedAt).toLocaleString('pt-BR');
        doc.text(`Assinado em: ${signedLabel}`, 340, y + 64, { width: 185, align: 'center' });
    }

};

exports.generateContractBuffer = async (data) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margins: { top: 105, left: 55, right: 55, bottom: 55 },
                bufferPages: true,
                info: {
                    Title: `Contrato - ${sanitize(data.clientName, 'Cliente')}`,
                    Author: '& CONTI Marketing Digital'
                }
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // Reset y para o topo porque o drawContractTop ignora a margem
            doc.y = 0;
            drawContractTop(doc);

            const contratadaLines = [
                '&CONTI MARKETING DIGITAL',
                'CNPJ: 30.795.540/0001-70',
                'Representante: Fernando Barbosa – Co-Founder / CEO',
                'CPF: 853.143.150-68',
                'Endereço: Av. Protásio Alves, n°10535, CEP 91.260-000',
                'Porto Alegre/RS'
            ];

            const contratanteLines = [
                sanitize(data.clientName, 'Nome/Razão social'),
                `${getDocumentLabel(data.clientDocument)}: ${sanitize(data.clientDocument, '-')}`,
                sanitize(data.clientAddress),
                sanitize(data.clientCityState),
                data.signerName ? `Representante: ${sanitize(data.signerName)}` : '',
                data.signerDocument ? `CPF: ${sanitize(data.signerDocument)}` : ''
            ];

            const h1 = calculatePartyBoxBodyHeight(doc, contratadaLines, 220);
            const h2 = calculatePartyBoxBodyHeight(doc, contratanteLines, 220);
            const bodyHeight = Math.max(h1, h2);

            drawPartyBox(doc, 'CONTRATADA', contratadaLines, 80, 190, 220, bodyHeight);
            drawPartyBox(doc, 'CONTRATANTE', contratanteLines, 295, 190, 220, bodyHeight);

            doc.y = 190 + 28 + 5 + bodyHeight + 20;
            paragraph(doc, 'As partes acima qualificadas têm entre si, justo e contratado, o presente CONTRATO DE MARKETING DIGITAL E GESTÃO DE REDES SOCIAIS, o qual será regido pelas cláusulas e condições a seguir.');

            buildClauses(data).forEach((section) => {
                sectionTitle(doc, section.title);
                section.paragraphs.forEach((text) => paragraph(doc, text));
            });

            sectionTitle(doc, 'Assinaturas');
            if (data.contractDate) {
                paragraph(doc, `Local e data: ${sanitize(data.contractDate)}.`);
            }
            drawSignatureBlock(doc, data);

            // Adiciona o header a todas as páginas exceto a primeira, usando bufferPages
            const range = doc.bufferedPageRange();
            for (let i = 1; i < range.count; i++) {
                doc.switchToPage(i);
                drawHeader(doc);
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
