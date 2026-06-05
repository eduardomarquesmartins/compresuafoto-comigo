const contractService = require('../services/contractService');
const prisma = require('../lib/prisma');

const sanitizeFileName = (value) => {
    return String(value || 'contrato')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
};

exports.generateContract = async (req, res) => {
    try {
        const { clientName, clientDocument } = req.body;

        if (!clientName || !clientDocument) {
            return res.status(400).json({ error: 'Nome/Razão social e CPF ou CNPJ são obrigatórios.' });
        }

        const pdfBuffer = await contractService.generateContractBuffer(req.body);
        const fileName = `contrato_${sanitizeFileName(clientName)}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[CONTRACT GENERATE ERROR]:', error);
        res.status(500).json({ error: 'Erro ao gerar contrato.' });
    }
};

exports.getContracts = async (req, res) => {
    try {
        const contracts = await prisma.contract.findMany({
            include: {
                client: {
                    select: {
                        name: true,
                        email: true,
                        document: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(contracts);
    } catch (err) {
        console.error('[GET CONTRACTS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar contratos.' });
    }
};

exports.createContract = async (req, res) => {
    try {
        const { clientId, scope, monthlyValue, durationMonths, paymentDay, startDate, contractDate } = req.body;
        if (!clientId || !scope || !monthlyValue) {
            return res.status(400).json({ error: 'Cliente, escopo e valor mensal são obrigatórios.' });
        }

        const parsedClientId = parseInt(clientId);
        const start = startDate ? new Date(startDate) : new Date();
        const duration = parseInt(durationMonths || 6);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);

        const contract = await prisma.contract.create({
            data: {
                clientId: parsedClientId,
                scope,
                monthlyValue: parseFloat(monthlyValue),
                durationMonths: duration,
                paymentDay: parseInt(paymentDay || 25),
                startDate: start,
                endDate: end,
                status: 'ACTIVE',
                contractDate: contractDate || new Date().toLocaleDateString("pt-BR")
            },
            include: {
                client: true
            }
        });
        res.status(201).json(contract);
    } catch (err) {
        console.error('[CREATE CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar contrato: ' + err.message });
    }
};

exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.contract.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Contrato excluído com sucesso.' });
    } catch (err) {
        console.error('[DELETE CONTRACT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir contrato.' });
    }
};

