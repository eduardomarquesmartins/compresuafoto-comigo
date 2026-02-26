const dotenv = require('dotenv');
dotenv.config();
const prisma = require('./lib/prisma');

async function checkEvents() {
    try {
        await prisma.$connect();
        const allEvents = await prisma.event.findMany();
        console.log('Total events in DB:', allEvents.length);
        console.log('Events by status:');
        const statusCount = allEvents.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
        }, {});
        console.log(JSON.stringify(statusCount, null, 2));

        if (allEvents.length > 0) {
            console.log('First event sample:', JSON.stringify({
                id: allEvents[0].id,
                name: allEvents[0].name,
                status: allEvents[0].status
            }, null, 2));
        }

        await prisma.$disconnect();
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

checkEvents();
