const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../../client/public/logo.png');

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

const getScopeLineValue = (scope, label) => {
    const match = String(scope || '').match(new RegExp(`${label}:\\s*([^\\n.]+)`, 'i'));
    return match ? match[1].trim() : '';
};

const getScopeFlag = (scope, label) => {
    const value = getScopeLineValue(scope, label).toLowerCase();
    if (value.startsWith('sim')) return true;
    if (value.startsWith('não') || value.startsWith('nao')) return false;
    return null;
};

const getProposalType = (scope) => {
    const value = getScopeLineValue(scope, 'Tipo de proposta').toLowerCase();
    return value || 'empresarial';
};

const getEventTypeLabel = (proposalType) => {
    if (proposalType === 'casamento') return 'casamento';
    if (proposalType === '15anos') return 'festa de 15 anos';
    if (proposalType === 'aniversario') return 'aniversário, chá revelação ou chá de fralda';
    return 'evento';
};

const getContractedServices = (scope) => {
    const lines = String(scope || '').split('\n');
    const startIndex = lines.findIndex((line) => line.trim().toLowerCase().startsWith('serviços contratados:'));

    if (startIndex === -1) return [];

    return lines
        .slice(startIndex + 1)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line) => line.slice(2).trim());
};

const getContractedServicesText = (scope) => {
    const services = getContractedServices(scope);
    if (!services.length) return 'serviços de fotografia, vídeo, audiovisual ou cobertura de evento conforme proposta aprovada entre as partes';
    return services.map((service) => `- ${service}`).join('\n');
};

const buildObjectParagraph = (scope) => {
    const planName = getScopeLineValue(scope, 'Plano contratado') || 'Gestão de Redes Sociais';
    const weeklyPosts = getScopeLineValue(scope, 'Quantidade de postagens');
    const weeklyPostsNumber = parseInt(weeklyPosts, 10);
    const paidTraffic = getScopeFlag(scope, 'Gestão de tráfego pago \\(Meta Ads\\)');
    const audiovisual = getScopeFlag(scope, 'Audiovisual incluso no plano');
    const services = getContractedServices(scope);
    const extraNotes = String(scope || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('Observações adicionais:'))
        .map((line) => line.replace(/^Observações adicionais:\s*/i, '').trim())
        .filter(Boolean);

    const paidTrafficText = paidTraffic === true
        ? 'com gestão de tráfego pago Meta Ads inclusa'
        : 'sem gestão de tráfego pago Meta Ads inclusa';
    const audiovisualText = audiovisual === true
        ? 'com audiovisual incluso no plano'
        : 'sem audiovisual incluso no plano';
    const notesText = extraNotes.length ? ` Observações adicionais: ${extraNotes.join(' ')}` : '';

    if (!Number.isFinite(weeklyPostsNumber) || weeklyPostsNumber <= 0) {
        const servicesText = services.length
            ? `, contemplando os seguintes serviços aprovados na proposta comercial:\n${services.map((service) => `- ${service}`).join('\n')}`
            : '';

        return `1.1. O presente contrato tem por objeto a prestação de serviços de marketing digital, design, tráfego pago, produção de conteúdo e/ou audiovisual conforme plano ${planName}${servicesText}.${notesText}`;
    }

    return `1.1. O presente contrato tem por objeto a prestação de serviços do plano ${planName}, contemplando ${weeklyPosts}, ${paidTrafficText} e ${audiovisualText}.${notesText}`;
};

const buildEventObjectParagraph = (scope) => {
    const proposalType = getProposalType(scope);
    const eventType = getEventTypeLabel(proposalType);
    const services = getContractedServices(scope);
    const serviceText = services.length
        ? `, contemplando os seguintes serviços aprovados na proposta comercial:\n${services.map((service) => `- ${service}`).join('\n')}`
        : ', conforme proposta comercial aprovada entre as partes';

    return `1.1. O presente contrato tem por objeto a prestação de serviços de fotografia, vídeo, audiovisual e/ou cobertura para ${eventType}${serviceText}.`;
};

