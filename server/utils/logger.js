const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../startup_check.log');

function logToFile(msg) {
    try {
        const timestamp = new Date().toISOString();
        const dir = path.dirname(LOG_FILE);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.appendFileSync(LOG_FILE, `${timestamp} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file:', e.message);
    }
}

module.exports = { logToFile };
