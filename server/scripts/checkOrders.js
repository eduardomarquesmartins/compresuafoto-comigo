const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { user: true }
        });
        console.log('LAST 5 ORDERS:');
        console.log(JSON.stringify(orders, null, 2));

        const count = await prisma.order.count();
        console.log('TOTAL ORDERS:', count);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
