const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const upload = require('../middlewares/upload');

// Upload array of photos
const fs = require('fs');
const path = require('path');

// Wrapper to debug middleware errors
const uploadMiddleware = (req, res, next) => {
    console.log('DEBUG: Router Hit /upload endpoint');

    // Using .any() to avoid file count limits (previously crashed at 50)
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('DEBUG: Multer Error:', err);
            return res.status(500).json({ error: 'Upload Middleware Error: ' + err.message });
        }
        console.log('DEBUG: Multer Success, files received:', req.files ? req.files.length : 0);
        next();
    });
};

router.post('/upload', uploadMiddleware, photoController.uploadPhotos);

// Search photos by face (upload selfie)
router.post('/search', upload.single('selfie'), photoController.searchPhotos);

module.exports = router;
