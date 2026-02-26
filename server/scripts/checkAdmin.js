const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });
        console.log('ADMIN USER DATA:');
        if (admin) {
            console.log({ id: admin.id, email: admin.email, role: admin.role });
        } else {
            console.log('NO ADMIN USER FOUND');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
