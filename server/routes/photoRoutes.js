const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const upload = require('../middlewares/upload');
const { authenticate, isAdmin } = require('../middlewares/auth');

// Upload array of photos
const fs = require('fs');
const path = require('path');

// Wrapper to debug middleware errors
const uploadMiddleware = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            console.error('Multer Error:', err);
            return res.status(500).json({ error: 'Upload Error: ' + err.message });
        }
        next();
    });
};

router.post('/direct-upload-urls', authenticate, isAdmin, photoController.createDirectUploadUrls);
router.post('/register-direct-upload', authenticate, isAdmin, photoController.registerDirectUploads);
router.post('/upload', authenticate, isAdmin, uploadMiddleware, photoController.uploadPhotos);

// Search photos by face (upload selfie)
router.post('/search', upload.single('selfie'), photoController.searchPhotos);

module.exports = router;
