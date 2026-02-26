const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_R5nTJJnG_PrJBBCwhqbSvMh9TNU4y4WPj');

/**
 * Envia e-mail de confirmação de pedido com link de download
 * @param {string} email - E-mail do cliente
 * @param {string} orderId - ID público do pedido
 * @param {number} photosCount - Quantidade de fotos
 * @param {string} [clientUrl] - URL do cliente (opcional)
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
                        <a href="${downloadLink}" 
                           style="background-color: #0044ff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                           BAIXAR MINHAS FOTOS
                        </a>
                    </div>

                    <p style="font-size: 14px; color: #666;">
                        Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:<br>
                        <a href="${downloadLink}">${downloadLink}</a>
                    </p>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Compre Sua Foto - Todos os direitos reservados.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('[EMAIL ERROR]:', error);
            return { success: false, error };
        }

        console.log('[EMAIL SENT]:', data.id);
        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL EXCEPTION]:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Envia e-mail de recuperação de senha
 * @param {string} email - E-mail do cliente
 * @param {string} resetLink - Link base ou completo de recuperação
 * @param {string} [clientUrl] - URL do cliente (opcional)
 */
exports.sendPasswordResetEmail = async (email, resetLink, clientUrl = null) => {
    try {
        let finalLink = resetLink;
        if (clientUrl) {
            let finalClientUrl = clientUrl;
            if (!finalClientUrl.startsWith('http')) {
                finalClientUrl = `http://${finalClientUrl}`;
            }
            finalLink = `${finalClientUrl}/forgot-password?token=${resetLink}`;
        }

        const { data, error } = await resend.emails.send({
            from: 'contato@compresuafoto.econticomigo.com.br',
            to: [email],
            subject: 'Recuperação de Senha - Compre Sua Foto 🔐',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
                    <h1 style="color: #0044ff;">Recuperar sua senha</h1>
                    <p style="font-size: 16px;">Você solicitou a alteração de sua senha. Clique no botão abaixo para criar uma nova senha:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${resetLink}" 
                           style="background-color: #0044ff; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                           REDEFINIR MINHA SENHA
                        </a>
                    </div>

                    <p style="font-size: 14px; color: #666;">
                        Este link expira em 1 hora. Se você não solicitou essa alteração, ignore este e-mail.
                    </p>

                    <p style="font-size: 14px; color: #666; margin-top: 20px;">
                        Se o botão acima não funcionar, copie e cole o link abaixo:<br>
                        <a href="${resetLink}">${resetLink}</a>
                    </p>

                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        Compre Sua Foto - Todos os direitos reservados.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('[EMAIL ERROR]:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[EMAIL EXCEPTION]:', err);
        return { success: false, error: err.message };
    }
};
