const prisma = require('../lib/prisma');

exports.getStats = async (req, res) => {
    try {
        const totalSales = await prisma.order.aggregate({
            _sum: {
                total: true
            },
            where: {
                status: 'PAID' // Assuming status 'PAID' implies completed sale
            }
        });

        const totalOrders = await prisma.order.count();
        const paidOrders = await prisma.order.count({ where: { status: 'PAID' } });
        const totalEvents = await prisma.event.count();
        const totalPhotos = await prisma.photo.count();

        // Calculate percentage growth (mocked for now as we don't have historical data easily accessible without more complex queries)
        // In a real app, you'd compare with previous month.

        res.json({
            revenue: totalSales._sum.total || 0,
            totalOrders,
            paidOrders,
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

        // Format data for chart (e.g., sum per day)
        const chartData = {}; // 'YYYY-MM-DD': total

        orders.forEach(order => {
            const date = order.createdAt.toISOString().split('T')[0];
            chartData[date] = (chartData[date] || 0) + order.total;
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
