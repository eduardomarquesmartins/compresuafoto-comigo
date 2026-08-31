const { Resend } = require('resend');
const pdfService = require('./pdfService');

if (!process.env.RESEND_API_KEY) {
    console.error('[ERROR] RESEND_API_KEY is missing in environment variables');
}
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const sendEmailOrFail = async (payload) => {
    if (!resend) {
        return { data: null, error: 'RESEND_API_KEY is missing' };
    }

    return resend.emails.send(payload);
};

/**
 * Envia e-mail de confirmação de pedido com link de download
 */
exports.sendOrderEmail = async (email, orderAccessId, photosCount, clientUrl = null) => {
    try {
        let finalClientUrl = clientUrl || process.env.CLIENT_URL || 'https://econticomigo.com.br/compresuafoto';
        if (!finalClientUrl.startsWith('http')) {
            finalClientUrl = `https://${finalClientUrl}`;
        }
        const downloadLink = `${finalClientUrl}/orders/success?id=${orderAccessId}`;
        const currentYear = new Date().getFullYear();

        const { data, error } = await sendEmailOrFail({
            from: process.env.EMAIL_FROM || 'Compre Sua Foto <contato@econti.com.br>',
            to: [email],
            subject: 'Suas fotos estão prontas para download',
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
                                Suas fotos foram processadas com sucesso e estão prontas para download.
                            </p>

                            <!-- Purchase Summary Card -->
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                                <table style="width: 100%; border-collapse: collapse;">
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
                                Se o botão não abrir, acesse sua conta na plataforma para visualizar suas fotos.
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

exports.sendPasswordResetEmail = async (email, resetToken, clientUrl, app = 'photo') => {
    try {
        let finalClientUrl = clientUrl || process.env.CLIENT_URL || 'https://econticomigo.com.br/compresuafoto';
        if (!finalClientUrl.startsWith('http')) {
            finalClientUrl = `https://${finalClientUrl}`;
        }

        const resetLink = `${finalClientUrl}/forgot-password?token=${encodeURIComponent(resetToken)}`;
        const currentYear = new Date().getFullYear();

        const isEconti = app === 'econti';
        const brand = isEconti ? '& CONTI Marketing Digital' : 'Compre Sua Foto';
        const { data, error } = await sendEmailOrFail({
            from: (isEconti ? process.env.ECONTI_EMAIL_FROM : process.env.EMAIL_FROM) || `${brand} <contato@econti.com.br>`,
            to: [email],
            subject: `Recuperacao de senha - ${brand}`,
            html: `
                <div style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
                    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                        <div style="background:#0a0a0a;padding:36px 40px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">${brand}</h1>
                        </div>
                        <div style="padding:32px 40px;">
                            <h2 style="color:#0f172a;font-size:24px;margin:0 0 12px;">Redefina sua senha</h2>
                            <p style="color:#64748b;font-size:15px;line-height:1.7;margin:0 0 24px;">
                                Recebemos um pedido para redefinir sua senha. Se foi voce, use o botao abaixo. Este link expira em 1 hora.
                            </p>
                            <div style="text-align:center;margin:30px 0;">
                                <a href="${resetLink}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:15px 28px;border-radius:12px;text-decoration:none;font-weight:700;">
                                    Criar nova senha
                                </a>
                            </div>
                            <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:0;">
                                Se voce nao solicitou a alteracao, ignore este e-mail. Link direto:<br>
                                <a href="${resetLink}" style="color:#2563eb;word-break:break-all;">${resetLink}</a>
                            </p>
                        </div>
                        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${currentYear} Compre Sua Foto</p>
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
exports.sendProposalEmail = async (email, clientName, selectedServices, total, proposalType = 'empresarial') => {
    try {
        const getServiceQuantity = (quantity) => {
            const parsed = Number(quantity);
            if (!Number.isFinite(parsed) || parsed < 1) return 1;
            return Math.floor(parsed);
        };

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
                ${items.map(item => {
                    const quantity = getServiceQuantity(item.quantity);
                    const unitPrice = Number(item.price) || 0;
                    const lineTotal = unitPrice * quantity;

                    return `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 5px 0;">
                        <span style="font-size: 14px; color: #0f172a;">${quantity > 1 ? `${quantity}x ` : ''}${item.name}</span>
                        <span style="font-size: 14px; font-weight: bold;">R$ ${lineTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    `;
                }).join('')}
            </div>
        `).join('');

        // Gerar o PDF usando o serviço centralizado
        const pdfBuffer = await pdfService.generatePDFBuffer(clientName, selectedServices, total, proposalType);

        const { data, error } = await sendEmailOrFail({
            from: process.env.EMAIL_FROM || 'Compre Sua Foto <contato@econti.com.br>',
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

/**
 * Envia contrato de prestação de serviços renovado com anexo PDF
 */
exports.sendContractEmail = async (email, clientName, pdfBuffer) => {
    try {
        const currentYear = new Date().getFullYear();

        const { data, error } = await sendEmailOrFail({
            from: process.env.EMAIL_FROM || 'Compre Sua Foto <contato@econti.com.br>',
            to: [email],
            subject: `Contrato de Prestação de Serviços Renovado - ${clientName || 'CONTI Marketing Digital'} ✍️`,
            attachments: [
                {
                    filename: `contrato_${String(clientName || 'cliente').replace(/\s+/g, '_').toLowerCase()}.pdf`,
                    content: pdfBuffer,
                }
            ],
            html: `
                <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #000; padding: 40px; text-align: center;">
                            <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Renovação Contratual</h2>
                            <p style="color: #2563eb; margin: 10px 0 0; font-weight: bold;">Contrato de Prestação de Serviços Renovado por 6 Meses 📎</p>
                        </div>
                        <div style="padding: 40px;">
                            <p>Olá, <strong>${clientName}</strong>!</p>
                            <p>Esperamos que esteja tudo bem.</p>
                            <p>Estamos enviando em anexo o seu contrato de prestação de serviços de marketing digital renovado pelo período de **6 meses** para o ciclo atual.</p>
                            <p>Por favor, analise o documento anexo. Caso tenha qualquer dúvida, estamos à inteira disposição para ajustes.</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p><strong>EDUARDA CONTI & FERNANDO</strong></p>
                            <p>&copy; ${currentYear} & CONTI Marketing Digital</p>
                        </div>
                    </div>
                </div>
            `
        });

        return { success: !error, data, error };
    } catch (err) {
        console.error('[CONTRACT EMAIL ERROR]:', err);
        return { success: false, error: err.message };
    }
};

exports.sendContractSignatureLinkEmail = async (email, clientName, pdfBuffer, contractLink) => {
    try {
        const currentYear = new Date().getFullYear();

        const { data, error } = await sendEmailOrFail({
            from: process.env.EMAIL_FROM || 'Compre Sua Foto <contato@econti.com.br>',
            to: [email],
            subject: `Assine seu contrato - ${clientName || 'CONTI Marketing Digital'}`,
            attachments: [
                {
                    filename: `contrato_${String(clientName || 'cliente').replace(/\s+/g, '_').toLowerCase()}.pdf`,
                    content: pdfBuffer,
                }
            ],
            html: `
                <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #000; padding: 40px; text-align: center;">
                            <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Contrato pronto para assinatura</h2>
                            <p style="color: #2563eb; margin: 10px 0 0; font-weight: bold;">Clique no link abaixo para revisar e assinar</p>
                        </div>
                        <div style="padding: 40px;">
                            <p>Olá, <strong>${clientName}</strong>!</p>
                            <p>Segue em anexo o contrato em PDF e o link para assinatura digital.</p>
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="${contractLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; letter-spacing: 1px; text-transform: uppercase;">
                                    Assinar contrato
                                </a>
                            </div>
                            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Se o botão não abrir, copie e cole este link no navegador:</p>
                            <p style="word-break: break-all; color: #2563eb; font-size: 13px;">${contractLink}</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p><strong>EDUARDA CONTI & FERNANDO</strong></p>
                            <p>&copy; ${currentYear} & CONTI Marketing Digital</p>
                        </div>
                    </div>
                </div>
            `
        });

        return { success: !error, data, error };
    } catch (err) {
        console.error('[CONTRACT SIGN LINK EMAIL ERROR]:', err);
        return { success: false, error: err.message };
    }
};

exports.sendSignedContractEmail = async (email, clientName, pdfBuffer) => {
    try {
        const currentYear = new Date().getFullYear();

        const { data, error } = await sendEmailOrFail({
            from: process.env.EMAIL_FROM || 'Compre Sua Foto <contato@econti.com.br>',
            to: [email],
            subject: `Contrato assinado - ${clientName || 'CONTI Marketing Digital'}`,
            attachments: [
                {
                    filename: `contrato_assinado_${String(clientName || 'cliente').replace(/\s+/g, '_').toLowerCase()}.pdf`,
                    content: pdfBuffer,
                }
            ],
            html: `
                <div style="background-color: #f8fafc; font-family: sans-serif; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <div style="background-color: #000; padding: 40px; text-align: center;">
                            <h2 style="color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Contrato assinado</h2>
                            <p style="color: #2563eb; margin: 10px 0 0; font-weight: bold;">Seu contrato assinado está em anexo</p>
                        </div>
                        <div style="padding: 40px;">
                            <p>Olá, <strong>${clientName}</strong>!</p>
                            <p>Recebemos sua assinatura e estamos enviando a versão final do contrato.</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p><strong>EDUARDA CONTI & FERNANDO</strong></p>
                            <p>&copy; ${currentYear} & CONTI Marketing Digital</p>
                        </div>
                    </div>
                </div>
            `
        });

        return { success: !error, data, error };
    } catch (err) {
        console.error('[SIGNED CONTRACT EMAIL ERROR]:', err);
        return { success: false, error: err.message };
    }
};

const escapeHtml = (value) => {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const fillClientTemplate = (value, client) => {
    return String(value ?? '')
        .replace(/\{nome\}/g, client.name || '')
        .replace(/\{cliente\}/g, client.name || '')
        .replace(/\{email\}/g, client.email || '')
        .replace(/\{cidade\}/g, client.cityState || '')
        .replace(/\{documento\}/g, client.document || '');
};

const paragraphsToHtml = (text) => {
    return String(text || '')
        .split(/\n{2,}/)
        .map(paragraph => paragraph.trim())
        .filter(Boolean)
        .map(paragraph => `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 18px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
};

exports.sendClientBroadcastEmail = async ({ clients, subject, preheader, body, ctaLabel, ctaUrl, replyTo, attachments = [] }) => {
    const results = [];
    const currentYear = new Date().getFullYear();
    const resendAttachments = attachments.map(file => ({
        filename: file.filename,
        content: file.content
    }));

    for (const client of clients) {
        const finalSubject = fillClientTemplate(subject, client);
        const finalPreheader = fillClientTemplate(preheader, client);
        const finalBody = fillClientTemplate(body, client);
        const finalCtaLabel = fillClientTemplate(ctaLabel, client);
        const finalCtaUrl = fillClientTemplate(ctaUrl, client);

        try {
            const { data, error } = await resend.emails.send({
                from: process.env.ECONTI_EMAIL_FROM || process.env.EMAIL_FROM || '& CONTI Marketing Digital <contato@econti.com.br>',
                to: [client.email],
                subject: finalSubject,
                ...(replyTo ? { replyTo } : {}),
                ...(resendAttachments.length ? { attachments: resendAttachments } : {}),
                html: `
                    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
                        <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
                            ${escapeHtml(finalPreheader)}
                        </span>
                        <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
                            <div style="overflow:hidden;border-radius:18px;background:#ffffff;border:1px solid #e2e8f0;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
                                <div style="background:#050505;padding:34px 34px 30px;text-align:left;">
                                    <div style="color:#0ea5e9;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">&amp; CONTI</div>
                                    <h1 style="color:#ffffff;font-size:24px;line-height:1.2;margin:0;font-weight:700;">Marketing Digital</h1>
                                    <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:10px 0 0;">${escapeHtml(finalPreheader || 'Uma mensagem importante para você.')}</p>
                                </div>
                                <div style="padding:34px;">
                                    <p style="color:#0f172a;font-size:16px;line-height:1.7;margin:0 0 18px;">Olá, <strong>${escapeHtml(client.name || 'cliente')}</strong>.</p>
                                    ${paragraphsToHtml(finalBody)}
                                    ${finalCtaLabel && finalCtaUrl ? `
                                        <div style="margin:30px 0 6px;text-align:left;">
                                            <a href="${escapeHtml(finalCtaUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;padding:15px 24px;font-size:14px;font-weight:800;letter-spacing:.4px;">
                                                ${escapeHtml(finalCtaLabel)}
                                            </a>
                                        </div>
                                    ` : ''}
                                </div>
                                <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 34px;text-align:left;">
                                    <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
                                        &copy; ${currentYear} &amp; CONTI Marketing Digital. Em caso de dúvidas, responda este e-mail.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            });

            results.push({
                clientId: client.id,
                name: client.name,
                email: client.email,
                success: !error,
                id: data?.id,
                error: error?.message || error || null
            });
        } catch (error) {
            results.push({
                clientId: client.id,
                name: client.name,
                email: client.email,
                success: false,
                error: error.message
            });
        }
    }

    return {
        sent: results.filter(item => item.success).length,
        failed: results.filter(item => !item.success).length,
        results
    };
};
