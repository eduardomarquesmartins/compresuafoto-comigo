const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const rekognitionService = require('../services/rekognition');
const cloudinaryService = require('../services/cloudinary');
const crypto = require('crypto');
const watermarkService = require('../services/watermark');
const s3Service = require('../services/s3');
const { logToFile } = require('../utils/logger');
const axios = require('axios');

exports.uploadPhotos = async (req, res) => {
    logToFile('uploadPhotos called');
    try {
        const { eventId, price } = req.body;
        const files = req.files;

        const parsedEventId = parseInt(eventId);
        console.log(`[LOG] uploadPhotos: EventID=${eventId} (Parsed: ${parsedEventId}), Files=${files ? files.length : 0}`);
        logToFile(`EventID: ${eventId}, Files: ${files ? files.length : 0}`);

        if (isNaN(parsedEventId)) {
            console.error('[LOG] Erro: EventID inválido ou ausente:', eventId);
            return res.status(400).json({ error: 'Event ID inválido ou ausente' });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const event = await prisma.event.findUnique({
            where: { id: parsedEventId }
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const results = [];
        const errors = [];

        // Sequential processing to save RAM on Render (512MB)
        for (const file of files) {
            const originalFilename = file.originalname;
            console.log(`[LOG] Starting process for: ${originalFilename}`);
            logToFile(`Processing: ${originalFilename}`);

            try {
                // 1. Upload Original to S3
                const originalBuffer = fs.readFileSync(file.path);
                const originalFileNameS3 = `events/event_${eventId}/originals/${Date.now()}_${originalFilename.replace(/\s+/g, '_')}`;
                const originalUrl = await s3Service.uploadToS3(originalBuffer, originalFileNameS3, file.mimetype || 'image/jpeg');

                // 2. Resize & Watermark
                console.log(`[LOG] Sharp: Generating watermark for ${originalFilename}...`);
                let watermarkedBuffer = await watermarkService.generateWatermark(file.path);
                console.log(`[LOG] Sharp: Watermark OK (${watermarkedBuffer.length} bytes)`);

                // 3. Upload Watermarked to S3
                console.log(`[LOG] S3: Uploading watermarked ${originalFilename}...`);
                const watermarkedFileNameS3 = `events/event_${eventId}/watermarked/${Date.now()}_wm_${originalFilename.replace(/\s+/g, '_')}`;
                const watermarkedUrl = await s3Service.uploadToS3(watermarkedBuffer, watermarkedFileNameS3, 'image/jpeg');
                console.log(`[LOG] S3: Watermarked OK -> ${watermarkedUrl}`);

                // Clear buffer
                watermarkedBuffer = null;

                // 4. Rekognition (Index Face)
                let embedding = null;
                try {
                    console.log(`[LOG] Rekognition: Indexing ${originalFilename}...`);
                    const bufferForRekognition = await sharp(file.path)
                        .rotate()
                        .resize(1000)
                        .toBuffer();

                    embedding = await rekognitionService.indexFaces(bufferForRekognition);
                    console.log(`[LOG] Rekognition: OK (FaceID: ${embedding})`);
                } catch (awsError) {
                    console.error(`[LOG] Rekognition ERROR for ${originalFilename}:`, awsError.message);
                    logToFile(`AWS failed for ${originalFilename}: ${awsError.message}`);
                }

                // 5. Save to DB
                console.log(`[LOG] DB: Saving photo ${originalFilename} to event ${parsedEventId}...`);
                const priceValue = parseFloat(price) || 10.0;
                const photo = await prisma.photo.create({
                    data: {
                        originalUrl: originalUrl,
                        watermarkedUrl: watermarkedUrl,
                        price: priceValue,
                        eventId: parsedEventId,
                        embedding: embedding
                    }
                });
                console.log(`[LOG] DB: Photo saved with ID ${photo.id}`);

                results.push(photo.id);
                logToFile(`Success: ${originalFilename}`);

            } catch (err) {
                console.error(`[LOG] ERROR processing ${originalFilename}:`, err);
                logToFile(`Error processing file ${originalFilename}: ${err.message}`);
                errors.push({ file: originalFilename, error: err.message });
            } finally {
                // 6. Clean up temp file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        res.status(201).json({
            message: errors.length === 0 ? 'Photos uploaded successfully' : 'Upload completed with some errors',
            count: results.length,
            errors: errors.length > 0 ? errors : undefined,
            success: results.length
        });
    } catch (error) {
        logToFile(`CRITICAL UPLOAD ERROR: ${error.message}`);
        console.error('Upload Controller Error:', error);
        res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
};

exports.searchPhotos = async (req, res) => {
    try {
        const { eventId } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Selfie is required' });
        }

        // Read from disk storage
        let selfieBuffer = fs.readFileSync(req.file.path);

        console.log(`[SEARCH] Searching for faces in event ${eventId}, selfie size: ${selfieBuffer.length} bytes`);

        // AWS Rekognition has a 5MB limit for image bytes - resize if needed
        if (selfieBuffer.length > 5 * 1024 * 1024) {
            console.log(`[SEARCH] Selfie exceeds 5MB, resizing...`);
            selfieBuffer = await sharp(selfieBuffer).rotate().resize(1200).jpeg({ quality: 80 }).toBuffer();
            console.log(`[SEARCH] Resized selfie to ${selfieBuffer.length} bytes`);
        }

        // Use AWS Rekognition
        const matches = await rekognitionService.searchFacesByImage(selfieBuffer, eventId);

        console.log(`[SEARCH] Found ${matches.length} matching photos`);

        // Clean up temp file
        fs.unlinkSync(req.file.path);

        if (matches.length === 0) {
            // Check if backend logs showed "No face detected"
            // For now, we return empty but we could return a 200 with a message
            return res.json([]);
        }

        // Map to response format
        const responseData = matches.map(p => ({
            id: p.id,
            url: p.watermarkedUrl, // This acts as the preview URL
            price: p.price
        }));

        res.json(responseData);
    } catch (error) {
        console.error('[SEARCH ERROR]', error);
        // Clean up on error
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ error: error.message });
    }
};

exports.reindexEventPhotos = async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    logToFile(`reindexEventPhotos called for event ${eventId}`);

    try {
        // 1. Find all photos for this event where embedding is null
        const photosToReindex = await prisma.photo.findMany({
            where: {
                eventId: eventId,
                embedding: null
            }
        });

        if (photosToReindex.length === 0) {
            return res.json({ message: 'No photos found needing re-indexing for this event.', count: 0 });
        }

        logToFile(`Found ${photosToReindex.length} photos to re-index for event ${eventId}`);

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        const pLimit = require('p-limit');
        const limit = pLimit(3);

        await Promise.all(photosToReindex.map(photo => limit(async () => {
            try {
                logToFile(`Re-indexing photo ${photo.id}: downloading from ${photo.originalUrl}`);

                // 2. Download original image
                const response = await axios.get(photo.originalUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                // 3. Prepare for Rekognition (rotate/resize)
                let bufferForRekognition = buffer;
                if (buffer.length > 5 * 1024 * 1024) {
                    bufferForRekognition = await sharp(buffer).rotate().resize(1200).toBuffer();
                } else {
                    bufferForRekognition = await sharp(buffer).rotate().toBuffer();
                }

                // 4. Call Rekognition indexFaces
                const embedding = await rekognitionService.indexFaces(bufferForRekognition);

                if (embedding) {
                    // 5. Update DB
                    await prisma.photo.update({
                        where: { id: photo.id },
                        data: { embedding: embedding }
                    });
                    results.success++;
                    logToFile(`Photo ${photo.id} re-indexed successfully. FaceId: ${embedding}`);
                } else {
                    results.failed++;
                    logToFile(`Photo ${photo.id} re-indexed: No face detected.`);
                }
            } catch (err) {
                logToFile(`Error re-indexing photo ${photo.id}: ${err.message}`);
                results.failed++;
                results.errors.push({ photoId: photo.id, error: err.message });
            }
        })));

        res.json({
            message: `Re-indexing completed.`,
            summary: results
        });

    } catch (error) {
        logToFile(`CRITICAL REINDEX ERROR for event ${eventId}: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error during re-indexing: ' + error.message });
    }
};
