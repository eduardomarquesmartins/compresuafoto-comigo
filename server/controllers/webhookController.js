const { MercadoPagoConfig, Payment } = require('mercadopago');
const prisma = require('../lib/prisma');
const { logToFile } = require('../utils/logger');
const emailService = require('../services/email');

// Initialize Mercado Pago with the same token
const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

exports.handleMercadoPagoWebhook = async (req, res) => {
    try {
        const { type, data } = req.body;

        // Mercado Pago sent a payment notification
        if (type === 'payment') {
            const paymentId = data.id;
            console.log(`[WEBHOOK] Received payment notification: ${paymentId}`);
            logToFile(`Webhook received payment: ${paymentId}`);

            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: paymentId });

            const status = paymentDetails.status;
            const externalReference = paymentDetails.external_reference; // This is our Order PublicId or ID

            console.log(`[WEBHOOK] Payment ${paymentId} status: ${status} for Order: ${externalReference}`);

            if (status === 'approved') {
                // Update order in database
                // Support both ID and PublicID
                let where = {};
                if (externalReference.includes('-')) {
                    where = { publicId: externalReference };
                } else if (!isNaN(externalReference)) {
                    where = { id: parseInt(externalReference) };
                }

                const updatedOrder = await prisma.order.update({
                    where: where,
                    data: { status: 'approved' },
                    include: { user: true }
                });

                // Send email to client
                if (updatedOrder.user && updatedOrder.user.email) {
                    let photoCount = 0;
                    try { photoCount = JSON.parse(updatedOrder.items).length; } catch (e) { }
                    console.log(`[DEBUG] Disparando e-mail via Webhook para: ${updatedOrder.user.email}`);
                    await emailService.sendOrderEmail(updatedOrder.user.email, updatedOrder.publicId || updatedOrder.id, photoCount);
                }

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
