const prisma = require('../lib/prisma');

// Monkey-patch for missing proposal model if Prisma Client hasn't been regenerated/reloaded
if (!prisma.proposal) {
    console.log('Monkey-patching prisma.proposal with raw query fallbacks...');
    prisma.proposal = {
        aggregate: async ({ _sum, where }) => {
            if (where?.status === 'APPROVED') {
                const result = await prisma.$queryRawUnsafe(`SELECT SUM(total) as total FROM "Proposal" WHERE status = 'APPROVED'`);
                return { _sum: { total: Number(result[0]?.total || 0) } };
            }
            return { _sum: { total: 0 } };
        },
        count: async ({ where } = {}) => {
            const status = where?.status;
            const query = status ? `SELECT COUNT(*) as count FROM "Proposal" WHERE status = $1` : `SELECT COUNT(*) as count FROM "Proposal"`;
            const result = status ? await prisma.$queryRawUnsafe(query, status) : await prisma.$queryRawUnsafe(query);
            return Number(result[0]?.count || 0);
        },
        findMany: async ({ where } = {}) => {
            const sevenDaysAgo = where?.createdAt?.gte;
            if (sevenDaysAgo) {
                const result = await prisma.$queryRawUnsafe(
                    `SELECT total, "createdAt" FROM "Proposal" WHERE status = 'APPROVED' AND "createdAt" >= $1`,
                    sevenDaysAgo
                );
                return result.map(p => ({ ...p, createdAt: new Date(p.createdAt) }));
            }
            return [];
        }
    };
}

exports.getStats = async (req, res) => {
    try {
        const totalSales = await prisma.order.aggregate({
            _sum: {
                total: true
            },
            where: {
                status: 'PAID'
            }
        });

        const totalProposals = await prisma.proposal.aggregate({
            _sum: {
                total: true
            },
            where: {
                status: 'APPROVED'
            }
        });

        const combinedRevenue = (totalSales._sum.total || 0) + (totalProposals._sum.total || 0);

        const totalOrders = await prisma.order.count();
        const paidOrders = await prisma.order.count({ where: { status: 'PAID' } });
        const approvedProposalsCount = await prisma.proposal.count({ where: { status: 'APPROVED' } });
        const totalEvents = await prisma.event.count();
        const totalPhotos = await prisma.photo.count();

        res.json({
            revenue: combinedRevenue,
            totalOrders: totalOrders + approvedProposalsCount,
            paidOrders: paidOrders + approvedProposalsCount,
            totalEvents,
            totalPhotos
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

exports.getChartData = async (req, res) => {
    try {
        // Group orders by date (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                },
                status: 'PAID'
            },
            select: {
                total: true,
                createdAt: true
            }
        });

        const approvedProposals = await prisma.proposal.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo
                },
                status: 'APPROVED'
            },
            select: {
                total: true,
                createdAt: true
            }
        });

        // Format data for chart (e.g., sum per day)
        const chartData = {}; // 'YYYY-MM-DD': total

        orders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            chartData[date] = (chartData[date] || 0) + order.total;
        });

        approvedProposals.forEach(proposal => {
            const date = proposal.createdAt.toISOString().split('T')[0];
            chartData[date] = (chartData[date] || 0) + proposal.total;
        });

        // Ensure all last 7 days are present
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            result.push({
                date: dateStr, // client can format '10/02'
                sales: chartData[dateStr] || 0
            });
        }

        res.json(result);

    } catch (error) {
        console.error('Chart Data Error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
};
