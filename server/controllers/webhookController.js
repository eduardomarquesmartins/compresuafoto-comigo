const { MercadoPagoConfig, Payment } = require('mercadopago');
const prisma = require('../lib/prisma');
const { logToFile } = require('../utils/logger');
const crypto = require('crypto');
const { finalizeApprovedOrder } = require('./orderController');

// Initialize Mercado Pago with the same token
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

exports.handleMercadoPagoWebhook = async (req, res) => {
    try {
        // 1. Validate Webhook Signature (Security Fix)
        const xSignature = req.headers['x-signature'];
        const xRequestId = req.headers['x-request-id'];
        const webhookSecret = process.env.MP_WEBHOOK_SECRET;

        if (webhookSecret) {
            if (!xSignature || !xRequestId) {
                // A notification without the Mercado Pago headers cannot be trusted when
                // signature validation has been configured.
                console.error('[WEBHOOK ERROR] Missing Mercado Pago signature headers');
                return res.status(401).send('Signature Required');
            }

            try {
                const parts = xSignature.split(',');
                let ts = '';
                let v1 = '';

                parts.forEach(part => {
                    const [key, value] = part.split('=');
                    if (key === 'ts') ts = value;
                    if (key === 'v1') v1 = value;
                });

                const notificationId = req.query['data.id'] || req.body?.data?.id;
                if (!notificationId || !ts || !v1) {
                    console.error('[WEBHOOK ERROR] Incomplete Mercado Pago signature data');
                    return res.status(401).send('Invalid Signature');
                }

                const manifest = `id:${notificationId};request-id:${xRequestId};ts:${ts};`;
                const hmac = crypto.createHmac('sha256', webhookSecret);
                hmac.update(manifest);
                const sha = hmac.digest('hex');

                if (!crypto.timingSafeEqual(Buffer.from(sha, 'hex'), Buffer.from(v1, 'hex'))) {
                    console.error('[WEBHOOK ERROR] Invalid Signature');
                    return res.status(401).send('Invalid Signature');
                }
            } catch (err) {
                console.error('[WEBHOOK ERROR] Signature Verification Failed:', err.message);
                return res.status(401).send('Signature Verification Failed');
            }
        } else {
            // The payment is always fetched directly from Mercado Pago below with the
            // private access token. This keeps checkout working while the optional
            // webhook secret is not configured, without trusting the request body.
            console.warn('[WEBHOOK WARNING] MP_WEBHOOK_SECRET is not configured; payment will be verified with Mercado Pago API');
        }

        const { type, data } = req.body;

        // Mercado Pago sent a payment notification
        if (type === 'payment') {
            const paymentId = data.id;
            console.log(`[WEBHOOK] Received payment notification: ${paymentId}`);
            logToFile(`Webhook received payment: ${paymentId}`);

            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: paymentId });

            const status = paymentDetails.status;
            const externalReference = String(paymentDetails.external_reference || ''); // This is our Order PublicId or ID

            console.log(`[WEBHOOK] Payment ${paymentId} status: ${status} for Order: ${externalReference}`);

            if (status === 'approved') {
                // Update order in database
                // Support both ID and PublicID
                let where;
                if (externalReference.includes('-')) {
                    where = { publicId: externalReference };
                } else if (!isNaN(externalReference)) {
                    where = { id: parseInt(externalReference) };
                }

                if (!where) {
                    logToFile(`Invalid external reference for payment ${paymentId}: ${externalReference}`);
                    return res.status(200).send('OK');
                }

                const existingOrder = await prisma.order.findUnique({ where, select: { id: true, status: true } });
                if (!existingOrder) {
                    logToFile(`Order not found for external reference ${externalReference}`);
                    return res.status(200).send('OK');
                }

                await finalizeApprovedOrder(existingOrder.id);

                console.log(`[WEBHOOK] Order ${externalReference} successfully updated to 'approved' and email sent`);
                logToFile(`Order ${externalReference} confirmed by webhook and email sent`);
            }
        }

        // Always return 200/204 to Mercado Pago to acknowledge receipt
        res.status(200).send('OK');

    } catch (error) {
        console.error('[WEBHOOK ERROR]:', error);
        logToFile(`Webhook error: ${error.message}`);
        // Still return 200 to avoid Mercado Pago retrying indefinitely if it's a code error
        res.status(200).send('Error but acknowledged');
    }
};
