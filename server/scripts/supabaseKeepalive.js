const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../prisma/generated-client');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required to run the Supabase keepalive query.');
    process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log('Supabase keepalive query succeeded.');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    console.error('Supabase keepalive query failed:', error.message);
    process.exitCode = 1;
});
