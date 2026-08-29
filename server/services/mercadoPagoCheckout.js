const trimTrailingSlash = (url) => String(url || '').replace(/\/+$/, '');

const buildOrderPreferencePayload = ({ orderReference, eventName, total, clientUrl, serverUrl }) => {
    const amount = Number(Number(total).toFixed(2));
    if (!orderReference || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Dados inválidos para iniciar o pagamento do pedido.');
    }

    const normalizedClientUrl = trimTrailingSlash(clientUrl);
    const normalizedServerUrl = trimTrailingSlash(serverUrl);

    if (!normalizedClientUrl || !normalizedServerUrl) {
        throw new Error('Endereços de retorno do pagamento não configurados.');
    }

    return {
        body: {
            items: [
                {
                    id: 'photos',
                    title: `Fotos - ${eventName || 'Pedido de fotos'}`,
                    quantity: 1,
                    unit_price: amount,
                },
            ],
            external_reference: String(orderReference),
            notification_url: `${normalizedServerUrl}/api/webhooks/mercadopago`,
            back_urls: {
                success: `${normalizedClientUrl}/orders/success`,
                failure: `${normalizedClientUrl}/orders/failure`,
                pending: `${normalizedClientUrl}/orders/pending`,
            },
            auto_return: 'approved',
        },
    };
};

module.exports = { buildOrderPreferencePayload };
