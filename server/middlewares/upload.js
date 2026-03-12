const multer = require('multer');

const fs = require('fs');
const path = require('path');

// Use disk storage for large uploads to avoid memory exhaustion (RAM limits)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/temp');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // Increased to 15MB limit per file
        files: 1000 // Support up to 1000 files per request
    }
});

module.exports = upload;
