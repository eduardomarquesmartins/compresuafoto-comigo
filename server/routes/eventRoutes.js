const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const upload = require('../middlewares/upload');

// Updated to support multiple photo uploads during event creation with explicit limits
const eventUploads = upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'photos', maxCount: 1000 } // Support up to 1000 photos per event
]);

const photoController = require('../controllers/photoController');

router.post('/', eventUploads, eventController.createEvent);
router.post('/from-drive', upload.single('coverImage'), eventController.createEventFromDrive);
router.get('/', eventController.getEvents);
router.get('/:id', eventController.getEventById);
router.put('/:id', eventUploads, eventController.updateEvent);
router.delete('/:id', eventController.deleteEvent);
router.post('/:id/reindex', photoController.reindexEventPhotos);

module.exports = router;
