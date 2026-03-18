const fs = require('fs');
const path = require('path');

function logToFile(msg, filename = 'payments.log') {
    try {
        const timestamp = new Date().toISOString();
        const logPath = path.join(__dirname, '../logs', filename);
        const dir = path.dirname(logPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.appendFileSync(logPath, `${timestamp} - ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file:', e.message);
    }
}

module.exports = { logToFile };
