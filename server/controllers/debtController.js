const prisma = require('../lib/prisma');

exports.getDebts = async (req, res) => {
    try {
        const debts = await prisma.debt.findMany({
            orderBy: [
                { isCnpj: 'asc' },
                { priority: 'asc' }
            ]
        });
        res.json(debts);
    } catch (err) {
        console.error('[GET DEBTS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar dívidas.' });
    }
};

exports.createDebt = async (req, res) => {
    try {
        const { priority, credor, holder, originalAmount, bestOffer, type, status, obs, isCnpj } = req.body;
        if (!credor || originalAmount === undefined) {
            return res.status(400).json({ error: 'Credor e valor original são obrigatórios.' });
        }

        const debt = await prisma.debt.create({
            data: {
                priority: priority || '',
                credor,
                holder: holder || '',
                originalAmount: parseFloat(originalAmount),
                bestOffer: parseFloat(bestOffer !== undefined ? bestOffer : originalAmount),
                type: type || 'Outros',
                status: status || 'Negociar',
                obs: obs || '',
                isCnpj: isCnpj === true || isCnpj === 'true'
            }
        });
        res.status(201).json(debt);
    } catch (err) {
        console.error('[CREATE DEBT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar dívida.' });
    }
};

exports.updateDebt = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority, credor, holder, originalAmount, bestOffer, type, status, obs, isCnpj } = req.body;

        const debt = await prisma.debt.update({
            where: { id: parseInt(id) },
            data: {
                priority,
                credor,
                holder,
                originalAmount: originalAmount !== undefined ? parseFloat(originalAmount) : undefined,
                bestOffer: bestOffer !== undefined ? parseFloat(bestOffer) : undefined,
                type,
                status,
                obs,
                isCnpj: isCnpj !== undefined ? (isCnpj === true || isCnpj === 'true') : undefined
            }
        });
        res.json(debt);
    } catch (err) {
        console.error('[UPDATE DEBT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao atualizar dívida.' });
    }
};

exports.deleteDebt = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.debt.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Dívida excluída com sucesso.' });
    } catch (err) {
        console.error('[DELETE DEBT ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir dívida.' });
    }
};
