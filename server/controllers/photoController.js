const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const rekognitionService = require('../services/rekognition');
const watermarkService = require('../services/watermark');
const s3Service = require('../services/s3');
const { logToFile } = require('../utils/logger');
const axios = require('axios');

const isRawImage = (fileName = '') => fileName.toLowerCase().endsWith('.arw');

const sanitizeFileName = (fileName = 'photo.jpg') => {
    return fileName
        .replace(/[^\w.-]+/g, '_')
        .replace(/^_+/, '')
        .slice(0, 120) || 'photo.jpg';
};

exports.createDirectUploadUrls = async (req, res) => {
    try {
        const { eventId, files } = req.body;
        const parsedEventId = parseInt(eventId);

        if (isNaN(parsedEventId)) {
            return res.status(400).json({ error: 'Event ID inválido ou ausente' });
        }

        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo informado' });
        }

        const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const uploads = await Promise.all(files.map(async (file, index) => {
            const safeName = sanitizeFileName(file.name);
            const uniquePrefix = `${Date.now()}_${index}_${crypto.randomBytes(6).toString('hex')}`;
            const contentType = file.contentType || 'image/jpeg';

            const originalKey = `events/event_${parsedEventId}/originals/${uniquePrefix}_${safeName}`;
            const watermarkedKey = `events/event_${parsedEventId}/watermarked/${uniquePrefix}_wm_${safeName}`;
            const faceKey = `events/event_${parsedEventId}/face/${uniquePrefix}_face_${safeName}`;

            const [originalUploadUrl, watermarkedUploadUrl, faceUploadUrl] = await Promise.all([
                s3Service.getPresignedUploadUrl(originalKey, contentType),
                s3Service.getPresignedUploadUrl(watermarkedKey, 'image/jpeg'),
                s3Service.getPresignedUploadUrl(faceKey, 'image/jpeg'),
            ]);

            return {
                originalKey,
                watermarkedKey,
                faceKey,
                originalUrl: s3Service.getPublicUrl(originalKey),
                watermarkedUrl: s3Service.getPublicUrl(watermarkedKey),
                faceUrl: s3Service.getPublicUrl(faceKey),
                uploadUrls: {
                    original: originalUploadUrl,
                    watermarked: watermarkedUploadUrl,
                    face: faceUploadUrl,
                },
            };
        }));

        res.json({ uploads });
    } catch (error) {
        console.error('Create Direct Upload URLs Error:', error);
        res.status(500).json({ error: 'Falha ao gerar URLs de upload: ' + error.message });
    }
};

exports.registerDirectUploads = async (req, res) => {
    try {
        const { eventId, price, uploads } = req.body;
        const parsedEventId = parseInt(eventId);

        if (isNaN(parsedEventId)) {
            return res.status(400).json({ error: 'Event ID inválido ou ausente' });
        }

        if (!Array.isArray(uploads) || uploads.length === 0) {
            return res.status(400).json({ error: 'Nenhum upload informado' });
        }

        const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const priceValue = parseFloat(price) || 10.0;
        const createdPhotos = await Promise.all(uploads.map((upload) => {
            if (!upload.originalUrl || !upload.watermarkedUrl || !upload.faceKey) {
                throw new Error('Dados de upload incompletos');
            }

            return prisma.photo.create({
                data: {
                    originalUrl: upload.originalUrl,
                    watermarkedUrl: upload.watermarkedUrl,
                    price: priceValue,
                    eventId: parsedEventId,
                    embedding: null
                }
            }).then(photo => ({ photo, faceKey: upload.faceKey }));
        }));

        setImmediate(async () => {
            const bucket = s3Service.getBucketName();
            await Promise.all(createdPhotos.map(async ({ photo, faceKey }) => {
                try {
                    const embedding = await rekognitionService.indexFacesFromS3(bucket, faceKey);
                    if (embedding) {
                        await prisma.photo.update({
                            where: { id: photo.id },
                            data: { embedding }
                        });
                    }
                } catch (error) {
                    logToFile(`Direct upload Rekognition failed for photo ${photo.id}: ${error.message}`);
                }
            }));
        });

        res.status(201).json({
            message: 'Fotos registradas com sucesso',
            count: createdPhotos.length,
            photoIds: createdPhotos.map(({ photo }) => photo.id)
        });
    } catch (error) {
        console.error('Register Direct Upload Error:', error);
        res.status(500).json({ error: 'Falha ao registrar uploads: ' + error.message });
    }
};

