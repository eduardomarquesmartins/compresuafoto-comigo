const prisma = require('../lib/prisma');

exports.getFinancials = async (req, res) => {
    try {
        const { month, year, type } = req.query;

        const where = {};
        
        if (type && (type === 'INCOME' || type === 'EXPENSE')) {
            where.type = type;
        }

        // Se mês e ano forem fornecidos, filtrar por esse período usando Date.UTC
        if (month && year) {
            const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));
            where.date = {
                gte: startDate,
                lte: endDate
            };
        }

        const financials = await prisma.financialRecord.findMany({
            where,
            include: {
                client: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.json(financials);
    } catch (err) {
        console.error('[GET FINANCIALS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar registros financeiros.' });
    }
};

exports.createFinancial = async (req, res) => {
    try {
        const { type, description, amount, date, category, status, clientId } = req.body;
        if (!type || !description || !amount || !category) {
            return res.status(400).json({ error: 'Tipo, descrição, valor e categoria são obrigatórios.' });
        }

        const record = await prisma.financialRecord.create({
            data: {
                type,
                description,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                category,
                status: status || 'PENDING',
                clientId: clientId ? parseInt(clientId) : null
            },
            include: {
                client: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.status(201).json(record);
    } catch (err) {
        console.error('[CREATE FINANCIAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao criar registro financeiro.' });
    }
};

exports.updateFinancial = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, description, amount, date, category, status, clientId } = req.body;

        const record = await prisma.financialRecord.update({
            where: { id: parseInt(id) },
            data: {
                type,
                description,
                amount: amount ? parseFloat(amount) : undefined,
                date: date ? new Date(date) : undefined,
                category,
                status,
                clientId: clientId !== undefined ? (clientId ? parseInt(clientId) : null) : undefined
            },
            include: {
                client: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.json(record);
    } catch (err) {
        console.error('[UPDATE FINANCIAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao atualizar registro financeiro.' });
    }
};

exports.deleteFinancial = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.financialRecord.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Lançamento financeiro excluído com sucesso.' });
    } catch (err) {
        console.error('[DELETE FINANCIAL ERROR]:', err);
        res.status(500).json({ error: 'Erro ao excluir lançamento financeiro.' });
    }
};

exports.getFinancialStats = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ error: 'Mês e ano são obrigatórios.' });
        }

        const startDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(parseInt(year), parseInt(month), 0, 23, 59, 59, 999));

        // Agregado de Entradas
        const incomes = await prisma.financialRecord.aggregate({
            _sum: {
                amount: true
            },
            where: {
                type: 'INCOME',
                status: 'PAID',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Agregado de Saídas
        const expenses = await prisma.financialRecord.aggregate({
            _sum: {
                amount: true
            },
            where: {
                type: 'EXPENSE',
                status: 'PAID',
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Previsão recorrente: soma do valor mensal de todos os contratos ATIVOS
        const activeContractsSum = await prisma.contract.aggregate({
            _sum: {
                monthlyValue: true
            },
            where: {
                status: 'ACTIVE'
            }
        });

        const totalIncomes = incomes._sum.amount || 0;
        const totalExpenses = expenses._sum.amount || 0;
        const balance = totalIncomes - totalExpenses;
        const forecast = activeContractsSum._sum.monthlyValue || 0;

        res.json({
            incomes: totalIncomes,
            expenses: totalExpenses,
            balance,
            forecast
        });
    } catch (err) {
        console.error('[GET FINANCIAL STATS ERROR]:', err);
        res.status(500).json({ error: 'Erro ao buscar métricas financeiras.' });
    }
};