const buildEventClauses = ({ scope, monthlyValue, duration, durationRaw, paymentDay, proposalType }) => {
    const eventType = getEventTypeLabel(proposalType);
    const servicesText = getContractedServicesText(scope);

    return [
        {
            title: '1 - OBJETO',
            paragraphs: [
                buildEventObjectParagraph(scope),
                '1.2. Os serviços incluem somente as entregas, formatos, coberturas, quantidades, profissionais, horas e condições expressamente previstos na proposta comercial aprovada ou neste contrato.',
                '1.3. Data, local, horários e roteiro do evento deverão ser informados e confirmados pela CONTRATANTE com antecedência suficiente para organização da equipe.'
            ]
        },
        {
            title: '2 - SERVIÇOS CONTRATADOS',
            paragraphs: [
                `2.1. Fazem parte deste contrato os seguintes serviços aprovados pela CONTRATANTE:\n${servicesText}`,
                '2.2. Qualquer item não listado como contratado será considerado serviço adicional e dependerá de orçamento e aprovação prévia.',
                '2.3. Horas extras, profissionais adicionais, drone, álbum físico, teaser, filme, reels, storymaker, ensaio externo, making of, entrega prioritária ou deslocamentos especiais somente estarão incluídos quando expressamente indicados na proposta aprovada.'
            ]
        },
        {
            title: '3 - OBRIGAÇÕES DA CONTRATADA',
            paragraphs: [
                '3.1. A CONTRATADA executará os serviços contratados com técnica, zelo profissional e equipamentos adequados ao escopo aprovado.',
                '3.2. A CONTRATADA realizará a cobertura dentro do período contratado, observando os horários, locais e informações fornecidos pela CONTRATANTE.',
                '3.3. A seleção, edição, tratamento, montagem e finalização dos materiais seguirão critérios técnicos e criativos da CONTRATADA, respeitando o estilo apresentado na proposta e portfólio.',
                '3.4. A CONTRATADA não se responsabiliza por limitações causadas por restrições do local, regras de igrejas, salões, condomínios, cerimoniais, fornecedores terceiros, falta de iluminação adequada, clima, atrasos do evento ou impedimentos externos.'
            ]
        },
        {
            title: '4 - OBRIGAÇÕES DA CONTRATANTE',
            paragraphs: [
                '4.1. A CONTRATANTE deverá fornecer informações corretas sobre data, local, horários, roteiro, acessos, autorizações, contatos de responsáveis e demais detalhes necessários à execução dos serviços.',
                '4.2. A CONTRATANTE é responsável por obter autorizações de entrada, permanência, captação de imagem, uso de drone quando aplicável e demais permissões exigidas pelo local do evento.',
                '4.3. A CONTRATANTE deverá comunicar alterações de data, local, horário ou roteiro com a maior antecedência possível. Mudanças que gerem aumento de escopo, deslocamento, equipe, tempo de cobertura ou custos operacionais poderão gerar cobrança adicional.',
                '4.4. Atrasos no início do evento ou nas etapas planejadas não prorrogam automaticamente o período contratado. Havendo necessidade de permanência adicional, poderá ser cobrada hora extra conforme tabela ou acordo entre as partes.'
            ]
        },
        {
            title: '5 - ENTREGA DOS MATERIAIS',
            paragraphs: [
                '5.1. Os materiais serão entregues em formato digital, salvo quando houver contratação expressa de item físico, como álbum, mídia, impressão ou produto similar.',
                '5.2. Prazos de entrega específicos poderão constar na proposta aprovada. Na ausência de prazo específico, a CONTRATADA realizará a entrega em prazo compatível com o volume e complexidade do material contratado.',
                '5.3. Arquivos brutos, projetos editáveis, presets, timelines, arquivos de captação integral ou materiais não finalizados não estão incluídos, salvo contratação expressa.',
                '5.4. A CONTRATADA poderá realizar curadoria técnica dos registros captados, entregando somente materiais aprovados em qualidade técnica, estética e narrativa.'
            ]
        },
        {
            title: '6 - PAGAMENTO',
            paragraphs: [
                `6.1. O valor total/mensal do presente contrato é de ${monthlyValue}, correspondente aos serviços contratados para ${eventType}, com vigência operacional de ${duration}.`,
                `6.2. O pagamento deverá ser realizado todo dia ${paymentDay} de cada mês ou conforme condição comercial aprovada, por meio das formas disponibilizadas pela CONTRATADA.`,
                '6.3. O não pagamento na data de vencimento acarretará multa de 2% sobre o valor devido, juros de 1% ao mês calculados proporcionalmente por dia de atraso, correção monetária pelo IPCA e poderá suspender entregas, reservas de agenda, edição, envio de materiais ou demais etapas pendentes.',
                '6.4. Após 3 (três) dias corridos de atraso, a CONTRATADA poderá suspender a execução ou entrega dos serviços. Persistindo a inadimplência por período superior a 30 (trinta) dias, a CONTRATADA poderá rescindir o contrato sem necessidade de aviso prévio, permanecendo devidos os valores pendentes, multas e encargos.'
            ]
        },
        {
            title: '7 - REMARCAÇÃO E CANCELAMENTO',
            paragraphs: [
                `7.1. O presente contrato terá vigência inicial de ${duration}, limitada ao cumprimento das obrigações relacionadas ao evento e às entregas contratadas.`,
                '7.2. Pedido de remarcação dependerá de disponibilidade da agenda da CONTRATADA e poderá gerar custos adicionais quando houver alteração de logística, equipe, deslocamento ou fornecedores envolvidos.',
                `7.3. Caso a CONTRATANTE solicite cancelamento antes de completar ${durationRaw} meses ou antes da execução integral do serviço contratado, poderá ser aplicada multa rescisória equivalente a 50% dos valores restantes ou retenção de valores já pagos para cobertura de reserva de agenda, planejamento, custos operacionais e serviços já executados.`,
                '7.4. Em caso de força maior comprovada, as partes poderão negociar nova data ou solução equivalente, observada a disponibilidade da CONTRATADA.'
            ]
        },
        {
            title: '8 - USO DE IMAGEM E DIREITOS AUTORAIS',
            paragraphs: [
                '8.1. A CONTRATADA mantém os direitos autorais sobre fotografias, vídeos, edições e demais materiais produzidos, concedendo à CONTRATANTE licença de uso pessoal, institucional ou familiar conforme a natureza do evento contratado.',
                '8.2. A CONTRATANTE autoriza expressamente a CONTRATADA a utilizar sua imagem, voz, logotipo, fotos, vídeos e demais conteúdos produzidos no âmbito deste contrato para divulgação em redes sociais, portfólio digital, site e demais materiais institucionais da CONTRATADA, sem qualquer pagamento adicional e sem necessidade de nova autorização.',
                '8.3. Caso a CONTRATANTE deseje confidencialidade total ou restrição de divulgação, deverá solicitar por escrito antes da execução dos serviços, para avaliação e aceite expresso da CONTRATADA.',
                '8.4. A edição, tratamento e linguagem visual dos materiais seguem padrão autoral da CONTRATADA, não sendo garantida reprodução exata de referências externas.'
            ]
        },
        {
            title: '9 - DISPOSIÇÕES GERAIS',
            paragraphs: [
                '9.1. A CONTRATADA não se responsabiliza por falhas, atrasos ou prejuízos causados por fornecedores terceiros, cerimonial, local do evento, convidados, condições climáticas, energia, internet, restrições de acesso ou eventos de força maior.',
                '9.2. Caso a CONTRATANTE deseje contratar novos serviços, aumentar o escopo, solicitar horas extras, entregas adicionais, produtos físicos, equipe extra, drone ou pacotes adicionais, deverá solicitar orçamento à CONTRATADA, podendo a CONTRATADA ajustar o valor contratual conforme o novo escopo aprovado entre as partes.',
                '9.3. O contrato poderá ser rescindido a qualquer momento por qualquer uma das partes, desde que respeitadas as condições de pagamento, cancelamento, multa, reserva de agenda e valores pendentes previstas neste contrato.',
                '9.4. Este contrato é regido pela legislação brasileira vigente, especialmente pelas normas do Código Civil.'
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

const getContractIntroText = (scope) => {
    const proposalType = getProposalType(scope);
    if (proposalType === 'empresarial') {
        const weeklyPostsNumber = parseInt(getScopeLineValue(scope, 'Quantidade de postagens'), 10);
        if (!Number.isFinite(weeklyPostsNumber) || weeklyPostsNumber <= 0) {
            return 'As partes acima qualificadas têm entre si, justo e contratado, o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL, DESIGN, TRÁFEGO PAGO E/OU AUDIOVISUAL, o qual será regido pelas cláusulas e condições a seguir.';
        }

        return 'As partes acima qualificadas têm entre si, justo e contratado, o presente CONTRATO DE MARKETING DIGITAL E GESTÃO DE REDES SOCIAIS, o qual será regido pelas cláusulas e condições a seguir.';
    }

    return 'As partes acima qualificadas têm entre si, justo e contratado, o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FOTOGRAFIA, VÍDEO E AUDIOVISUAL PARA EVENTO, o qual será regido pelas cláusulas e condições a seguir.';
};

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
    const proposalType = getProposalType(scope);
    if (proposalType !== 'empresarial') {
        return buildEventClauses({ scope, monthlyValue, duration, durationRaw, paymentDay, proposalType });
    }
    const weeklyPostsNumber = parseInt(getScopeLineValue(scope, 'Quantidade de postagens'), 10);
    const hasWeeklyPosts = Number.isFinite(weeklyPostsNumber) && weeklyPostsNumber > 0;
    const includesAudiovisual = getScopeFlag(scope, 'Audiovisual incluso no plano') === true;
    const includesPaidTraffic = getScopeFlag(scope, 'Gestão de tráfego pago \\(Meta Ads\\)') === true;

    return [
        {
            title: '1 - OBJETO',
            paragraphs: [
                buildObjectParagraph(scope),
                '1.2. Os serviços serão prestados conforme plano contratado pela CONTRATANTE, incluindo somente as entregas, quantidades, formatos e condições expressamente definidos neste contrato, proposta comercial aprovada ou escopo validado entre as partes.'
            ]
        },
        {
            title: '2 - OBRIGAÇÕES DA CONTRATADA',
            paragraphs: [
                includesPaidTraffic
                    ? '2.1. A CONTRATADA prestará os serviços contratados com técnica, qualidade e dentro dos padrões profissionais de marketing digital, cumprindo o escopo estabelecido no presente contrato. Quando previsto no plano, a CONTRATADA será responsável pela criação, gestão, monitoramento e otimização das campanhas de tráfego pago nas plataformas Meta Ads.'
                    : '2.1. A CONTRATADA prestará os serviços contratados com técnica, qualidade e dentro dos padrões profissionais aplicáveis ao escopo aprovado, incluindo marketing digital, design, produção de conteúdo, audiovisual ou outros serviços contratados.',
                '2.2. A CONTRATADA disponibilizará à CONTRATANTE os sistemas organizacionais utilizados pela empresa, tais como Trello, Asaas e Google Forms, não sendo responsável por falhas, instabilidades ou limitações das plataformas de terceiros.',
                '2.3. A CONTRATADA compromete-se a realizar o atendimento e suporte digital de segunda a sexta-feira, das 09h às 18h, por meio dos canais oficiais de comunicação: WhatsApp comercial, e-mail e Trello.',
                hasWeeklyPosts
                    ? '2.4. A CONTRATADA realizará o planejamento, criação, revisão e publicação das postagens conforme o plano contratado pela CONTRATANTE, respeitando as quantidades e formatos definidos no escopo.'
                    : '2.4. A CONTRATADA realizará os serviços contratados conforme o escopo aprovado, respeitando formatos, entregas, quantidades e condições previstas na proposta comercial.',
                hasWeeklyPosts
                    ? '2.5. A CONTRATADA enviará mensalmente a Pesquisa de Conteúdo via Google Forms, que deverá ser preenchida pela CONTRATANTE para definição das postagens do mês subsequente. Conteúdos não solicitados dentro do prazo previsto não serão produzidos naquele mês. Conteúdos enviados após o prazo serão considerados urgência e não terão produção antecipada.'
                    : '2.5. Quando necessário para execução do serviço, a CONTRATADA poderá solicitar briefing, referências, arquivos, aprovações e informações complementares à CONTRATANTE.',
                hasWeeklyPosts
                    ? '2.6. A CONTRATADA compromete-se a programar e executar as postagens nos dias acordados, desde que o material e as aprovações necessárias tenham sido enviados pela CONTRATANTE dentro dos prazos estabelecidos.'
                    : '2.6. A execução e entrega dos materiais dependerão do envio das informações, arquivos e aprovações necessárias pela CONTRATANTE dentro dos prazos combinados.',
                '2.7. A CONTRATADA compromete-se a manter sigilo absoluto sobre qualquer informação estratégica, dados internos, conversas, materiais ou conteúdos fornecidos pela CONTRATANTE, não podendo divulgá-los a terceiros sem autorização expressa.',
                '2.8. A CONTRATADA permitirá até 2 (duas) alterações por arte, card, texto ou material enviado para aprovação. As alterações devem ser solicitadas exclusivamente via WhatsApp comercial ou Trello, para registro e controle. A partir da 3ª alteração, poderá ser cobrada taxa adicional correspondente a 5% do valor mensal do plano ou R$ 30,00 por alteração, conforme política interna.',
                '2.9. Solicitações feitas com menos de 48 horas úteis de antecedência poderão ter taxas entre R$ 30,00 e R$ 50,00 por card ou peça solicitada, conforme complexidade.',
                '2.10. A CONTRATADA não se responsabiliza por atrasos, falhas, instabilidades ou limitações das plataformas Instagram, Facebook, WhatsApp, Meta Business, Trello, Asaas ou qualquer outro sistema de terceiros utilizado para execução dos serviços.',
                '2.11. Reuniões de alinhamento serão realizadas conforme necessidade identificada pela CONTRATADA ou solicitada pela CONTRATANTE, não havendo periodicidade mínima obrigatória. O agendamento será feito com antecedência mínima de 48 horas úteis.'
            ]
        },
        {
            title: '3 - OBRIGAÇÕES DA CONTRATANTE',
            paragraphs: [
                '3.1. A CONTRATANTE deverá fornecer todas as informações, materiais, fotos, vídeos, textos, logotipos, senhas e demais recursos necessários para a execução dos serviços dentro dos prazos solicitados pela CONTRATADA.',
                `3.2. A CONTRATANTE se compromete a realizar o pagamento do valor mensal contratado na data de vencimento do dia ${paymentDay} de cada mês, através das formas disponibilizadas pela CONTRATADA.`,
                hasWeeklyPosts
                    ? '3.3. A CONTRATANTE deverá responder a Pesquisa de Conteúdo mensal enviada via Google Forms pela CONTRATADA, no prazo determinado, para viabilizar a organização das postagens do mês subsequente. A não resposta à Pesquisa Mensal implica aceitação da pauta mínima e não gera direito a retrabalho.'
                    : '3.3. A CONTRATANTE deverá responder briefings, solicitações de informação e pedidos de aprovação dentro dos prazos combinados, para viabilizar a execução dos serviços contratados.',
                '3.4. A CONTRATANTE é responsável por revisar, aprovar ou solicitar ajustes nos materiais enviados pela CONTRATADA dentro do prazo informado. Caso não haja retorno, a CONTRATADA poderá considerar o material como aprovado para publicação.',
                '3.5. A CONTRATANTE deverá comunicar com antecedência mínima de 48 horas úteis qualquer alteração de pauta, solicitação extra ou demanda urgente, estando ciente de que pedidos fora desse prazo poderão gerar taxas adicionais.',
                '3.6. A CONTRATANTE deverá manter, no grupo de WhatsApp e no Trello disponibilizados pela CONTRATADA, um representante responsável pelas comunicações e aprovações oficiais.',
                '3.7. É de responsabilidade da CONTRATANTE garantir que todas as informações fornecidas à CONTRATADA sejam verdadeiras, atualizadas e condizentes com a realidade da empresa.',
                hasWeeklyPosts || includesPaidTraffic
                    ? '3.8. A CONTRATANTE compromete-se a disponibilizar acesso às redes sociais (Instagram, Facebook, Google Meu Negócio, Meta Business Suite e demais plataformas necessárias), enviando logins, senhas e permissões quando solicitado.'
                    : '3.8. A CONTRATANTE compromete-se a disponibilizar arquivos, referências, logotipos, acessos, informações e permissões necessárias para execução dos serviços contratados, quando solicitado.',
                hasWeeklyPosts
                    ? '3.9. A CONTRATANTE declara estar ciente de que conteúdos não solicitados dentro do prazo da Pesquisa Mensal não serão produzidos no mês corrente.'
                    : '3.9. A CONTRATANTE declara estar ciente de que atrasos no envio de informações, materiais ou aprovações poderão impactar os prazos de execução e entrega.',
                includesPaidTraffic
                    ? '3.10. O valor investido em anúncios (Meta Ads) não está incluso na mensalidade, sendo de responsabilidade da CONTRATANTE.'
                    : '3.10. Serviços ou investimentos não previstos no escopo aprovado não estão inclusos no valor contratado e dependerão de orçamento adicional.',
                includesAudiovisual
                    ? '3.11. A CONTRATANTE não poderá exigir da CONTRATADA serviços não previstos no escopo contratado. Produções audiovisuais extras, gravações presenciais adicionais, fotografia profissional adicional ou edição avançada fora do plano dependerão de contratação adicional.'
                    : '3.11. A CONTRATANTE não poderá exigir da CONTRATADA serviços não previstos no escopo contratado, tais como gravações presenciais, fotografia profissional ou edição avançada, salvo contratação adicional.'
            ]
        },
        {
            title: '4 - PAUTA E IDENTIDADE VISUAL',
            paragraphs: [
                hasWeeklyPosts
                    ? '4.1. Caso a CONTRATANTE já possua Identidade Visual (cores, tipografias, logotipo, elementos gráficos), a CONTRATADA seguirá rigorosamente tais diretrizes no desenvolvimento das artes e postagens.'
                    : '4.1. Caso a CONTRATANTE já possua Identidade Visual (cores, tipografias, logotipo, elementos gráficos), a CONTRATADA seguirá tais diretrizes no desenvolvimento das artes, peças, campanhas ou materiais contratados.',
                '4.2. Caso a CONTRATANTE não possua Identidade Visual definida, deverá informar suas preferências de cores, estilos e referências no início da contratação. A CONTRATADA poderá desenvolver Identidade Visual mediante contratação adicional, conforme tabela vigente.',
                '4.3. A CONTRATANTE deverá encaminhar, no prazo máximo de 7 (sete) dias úteis após a assinatura deste contrato, todas as informações necessárias para início do projeto, tais como: logotipo, fotos, vídeos, referências, conteúdos e demais materiais relevantes.',
                hasWeeklyPosts
                    ? '4.4. Após o recebimento de todas as informações e materiais necessários, a CONTRATADA terá o prazo de até 7 (sete) dias úteis para elaborar a estratégia de pauta e organização do mês.'
                    : '4.4. Após o recebimento de todas as informações e materiais necessários, a CONTRATADA terá prazo compatível com o escopo aprovado para iniciar a execução, apresentar prévias ou organizar as entregas contratadas.',
                hasWeeklyPosts
                    ? '4.5. Todo e qualquer material adicional que não esteja incluído no escopo da criação de conteúdos para Instagram e Facebook deverá ser previamente acordado com a CONTRATADA e poderá gerar cobrança extra. Exemplos: catálogos, PDFs, portfólios, folhetos, cardápios e conteúdos para outras plataformas.'
                    : '4.5. Todo e qualquer material adicional que não esteja incluído no escopo contratado deverá ser previamente acordado com a CONTRATADA e poderá gerar cobrança extra. Exemplos: catálogos, PDFs, portfólios, folhetos, cardápios, peças extras, novas versões, arquivos editáveis ou conteúdos para outras plataformas.',
                hasWeeklyPosts
                    ? '4.6. O não envio das informações dentro dos prazos estabelecidos poderá atrasar o início das publicações, não gerando compensação, reposição ou direito a postagens retroativas.'
                    : '4.6. O não envio das informações dentro dos prazos estabelecidos poderá atrasar a execução ou entrega dos serviços, não gerando compensação automática ou direito a entregas adicionais.',
                '4.7. Caso a CONTRATANTE solicite mudanças significativas na Identidade Visual após a definição da pauta, tais alterações poderão gerar retrabalho e custos adicionais conforme tabela de serviços.',
                '4.8. A CONTRATADA não se responsabiliza pela baixa qualidade de fotos ou vídeos enviados pela CONTRATANTE, podendo orientar sobre captação, mas sem obrigação de realizar tratamento avançado não contratado.'
            ]
        },
        {
            title: '5 - AUDIOVISUAL',
            paragraphs: [
                includesAudiovisual
                    ? '5.1. Os serviços de gravação de conteúdo audiovisual (vídeo ou fotografia profissional) estão incluídos neste contrato dentro dos limites, formatos e condições especificados no escopo do plano contratado.'
                    : '5.1. Os serviços de gravação de conteúdo audiovisual (vídeo ou fotografia profissional) não estão incluídos neste contrato, salvo contratação adicional expressa.',
                includesAudiovisual
                    ? '5.2. Caso a CONTRATANTE deseje contratar gravações, fotografias, captações, reels, depoimentos, eventos ou similares além do audiovisual incluído no plano, deverá solicitar orçamento separado à CONTRATADA, que emitirá proposta específica com valores, datas e condições. As gravações previstas no plano serão realizadas conforme necessidade estratégica identificada pela CONTRATADA, sem periodicidade mínima garantida, mediante agendamento prévio e disponibilidade da equipe.'
                    : '5.2. Caso a CONTRATANTE deseje contratar gravação de conteúdo presencial, fotografia profissional, captação de vídeos, reels, depoimentos, eventos ou similares, deverá solicitar orçamento separado à CONTRATADA, que emitirá proposta específica com valores, datas e condições. Havendo a contratação do serviço de audiovisual, as gravações serão realizadas conforme necessidade estratégica identificada pela CONTRATADA, sem periodicidade mínima garantida, mediante agendamento prévio e disponibilidade da equipe.',
                '5.3. Para solicitações de gravação fora da cidade de atuação da CONTRATADA ou em locais que demandem deslocamento significativo, serão cobrados adicionalmente deslocamento, alimentação, transporte de equipamentos e, se necessário, hospedagem. Os valores serão previamente acordados entre as partes.',
                '5.4. A CONTRATADA somente realizará gravações mediante agendamento prévio e disponibilidade na agenda de audiovisual da equipe, não sendo possível garantir datas solicitadas sem antecedência mínima de 7 (sete) dias úteis.',
                '5.5. Gravações extras ao longo do mês serão cobradas separadamente, conforme tabela de audiovisual vigente.',
                '5.6. A CONTRATADA não se responsabiliza por alterações climáticas, eventos externos ou fatores de força maior que impeçam a realização de gravações, podendo remarcar conforme disponibilidade.'
            ]
        },
        {
            title: '6 - PAGAMENTO',
            paragraphs: [
                `6.1. O valor mensal do presente contrato é de ${monthlyValue}, correspondente ao plano contratado pela CONTRATANTE, com vigência de ${duration}.`,
                `6.2. O pagamento será realizado todo dia ${paymentDay} de cada mês, por meio de cobrança automática emitida pelo sistema Asaas, ou, em alternativa, via Pix para a chave 30.795.540/0001-70.`,
                '6.3. O não pagamento na data de vencimento acarretará automaticamente: multa de 2% sobre o valor devido, aplicada no 1º dia de atraso; juros de 1% ao mês, calculados proporcionalmente por dia de atraso; correção monetária pelo IPCA acumulado do período; taxa administrativa de R$ 50,00 por reativação do serviço; suspensão imediata de todos os serviços a partir do 3º dia de atraso, sem reposição retroativa; e rescisão automática após 30 dias de inadimplência, com cobrança integral da multa rescisória.',
                '6.4. Após 3 (três) dias corridos de atraso, os serviços poderão ser totalmente suspensos. Durante o período de suspensão, não há reposição retroativa de postagens, programação, artes, suporte de WhatsApp ou acesso ao Trello. A retomada do serviço ocorrerá somente após a regularização do pagamento. A suspensão não altera o valor mensal contratado.',
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
                '8.2. Todas as informações fornecidas pela CONTRATANTE à CONTRATADA, bem como dados internos, estratégias, documentos, conversas, acesso a plataformas e qualquer material sensível, serão tratados como informações confidenciais, não podendo ser divulgados a terceiros sem autorização expressa.',
                '8.3. A CONTRATADA não se responsabiliza por falhas, instabilidades ou limitações das plataformas de terceiros utilizadas na execução do serviço, incluindo, mas não se limitando a: Instagram, Facebook, WhatsApp, Meta Business, Google, Trello, Asaas ou qualquer outro sistema externo.',
                '8.4. A CONTRATADA não se responsabiliza por bloqueios, quedas, instabilidades, limitações de alcance, mudanças de algoritmo ou remoção de conteúdo por parte das plataformas de redes sociais.',
                '8.5. A CONTRATADA não poderá ser responsabilizada por atrasos ou prejuízos decorrentes de falta de envio de informações, imagens, vídeos, textos ou aprovações pela CONTRATANTE.',
                '8.6. A divulgação deste contrato ou de qualquer comunicação interna, assim como qualquer tipo de material enviado pela CONTRATADA, só poderá ser realizada pela CONTRATANTE mediante autorização prévia.',
                '8.7. A CONTRATADA não estabelece vínculo empregatício com nenhum colaborador da CONTRATANTE, e a CONTRATANTE não estabelece vínculo com nenhum colaborador da CONTRATADA.',
                '8.8. Caso a CONTRATANTE deseje contratar novos serviços, aumentar o escopo, solicitar consultorias extras, gravações ou pacotes adicionais, deverá solicitar orçamento à CONTRATADA, podendo a CONTRATADA ajustar o valor contratual conforme o novo escopo aprovado entre as partes.',
                '8.9. Este contrato é regido pela legislação brasileira vigente, especialmente pelas normas do Código Civil.',
                '8.10. A CONTRATANTE autoriza expressamente a CONTRATADA a utilizar sua imagem, voz, logotipo, fotos, vídeos e demais conteúdos produzidos no âmbito deste contrato para divulgação em redes sociais, portfólio digital, site e demais materiais institucionais da CONTRATADA, sem qualquer pagamento adicional e sem necessidade de nova autorização.'
            ]
        },
        {
            title: '9 - RESCISÃO CONTRATUAL',
            paragraphs: [
                '9.1. O presente contrato poderá ser rescindido a qualquer momento por qualquer uma das partes, desde que respeitadas as condições previstas nesta cláusula.',
                '9.2. A rescisão poderá ocorrer imediatamente, sem multa, nos casos de falência ou dissolução de qualquer das partes, descumprimento grave de obrigações contratuais ou impossibilidade total de continuidade por motivo de força maior comprovada.',
                `9.3. Caso a CONTRATANTE solicite o cancelamento antes de completar ${durationRaw} meses de contrato, será aplicada multa rescisória equivalente a 50% do valor das mensalidades restantes até o fim do período mínimo.`,
                `9.4. Após os ${durationRaw} meses iniciais, o contrato poderá ser encerrado sem multa, desde que a CONTRATANTE comunique a rescisão com 30 (trinta) dias de antecedência.`,
                '9.4.1. Caso a CONTRATANTE deseje cancelar sem cumprir o aviso prévio de 30 dias, será aplicada multa rescisória no valor de 1 (uma) mensalidade vigente.',
                '9.5. Durante o período dos 30 dias de aviso prévio, a CONTRATADA manterá os serviços normalmente, desde que todos os pagamentos estejam em dia.',
                '9.6. Em caso de inadimplência superior a 3 (três) dias corridos, a CONTRATADA poderá suspender imediatamente a prestação dos serviços. Persistindo a inadimplência por período superior a 30 (trinta) dias, a CONTRATADA poderá rescindir o contrato de forma imediata, sem necessidade de aviso prévio, permanecendo devidas as cobranças, multas, encargos e demais valores previstos neste contrato.',
                '9.7. A CONTRATADA poderá suspender ou cancelar o contrato se houver atrasos recorrentes, descumprimento de cláusulas, uso indevido de conteúdo ou comportamento abusivo, ofensivo ou desrespeitoso nas comunicações.',
                '9.8. A CONTRATANTE concorda que nenhum conteúdo deixará de ser cobrado caso tenha sido produzido ou programado antes da rescisão.',
                '9.9. Em caso de rescisão antecipada, não serão devolvidos valores já pagos pela CONTRATANTE, incluindo mensalidades, taxas ou valores de produção. O cancelamento não isenta a CONTRATANTE da quitação de valores pendentes.'
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

const drawSignatureImage = (doc, dataUrl, x, y, width = 130, height = 50) => {
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) {
        return;
    }

    const matches = String(dataUrl).match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!matches) {
        return;
    }

    try {
        const imageBuffer = Buffer.from(matches[2], 'base64');
        doc.image(imageBuffer, x, y, {
            fit: [width, height],
            align: 'center',
            valign: 'center'
        });
    } catch (error) {
        console.warn('[CONTRACT PDF] Não consegui renderizar a assinatura desenhada:', error.message);
    }
};

const getSignatureDate = (data) => {
    const source = data.signedAt ? new Date(data.signedAt) : null;
    if (source && !Number.isNaN(source.getTime())) {
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `VIAMÃO, ${String(source.getDate()).padStart(2, '0')} de ${months[source.getMonth()].toUpperCase()} de ${source.getFullYear()}`;
    }
    return 'VIAMÃO, ____ de __________ de ______';
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
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(70, y).lineTo(255, y).stroke();

    doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(9).text('& CONTI MARKETING DIGITAL', 70, y + 10, { width: 185, align: 'center' });
    doc.font('Helvetica').fontSize(8).text('CNPJ: 30.795.540/0001-70', 70, y + 25, { width: 185, align: 'center' });
    doc.text('Representante: Fernando Barbosa', 70, y + 38, { width: 185, align: 'center' });
    doc.text('CPF: 853.143.150-68', 70, y + 51, { width: 185, align: 'center' });
    doc.font('Helvetica-BoldOblique').fontSize(10).fillColor(NAVY)
        .text('Assinatura Contratada', 70, y + 67, { width: 185, align: 'center' });

    const clientX = 320;
    const clientWidth = 220;
    doc.fillColor(NAVY).font('Helvetica').fontSize(8.5)
        .text(getSignatureDate(data), clientX, y - 112, { width: clientWidth, align: 'center', characterSpacing: 0.4 });
    drawSignatureImage(doc, data.signedSignatureData, 380, y - 79, 100, 64);
    doc.strokeColor(NAVY).lineWidth(1).moveTo(clientX, y).lineTo(clientX + clientWidth, y).stroke();
    doc.fillColor(NAVY).font('Helvetica-BoldOblique').fontSize(11)
        .text('Assinatura Contratante', clientX, y + 12, { width: clientWidth, align: 'center' });

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
            paragraph(doc, getContractIntroText(data.scope));

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
