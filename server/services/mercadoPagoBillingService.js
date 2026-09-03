const crypto = require('crypto');

const trimUrl = (value) => String(value || '').replace(/\/+$/, '');
const asMoney = (value) => Number(Number(value).toFixed(2));

// Billing due dates are calendar dates in Brazil. Checkout Pro expects an ISO
// instant, so keep the link usable through the final millisecond of that day.
const expirationAtEndOfSaoPauloDay = (dueDate) => {
    if (!dueDate) return undefined;
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date(dueDate));
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}T23:59:59.999-03:00`;
};

const billingUrls = () => {
    const publicUrl = trimUrl(process.env.ECONTI_PUBLIC_URL);
    const serverUrl = trimUrl(process.env.ECONTI_BILLING_SERVER_URL || process.env.SERVER_URL);
    if (!publicUrl || !serverUrl) throw new Error('ECONTI_PUBLIC_URL e SERVER_URL devem estar configuradas.');
    return { publicUrl, serverUrl };
};

const buildBillingPreferencePayload = ({ charge, client }) => {
    const amount = asMoney(charge.amount);
    if (!charge.publicId || !charge.externalReference || !Number.isFinite(amount) || amount <= 0) {
        throw new Error('Dados inválidos para criar a cobrança.');
    }
    const { publicUrl, serverUrl } = billingUrls();
    const page = `${publicUrl}/cobranca/${charge.publicId}`;
    const payer = { name: client.name };
    if (client.email) payer.email = client.email;
    if (client.document) payer.identification = { type: String(client.document).replace(/\D/g, '').length === 14 ? 'CNPJ' : 'CPF', number: String(client.document).replace(/\D/g, '') };
    const expiration = expirationAtEndOfSaoPauloDay(charge.dueDate);
    return {
        body: {
            items: [{ id: `econti-billing-${charge.publicId}`, title: charge.description, quantity: 1, currency_id: 'BRL', unit_price: amount }],
            payer,
            external_reference: charge.externalReference,
            notification_url: `${serverUrl}/api/webhooks/mercadopago/billing`,
            back_urls: { success: page, failure: page, pending: page },
            auto_return: 'approved',
            ...(expiration ? { date_of_expiration: expiration } : {}),
        },
    };
};

const mpClient = () => {
    const { MercadoPagoConfig } = require('mercadopago');
    const accessToken = process.env.MERCADO_PAGO_ECONTI_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MERCADO_PAGO_ECONTI_ACCESS_TOKEN não configurado.');
    return new MercadoPagoConfig({ accessToken });
};

const createPreference = async (charge, client) => {
    const { Preference } = require('mercadopago');
    return new Preference(mpClient()).create(buildBillingPreferencePayload({ charge, client }));
};
const getPayment = async (id) => {
    const { Payment } = require('mercadopago');
    return new Payment(mpClient()).get({ id });
};

const paymentFee = (payment) => {
    const details = Array.isArray(payment.fee_details) ? payment.fee_details : [];
    return details.reduce((sum, detail) => sum + Number(detail.amount || 0), 0);
};

const verifyWebhookSignature = (req) => {
    const secret = process.env.MP_ECONTI_WEBHOOK_SECRET;
    if (!secret) return process.env.NODE_ENV !== 'production';
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const notificationId = req.query['data.id'] || req.body?.data?.id;
    if (!signature || !requestId || !notificationId) return false;
    const parts = Object.fromEntries(String(signature).split(',').map(part => part.trim().split('=')));
    if (!parts.ts || !parts.v1) return false;
    const expected = crypto.createHmac('sha256', secret).update(`id:${notificationId};request-id:${requestId};ts:${parts.ts};`).digest('hex');
    const actual = String(parts.v1);
    return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

module.exports = { buildBillingPreferencePayload, expirationAtEndOfSaoPauloDay, createPreference, getPayment, paymentFee, verifyWebhookSignature };
