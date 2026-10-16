const prisma = require('../lib/prisma');
const fs = require('fs');
const cloudinaryService = require('../services/cloudinary');

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
        // Keep the client directory readable while an additive photo migration
        // is pending on an existing database. Photo upload remains unavailable
        // until Client.photoUrl is added by the migration.
        if (err.code === 'P2022' && err.meta?.column === 'Client.photoUrl') {
            try {
                const clients = await prisma.client.findMany({
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        document: true,
                        phone: true,
                        address: true,
                        cityState: true,
                        signerName: true,
                        signerDocument: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                        contracts: true
                    },
                    orderBy: { name: 'asc' }
                });
                return res.json(clients.map((client) => ({ ...client, photoUrl: null })));
            } catch (fallbackError) {
                console.error('[GET CLIENTS FALLBACK ERROR]:', fallbackError);
            }
        }
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

exports.updateClientPhoto = async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Selecione uma foto JPG, PNG ou WEBP.' });

    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Cliente inválido.' });

        const existingClient = await prisma.client.findUnique({ where: { id } });
        if (!existingClient) return res.status(404).json({ error: 'Cliente não encontrado.' });

        const buffer = fs.readFileSync(file.path);
        const uploaded = await cloudinaryService.uploadStream(buffer, 'clients/profiles');
        const updatedClient = await prisma.client.update({ where: { id }, data: { photoUrl: uploaded.secure_url } });

        const oldPhotoId = cloudinaryService.extractPublicId(existingClient.photoUrl);
        const newPhotoId = uploaded.public_id;
        if (oldPhotoId && oldPhotoId !== newPhotoId) await cloudinaryService.deleteFile(oldPhotoId);

        res.json(updatedClient);
    } catch (error) {
        console.error('[UPDATE CLIENT PHOTO ERROR]:', error);
        res.status(500).json({ error: 'Não foi possível salvar a foto do cliente.' });
    } finally {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
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
