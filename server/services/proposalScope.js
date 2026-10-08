const CATEGORY_DESCRIPTIONS = {
    'Social Media': 'Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização.',
    'Social Media + Audiovisual': 'Postagens Facebook e Instagram, organização de feed, análise de mercado, estratégia, designer (cards), copyright, pesquisa do mês através do forms, Trello para organização, social media, + fotografias, vídeos e drone (uma vez ao mês) + cadastro Google meu negócio.'
};

const parseServices = (value) => {
    try {
        const services = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(services) ? services : null;
    } catch {
        return null;
    }
};

const formatCurrency = (value) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
});

const serviceName = (service) => typeof service === 'string'
    ? service
    : service?.name || service?.serviceName || service?.description || 'Serviço';

const proposalScopeSnapshot = (value, proposalType = 'empresarial') => {
    const services = parseServices(value);
    if (!services) return String(value || 'Serviços conforme proposta');
    if (!services.length) return 'Serviços conforme proposta';

    const serviceText = services.map((service) => [
        serviceName(service),
        service?.category,
        typeof service === 'object' ? service?.description : ''
    ].filter(Boolean).join(' ')).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const primaryPlan = services.find((service) => /social media|pacote/.test([
        serviceName(service),
        service?.category
    ].filter(Boolean).join(' ').toLowerCase())) || services[0];
    const postDescription = services.map((service) => service?.description || '').find((description) => /\d+\s+postagen/i.test(description)) || '';
    const postCount = postDescription.match(/(\d+)\s+postagen/i)?.[1] || '0';
    const includesPaidTraffic = /meta ads|trafego pago|anuncios?/.test(serviceText);
    const includesAudiovisual = /audiovisual|fotografia|fotos|videos?/.test(serviceText);

    const lines = [`Tipo de proposta: ${proposalType || 'empresarial'}.`];
    if (proposalType === 'empresarial') {
        lines.push(
            `Plano contratado: ${serviceName(primaryPlan) || primaryPlan?.category || 'não informado'}.`,
            `Quantidade de postagens: ${postCount} postagens semanais para Instagram/Facebook.`,
            `Gestão de tráfego pago (Meta Ads): ${includesPaidTraffic ? 'sim' : 'não'}.`,
            `Audiovisual incluso no plano: ${includesAudiovisual ? 'sim' : 'não'}.`
        );
    }

    lines.push('Serviços contratados:');
    for (const service of services) {
        const name = serviceName(service);
        const category = service?.category ? ` (${service.category})` : '';
        const quantity = Number(service?.quantity);
        const quantityLabel = Number.isFinite(quantity) && quantity > 1 ? `${Math.floor(quantity)}x ` : '';
        const details = [service?.description, CATEGORY_DESCRIPTIONS[service?.category]]
            .filter((detail, index, all) => detail && all.indexOf(detail) === index)
            .join('; ');
        lines.push(`- ${quantityLabel}${name}${category}: ${formatCurrency(service?.price)}${details ? ` - ${details}` : ''}`);
    }

    return lines.join('\n');
};

module.exports = { proposalScopeSnapshot };
