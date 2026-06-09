const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const prisma = require('../lib/prisma');

async function main() {
    console.log('Conectando ao banco de dados e buscando tabelas no schema public...');
    // Query para obter todas as tabelas no schema public do PostgreSQL (excluindo metadados do Prisma)
    const tables = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT LIKE '_prisma%';
    `;

    if (!tables || tables.length === 0) {
        console.log('Nenhuma tabela encontrada no schema public.');
        return;
    }

    console.log(`Encontradas ${tables.length} tabelas no schema public. Ativando RLS...`);

    for (const row of tables) {
        const tableName = row.tablename;
        console.log(` -> Ativando Row-Level Security (RLS) na tabela: "${tableName}"`);
        
        // Ativar RLS
        await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
    }

    console.log('\n[SUCESSO] RLS foi ativado em todas as tabelas do projeto!');
}

main()
    .catch((err) => {
        console.error('Erro ao executar ativação de RLS:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
