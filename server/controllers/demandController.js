const prisma = require('../lib/prisma');

exports.getDemands = async (req, res) => {
    try {
        const demands = await prisma.mentoriaDemand.findMany({
            orderBy: [
                { status: 'desc' }, // priorizar urgentes e pendentes
                { area: 'asc' }
            ]
        });
        res.json(demands);
    } catch (err) {
        console.error('[GET DEMANDS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar demandas da mentoria.' });
    }
};

exports.createDemand = async (req, res) => {
    try {
        const { area, action, deadline, responsible, status, type, obs } = req.body;
        if (!area || !action || !responsible) {
            return res.status(400).json({ error: 'Área, ação/demanda e responsável são obrigatórios.' });
        }

        const demand = await prisma.mentoriaDemand.create({
            data: {
                area,
                action,
                deadline: deadline || '',
                responsible,
                status: status || 'Pendente',
                type: type || '',
                obs: obs || ''
            }
        });
        res.status(201).json(demand);
    } catch (err) {
        console.error('[CREATE DEMAND ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar demanda da mentoria.' });
    }
};

exports.updateDemand = async (req, res) => {
    try {
        const { id } = req.params;
        const { area, action, deadline, responsible, status, type, obs } = req.body;

        const demand = await prisma.mentoriaDemand.update({
            where: { id: parseInt(id) },
            data: {
                area,
                action,
                deadline,
                responsible,
                status,
                type,
                obs
            }
        });
        res.json(demand);
    } catch (err) {
        console.error('[UPDATE DEMAND ERROR]:', err);
        res.status(500).json({ error: 'Erro ao atualizar demanda da mentoria.' });
    }
};

exports.deleteDemand = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.mentoriaDemand.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Demanda excluída com sucesso.' });
    } catch (err) {
        console.error('[DELETE DEMAND ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir demanda da mentoria.' });
    }
};
