const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
} else {
    // In development, we use a global variable to prevent hot-reloading from creating 
    // multiple Prisma instances and exhausting the connection pool.
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

module.exports = prisma;
