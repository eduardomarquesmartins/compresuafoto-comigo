const { Resend } = require('resend');
const pdfService = require('./pdfService');

const resend = new Resend(process.env.RESEND_API_KEY || 're_R5nTJJnG_PrJBBCwhqbSvMh9TNU4y4WPj');

/**
 * Envia e-mail de confirmação de pedido com link de download
 */
exports.sendOrderEmail = async (email, orderId, photosCount, clientUrl = null) => {
    try {
        let finalClientUrl = clientUrl || process.env.CLIENT_URL || 'https://compresuafoto.econticomigo.com.br';
        if (!finalClientUrl.startsWith('http')) {
            finalClientUrl = `https://${finalClientUrl}`;
        }
        const downloadLink = `${finalClientUrl}/orders/success?id=${orderId}`;
        const currentYear = new Date().getFullYear();

        const { data, error } = await resend.emails.send({
            from: 'contato@compresuafoto.econticomigo.com.br',
            to: [email],
            subject: `Pedido #${orderId} - Suas fotos estao prontas para download`,
            html: `
                <div style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <div style="background-color: #0a0a0a; padding: 40px 40px 35px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">&amp; CONTI</h1>
                            <p style="color: #64748b; margin: 8px 0 0; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Marketing Digital</p>
                        </div>

                        <!-- Status Badge -->
                        <div style="text-align: center; padding: 30px 40px 0;">
                            <div style="display: inline-block; background-color: #ecfdf5; color: #059669; padding: 8px 20px; border-radius: 50px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px;">
                                Pedido Confirmado
                            </div>
                        </div>

                        <!-- Body -->
                        <div style="padding: 25px 40px 35px;">
                            <h2 style="color: #0f172a; font-size: 24px; font-weight: 600; margin: 0 0 12px; text-align: center;">
                                Obrigado pela sua compra!
                            </h2>
                            <p style="color: #64748b; font-size: 15px; line-height: 1.6; text-align: center; margin: 0 0 30px;">
                                Suas fotos foram processadas com sucesso e estao prontas para download.
                            </p>

                            <!-- Order Summary Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Pedido</td>
                                        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">#${orderId}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Fotos</td>
                                        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${photosCount} foto${photosCount > 1 ? 's' : ''}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Status</td>
                                        <td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #059669; font-size: 14px; font-weight: 600; text-align: right;">Aprovado</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin-bottom: 10px;">
                                <a href="${downloadLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 48px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 1px; text-transform: uppercase;">
                                    Baixar Minhas Fotos
                                </a>
                            </div>
                            <p style="text-align: center; color: #94a3b8; font-size: 12px; margin: 12px 0 0;">
                                Ou copie e cole este link no navegador:<br>
                                <a href="${downloadLink}" style="color: #2563eb; word-break: break-all; font-size: 11px;">${downloadLink}</a>
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="color: #94a3b8; font-size: 11px; margin: 0; line-height: 1.6;">
                                Este e-mail foi enviado automaticamente. Em caso de duvidas, entre em contato conosco.<br>
                                &copy; ${currentYear} &amp; CONTI Marketing Digital - Todos os direitos reservados.
                            </p>
                        </div>

                    </div>
                </div>
            `
        });
        return { success: !error, data, error };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

/**
 * Envia proposta comercial estilizada com anexo PDF
 */
exports.sendProposalEmail = async (email, clientName, selectedServices, total) => {
    try {
        // Agrupar serviços por categoria para o corpo do e-mail
        const groupedServices = selectedServices.reduce((acc, service) => {
            if (!acc[service.category]) acc[service.category] = [];
            acc[service.category].push(service);
            return acc;
        }, {});

        // HTML para o corpo do e-mail (resumido/limpo)
        const servicesEmailHtml = Object.entries(groupedServices).map(([category, items]) => `
            <div style="margin-bottom: 24px;">
                <h4 style="color: #2563eb; text-transform: uppercase; font-size: 12px; margin-bottom: 8px;">${category}</h4>
                ${items.map(item => `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 5px 0;">
                        <span style="font-size: 14px; color: #0f172a;">${item.name}</span>
                        <span style="font-size: 14px; font-weight: bold;">R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                `).join('')}
            </div>
        `).join('');

        // Gerar o PDF usando o serviço centralizado
        const pdfBuffer = await pdfService.generatePDFBuffer(clientName, selectedServices, total);

        const { data, error } = await resend.emails.send({
            from: 'contato@compresuafoto.econticomigo.com.br',
            to: [email],
            subject: `Proposta Comercial - ${clientName || 'CONTI Marketing Digital'} 🚀`,
            attachments: [
                {
                    filename: `proposta_${clientName.replace(/\s+/g, '_').toLowerCase()}.pdf`,
                    content: pdfBuffer,
                }
            ],
            html: `
                <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #000; padding: 40px; text-align: center;">
                            <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Proposta Comercial</h2>
                            <p style="color: #2563eb; margin: 10px 0 0; font-weight: bold;">Arquivo em anexo 📎</p>
                        </div>
                        <div style="padding: 40px;">
                            <p>Olá, <strong>${clientName}</strong>!</p>
                            <p>É um prazer apresentar nossa proposta estratégica. Segue em anexo o arquivo detalhado para sua análise.</p>
                            <div style="margin: 30px 0; padding: 20px; background: #f1f5f9; border-radius: 12px;">
                                <h4 style="margin: 0 0 15px 0; color: #0f172a; font-size: 14px;">Resumo do Investimento:</h4>
                                ${servicesEmailHtml}
                                <div style="border-top: 2px solid #fff; margin-top: 15px; padding-top: 15px; text-align: right;">
                                    <span style="font-size: 18px; font-weight: bold; color: #2563eb;">Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p><strong>EDUARDA CONTI & FERNANDO</strong></p>
                            <p>&copy; ${new Date().getFullYear()} & CONTI Marketing Digital</p>
                        </div>
                    </div>
                </div>
            `
        });

        return { success: !error, data, error };
    } catch (err) {
        console.error('[PROPOSAL EMAIL ERROR]:', err);
        return { success: false, error: err.message };
    }
};
