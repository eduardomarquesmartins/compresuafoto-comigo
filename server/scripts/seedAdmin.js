const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const adminEmail = 'admin@econti.com.br';
    const adminPassword = '@admin2026'; // Updated as requested

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            password: hashedPassword,
            role: 'ADMIN'
        },
        create: {
            email: adminEmail,
            name: 'Administrador',
            password: hashedPassword,
            role: 'ADMIN'
        }
    });

    console.log('Admin user created/updated:', admin.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
