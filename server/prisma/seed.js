const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    const email = 'admin@econti.com.br';
    const passwordRaw = '@econti2026';
    const hashedPassword = await bcrypt.hash(passwordRaw, 10);

    const user = await prisma.user.upsert({
        where: { email: email },
        update: {
            password: hashedPassword,
            role: 'ADMIN' // Ensure role is admin
        },
        create: {
            email: email,
            name: 'Admin E-Conti',
            password: hashedPassword,
            role: 'ADMIN',
        },
    });

    console.log({ user });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
