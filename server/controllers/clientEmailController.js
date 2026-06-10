const prisma = require('../lib/prisma');
const emailService = require('../services/email');

const normalizeList = (value) => {
    if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
        } catch {
            return value.split(',').map(Number).filter(Number.isFinite);
        }
    }

    return [];
};

const normalizeAttachments = (files = []) => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > 20 * 1024 * 1024) {
        const error = new Error('Os anexos devem somar no máximo 20 MB por envio.');
        error.statusCode = 400;
        throw error;
    }

    return files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
    }));
};

exports.sendClientEmail = async (req, res) => {
    try {
        const {
            mode = 'selected',
            clientIds = [],
            subject,
            preheader = '',
            body,
            ctaLabel = '',
            ctaUrl = '',
            replyTo = ''
        } = req.body;
        const attachments = normalizeAttachments(req.files || []);

        if (!subject || !body) {
            return res.status(400).json({ error: 'Assunto e mensagem sao obrigatorios.' });
        }

        const selectedIds = normalizeList(clientIds);
        const where = mode === 'active'
            ? { status: 'ACTIVE' }
            : mode === 'all'
                ? {}
                : { id: { in: selectedIds } };

        if (mode === 'selected' && selectedIds.length === 0) {
            return res.status(400).json({ error: 'Selecione ao menos um cliente.' });
        }

        const clients = await prisma.client.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                document: true,
                status: true,
                cityState: true
            },
            orderBy: { name: 'asc' }
        });

        const recipients = clients.filter(client => client.email);

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Nenhum cliente com e-mail valido foi encontrado.' });
        }

        const result = await emailService.sendClientBroadcastEmail({
            clients: recipients,
            subject,
            preheader,
            body,
            ctaLabel,
            ctaUrl,
            replyTo,
            attachments
        });

        res.json({
            totalClients: clients.length,
            totalRecipients: recipients.length,
            skippedWithoutEmail: clients.length - recipients.length,
            attachments: attachments.map(file => ({
                filename: file.filename,
                contentType: file.contentType
            })),
            ...result
        });
    } catch (error) {
        console.error('[CLIENT EMAIL ERROR]:', error);
        res.status(error.statusCode || 500).json({ error: 'Erro ao enviar e-mail para clientes: ' + error.message });
    }
};
