const { Resend } = require('resend');
const pdfService = require('./pdfService');

const resend = new Resend(process.env.RESEND_API_KEY || 're_R5nTJJnG_PrJBBCwhqbSvMh9TNU4y4WPj');

/**
 * Envia e-mail de confirmação de pedido com link de download
 */
exports.sendOrderEmail = async (email, orderId, photosCount, clientUrl = null) => {
    try {
        let finalClientUrl = clientUrl || process.env.CLIENT_URL || 'https://compresuafoto-comigo.vercel.app';
        if (!finalClientUrl.startsWith('http')) {
            finalClientUrl = `http://${finalClientUrl}`;
        }
        const downloadLink = `${finalClientUrl}/orders/success?id=${orderId}`;

        const { data, error } = await resend.emails.send({
            from: 'contato@compresuafoto.econticomigo.com.br',
            to: [email],
            subject: 'Suas fotos chegaram! 📸✨',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
                    <h1 style="color: #0044ff;">Obrigado pela sua compra!</h1>
                    <p style="font-size: 16px;">Suas <strong>${photosCount} fotos</strong> já estão disponíveis para download.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${downloadLink}" style="background-color: #0044ff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">BAIXAR MINHAS FOTOS</a>
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
