const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const upload = require('../middlewares/upload');
const { authenticate, isAdmin, optionalAuth } = require('../middlewares/auth');

// Updated to support multiple photo uploads during event creation with explicit limits
const eventUploads = upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'photos', maxCount: 1000 } // Support up to 1000 photos per event
]);

const photoController = require('../controllers/photoController');

router.post('/', authenticate, isAdmin, eventUploads, eventController.createEvent);
router.post('/from-drive', authenticate, isAdmin, upload.single('coverImage'), eventController.createEventFromDrive);
router.get('/', eventController.getEvents);
router.get('/:id', optionalAuth, eventController.getEventById);
router.put('/:id', authenticate, isAdmin, eventUploads, eventController.updateEvent);
router.delete('/:id', authenticate, isAdmin, eventController.deleteEvent);
router.post('/:id/reindex', authenticate, isAdmin, photoController.reindexEventPhotos);

module.exports = router;
