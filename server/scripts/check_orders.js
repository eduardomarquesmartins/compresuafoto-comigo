const prisma = require('../lib/prisma');

async function main() {
    try {
        const lastOrders = await prisma.order.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });

        console.log('--- Last 10 Orders ---');
        lastOrders.forEach(order => {
            console.log(`ID: ${order.id} | PublicId: ${order.publicId} | Status: ${order.status} | Total: R$ ${order.total} | User: ${order.user?.email} | CreatedAt: ${order.createdAt}`);
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
