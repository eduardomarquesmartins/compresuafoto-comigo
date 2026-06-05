const prisma = require('../lib/prisma');
const emailService = require('../services/email');

const normalizeList = (value) => {
    return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
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
            replyTo
        });

        res.json({
            totalClients: clients.length,
            totalRecipients: recipients.length,
            skippedWithoutEmail: clients.length - recipients.length,
            ...result
        });
    } catch (error) {
        console.error('[CLIENT EMAIL ERROR]:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail para clientes: ' + error.message });
    }
};
