const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const upload = require('../middlewares/upload');
const { authenticate, isAdmin, optionalAuth } = require('../middlewares/auth');
const rateLimit = require('../middlewares/rateLimit');



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

// Rate limit for face search to prevent AWS cost abuse
const searchLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post('/direct-upload-urls', authenticate, isAdmin, photoController.createDirectUploadUrls);
router.post('/register-direct-upload', authenticate, isAdmin, photoController.registerDirectUploads);
router.post('/upload', authenticate, isAdmin, uploadMiddleware, photoController.uploadPhotos);

// Search photos by face (upload selfie) — rate limited
router.post('/search', optionalAuth, searchLimiter, upload.single('selfie'), photoController.searchPhotos);

module.exports = router;
