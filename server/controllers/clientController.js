const prisma = require('../lib/prisma');

exports.getClients = async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            include: {
                contracts: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json(clients);
    } catch (err) {
        console.error('[GET CLIENTS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
};

exports.createClient = async (req, res) => {
    try {
        const { name, email, document, phone, address, cityState, signerName, signerDocument } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e E-mail são obrigatórios.' });
        }
        
        // Verificar se e-mail já existe
        const existing = await prisma.client.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Já existe um cliente cadastrado com este e-mail.' });
        }

        const client = await prisma.client.create({
            data: {
                name,
                email,
                document,
                phone,
                address,
                cityState,
                signerName,
                signerDocument,
                status: 'ACTIVE'
            }
        });
        res.status(201).json(client);
    } catch (err) {
        console.error('[CREATE CLIENT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar cliente: ' + err.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, document, phone, address, cityState, signerName, signerDocument, status } = req.body;
        
        const client = await prisma.client.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                document,
                phone,
                address,
                cityState,
                signerName,
                signerDocument,
                status
            }
        });
        res.json(client);
    } catch (err) {
        console.error('[UPDATE CLIENT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.client.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Cliente excluído com sucesso.' });
    } catch (err) {
        console.error('[DELETE CLIENT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir cliente.' });
    }
};