exports.uploadPhotos = async (req, res) => {
    logToFile('uploadPhotos called');
    try {
        const { eventId, price } = req.body;
        const uploadedFiles = req.files || [];
        const files = uploadedFiles.filter(file => file.fieldname === 'photos');
        const watermarkedFiles = uploadedFiles.filter(file => file.fieldname === 'watermarkedPhotos');
        const faceFiles = uploadedFiles.filter(file => file.fieldname === 'facePhotos');

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

        const rawFile = files.find(file => isRawImage(file.originalname));
        if (rawFile) {
            return res.status(400).json({ error: 'Arquivos .ARW nao sao suportados neste servidor. Exporte as fotos em JPG antes do upload.' });
        }

        const event = await prisma.event.findUnique({
            where: { id: parsedEventId }
        });

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const results = [];
        const errors = [];

        const pLimit = require('p-limit');
        const limit = pLimit(5); // Concorrência de 5 fotos simultâneas para aproveitar 16GB RAM

        await Promise.all(files.map((file, index) => limit(async () => {
            const originalFilename = file.originalname;
            const watermarkedFile = watermarkedFiles[index];
            const faceFile = faceFiles[index];
            console.log(`[LOG] Starting process for: ${originalFilename}`);
            logToFile(`Processing: ${originalFilename}`);
            try {
                // 1. Upload Original to S3
                const originalBuffer = fs.readFileSync(file.path);
                const originalFileNameS3 = `events/event_${eventId}/originals/${Date.now()}_${originalFilename.replace(/\s+/g, '_')}`;
                const originalUrl = await s3Service.uploadToS3(originalBuffer, originalFileNameS3, file.mimetype || 'image/jpeg');

                // 2. Use client-side watermark when present. Fall back to server-side Sharp for legacy uploads.
                let watermarkedBuffer;
                if (watermarkedFile && fs.existsSync(watermarkedFile.path)) {
                    console.log(`[LOG] Using client-side watermark for ${originalFilename}...`);
                    watermarkedBuffer = fs.readFileSync(watermarkedFile.path);
                } else {
                    console.log(`[LOG] Sharp: Generating watermark for ${originalFilename}...`);
                    watermarkedBuffer = await watermarkService.generateWatermark(file.path);
                    console.log(`[LOG] Sharp: Watermark OK (${watermarkedBuffer.length} bytes)`);
                }

                // 3. Upload Watermarked to S3
                console.log(`[LOG] S3: Uploading watermarked ${originalFilename}...`);
                const watermarkedFileNameS3 = `events/event_${eventId}/watermarked/${Date.now()}_wm_${originalFilename.replace(/\s+/g, '_')}`;
                const watermarkedUrl = await s3Service.uploadToS3(watermarkedBuffer, watermarkedFileNameS3, 'image/jpeg');
                console.log(`[LOG] S3: Watermarked OK -> ${watermarkedUrl}`);

                // Clear buffer
                watermarkedBuffer = null;

                // 4. Save to DB (Status: Processing)
                console.log(`[LOG] DB: Saving photo ${originalFilename} to event ${parsedEventId}...`);
                const priceValue = parseFloat(price) || 10.0;
                const photo = await prisma.photo.create({
                    data: {
                        originalUrl: originalUrl,
                        watermarkedUrl: watermarkedUrl,
                        price: priceValue,
                        eventId: parsedEventId,
                        embedding: null // Will be updated in background
                    }
                });
                console.log(`[LOG] DB: Photo saved with ID ${photo.id}`);

                // 5. Rekognition (Index Face) - BACKGROUND PROCESS
                // Don't await this to keep request fast and avoid timeout
                setImmediate(async () => {
                    try {
                        console.log(`[BG] Rekognition: Indexing ${originalFilename} (Photo ID: ${photo.id})...`);
                        const bufferForRekognition = faceFile && fs.existsSync(faceFile.path)
                            ? fs.readFileSync(faceFile.path)
                            : await sharp(file.path)
                                .rotate()
                                .resize(1000)
                                .toBuffer();

                        const embedding = await rekognitionService.indexFaces(bufferForRekognition);
                        
                        if (embedding) {
                             await prisma.photo.update({
                                 where: { id: photo.id },
                                 data: { embedding: embedding }
                             });
                             console.log(`[BG] Rekognition: OK (FaceID: ${embedding})`);
                        }
                    } catch (awsError) {
                        console.error(`[BG] Rekognition ERROR for ${originalFilename}:`, awsError.message);
                        logToFile(`AWS failed for ${originalFilename}: ${awsError.message}`);
                    } finally {
                        // Clean up temp file in background
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                        if (watermarkedFile && fs.existsSync(watermarkedFile.path)) {
                            fs.unlinkSync(watermarkedFile.path);
                        }
                        if (faceFile && fs.existsSync(faceFile.path)) {
                            fs.unlinkSync(faceFile.path);
                        }
                    }
                });

                results.push(photo.id);
                logToFile(`Success (Queued): ${originalFilename}`);

            } catch (err) {
                console.error(`[LOG] ERROR processing ${originalFilename}:`, err);
                logToFile(`Error processing file ${originalFilename}: ${err.message}`);
                errors.push({ file: originalFilename, error: err.message });
                // Clean up on error if not handled by BG
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                if (watermarkedFile && fs.existsSync(watermarkedFile.path)) {
                    fs.unlinkSync(watermarkedFile.path);
                }
                if (faceFile && fs.existsSync(faceFile.path)) {
                    fs.unlinkSync(faceFile.path);
                }
            }
        })));

        res.status(202).json({
            message: errors.length === 0 ? 'Photos upload accepted for processing' : 'Upload accepted with some immediate errors',
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
        const parsedEventId = parseInt(eventId, 10);

        if (isNaN(parsedEventId)) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ error: 'ID do evento inválido ou ausente' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Selfie is required' });
        }

        // Read from disk storage
        let selfieBuffer = fs.readFileSync(req.file.path);

        console.log(`[SEARCH] Searching for faces in event ${parsedEventId}, selfie size: ${selfieBuffer.length} bytes`);

        // AWS Rekognition has a 5MB limit for image bytes - resize if needed
        if (selfieBuffer.length > 5 * 1024 * 1024) {
            console.log(`[SEARCH] Selfie exceeds 5MB, resizing...`);
            selfieBuffer = await sharp(selfieBuffer).rotate().resize(1200).jpeg({ quality: 80 }).toBuffer();
            console.log(`[SEARCH] Resized selfie to ${selfieBuffer.length} bytes`);
        }

        // Use AWS Rekognition
        const matches = await rekognitionService.searchFacesByImage(selfieBuffer, parsedEventId);

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
