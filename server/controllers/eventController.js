const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const cloudinaryService = require('../services/cloudinary');
const watermarkService = require('../services/watermark');
const sharp = require('sharp');
const crypto = require('crypto');
const rekognitionService = require('../services/rekognition');
const googleDriveService = require('../services/googleDrive');
const s3Service = require('../services/s3');
const { logToFile } = require('../utils/logger');

exports.createEvent = async (req, res) => {
    logToFile('createEvent called');
    try {
        const { name, date, description } = req.body;
        let coverImage = null;

        // Cover Image Upload
        if (req.files && req.files['coverImage']) {
            const file = req.files['coverImage'][0];
            logToFile(`Uploading cover image: ${file.originalname}`);
            try {
                const buffer = fs.readFileSync(file.path);
                const result = await cloudinaryService.uploadStream(buffer, 'events/covers');
                coverImage = result.secure_url;
                logToFile('Cover image uploaded successfully');
                fs.unlinkSync(file.path); // Clean up
            } catch (cloudErr) {
                logToFile(`Cloudinary Error: ${cloudErr.message}`);
                // Try to clean up even on error
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                return res.status(500).json({ error: 'Cloudinary upload failed: ' + cloudErr.message });
            }
        }

        logToFile(`Creating event in DB: ${name}`);
        const event = await prisma.event.create({
            data: {
                name,
                date: new Date(date),
                description,
                coverImage,
                status: 'ACTIVE'
            }
        });
        logToFile(`Event created successfully: ID ${event.id}`);

        // Process Additional Photos in the background if provided
        const photos = req.files && req.files['photos'] ? req.files['photos'] : [];
        logToFile(`[UPLOAD] Fotos recebidas para processamento: ${photos.length}`);
        if (photos.length > 0) {
            logToFile(`Starting background processing for ${photos.length} photos for event ${event.id}`);

            // We DON'T await this so we can return the response immediately
            (async () => {
                const pLimit = require('p-limit');
                const limit = pLimit(3);

                await Promise.all(photos.map(file => limit(async () => {
                    try {
                        logToFile(`[BG] Processing photo: ${file.originalname}`);
                        const buffer = fs.readFileSync(file.path);

                        // 1. Upload Original to S3
                        const originalFileName = `events/event_${event.id}/originals/${Date.now()}_${file.originalname}`;
                        const originalUrl = await s3Service.uploadToS3(buffer, originalFileName, file.mimetype || 'image/jpeg');

                        // 2. Generate Watermark
                        const watermarkedBuffer = await watermarkService.generateWatermark(buffer);
                        const watermarkedFileName = `events/event_${event.id}/watermarked/${Date.now()}_wm_${file.originalname}`;
                        const watermarkedUrl = await s3Service.uploadToS3(watermarkedBuffer, watermarkedFileName, 'image/jpeg');

                        // 3. AWS Rekognition (Index Faces)
                        let embedding = null;
                        try {
                            let bufferForRekognition = buffer;
                            if (file.size > 5 * 1024 * 1024) {
                                bufferForRekognition = await sharp(buffer).rotate().resize(1200).toBuffer();
                            } else {
                                bufferForRekognition = await sharp(buffer).rotate().toBuffer();
                            }
                            embedding = await rekognitionService.indexFaces(bufferForRekognition);
                        } catch (awsError) {
                            logToFile(`[BG] AWS Rekognition Error for ${file.originalname}: ${awsError.message}`);
                        }

                        // 4. Save to DB
                        await prisma.photo.create({
                            data: {
                                eventId: event.id,
                                originalUrl: originalUrl,
                                watermarkedUrl: watermarkedUrl,
                                price: 10.0,
                                embedding: embedding
                            }
                        });
                        logToFile(`[BG] Photo ${file.originalname} processed successfully`);

                        // 5. Clean up temp file
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (photoErr) {
                        logToFile(`[BG] Error processing photo ${file.originalname}: ${photoErr.message}`);
                        // Try to clean up even on error
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    }
                })));
                logToFile(`[BG] Finished processing ${photos.length} photos for event ${event.id}`);
            })();
        }

        res.status(201).json(event);
    } catch (error) {
        logToFile(`Global Create Event Error: ${error.message}`);
        console.error("Create Event Error:", error);
        res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
};

exports.getEvents = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};

        // If status is provided, filter by it. 
        // If not, fetch all? Or default to ACTIVE?
        // Let's fetch all if no status specified, so client can filter.
        if (status) {
            where.status = status;
        }

        const events = await prisma.event.findMany({
            where,
            orderBy: {
                date: 'desc'
            },
            include: {
                // photos: true // Optional: do we need photos count?
                _count: {
                    select: { photos: true }
                }
            }
        });
        res.json(events);
    } catch (error) {
        console.error("Get Events Error:", error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await prisma.event.findUnique({
            where: { id: parseInt(id) },
            include: {
                photos: true
            }
        });

        if (!event) return res.status(404).json({ error: 'Event not found' });

        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event' });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, description, status } = req.body;

        const data = {};
        if (name) data.name = name;
        if (date) data.date = new Date(date);
        if (description !== undefined) data.description = description;
        if (status) data.status = status;

        if (req.file) {
            const result = await cloudinaryService.uploadStream(req.file.buffer, 'events/covers');
            data.coverImage = result.secure_url;
        }

        const event = await prisma.event.update({
            where: { id: parseInt(id) },
            data
        });

        res.json(event);
    } catch (error) {
        console.error("Update Event Error:", error);
        res.status(500).json({ error: 'Failed to update event' });
    }
};

exports.deleteEvent = async (req, res) => {
    logToFile(`deleteEvent called for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const eventId = parseInt(id);

        // 1. Fetch event and photos to get Cloudinary URLs
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { photos: true }
        });

        if (!event) {
            logToFile('Event not found for deletion');
            return res.status(404).json({ error: 'Event not found' });
        }

        // 2. Collect all Cloudinary URLs
        const urlsToDelete = [];
        if (event.coverImage) urlsToDelete.push(event.coverImage);

        event.photos.forEach(photo => {
            if (photo.originalUrl) urlsToDelete.push(photo.originalUrl);
            if (photo.watermarkedUrl) urlsToDelete.push(photo.watermarkedUrl);
        });

        logToFile(`Found ${urlsToDelete.length} assets to delete from Cloudinary`);

        // 3. Delete from Cloudinary
        for (const url of urlsToDelete) {
            const publicId = cloudinaryService.extractPublicId(url);
            if (publicId) {
                logToFile(`Deleting Cloudinary asset: ${publicId}`);
                await cloudinaryService.deleteFile(publicId);
            }
        }

        // 4. Delete from DB (associated photos first if no CASCADE in Schema)
        logToFile('Deleting records from DB');
        await prisma.photo.deleteMany({
            where: { eventId: eventId }
        });

        await prisma.event.delete({
            where: { id: eventId }
        });

        logToFile('Event and all assets deleted successfully');
        res.json({ message: 'Event and all associated assets deleted' });
    } catch (error) {
        logToFile(`Delete Event Error: ${error.message}`);
        console.error("Delete Event Error:", error);
        res.status(500).json({ error: 'Failed to delete event: ' + error.message });
    }
};

exports.createEventFromDrive = async (req, res) => {
    logToFile('createEventFromDrive called');
    try {
        if (!req.body) {
            return res.status(400).json({ error: 'Request body is missing. Ensure you are sending FormData.' });
        }
        const { name, date, description, folderId } = req.body;

        if (!folderId) {
            return res.status(400).json({ error: 'Folder ID is required' });
        }

        // 1. Listar arquivos da pasta do Drive
        logToFile(`Listing files from Drive folder: ${folderId}`);
        const files = await googleDriveService.listImagesFromFolder(folderId);

        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'No images found in the specified Google Drive folder' });
        }

        logToFile(`Found ${files.length} images to process`);

        // 2. Upload da capa se fornecida
        let coverImage = null;
        if (req.file) {
            logToFile(`Uploading provided cover image: ${req.file.originalname}`);
            try {
                const result = await cloudinaryService.uploadStream(req.file.buffer, 'events/covers');
                coverImage = result.secure_url;
                logToFile('Cover image uploaded successfully');
            } catch (cloudErr) {
                logToFile(`Cloudinary Cover Error: ${cloudErr.message}`);
                return res.status(500).json({ error: 'Cloudinary cover upload failed: ' + cloudErr.message });
            }
        }

        // 3. Criar o evento primeiro para ter o ID
        const event = await prisma.event.create({
            data: {
                name,
                date: new Date(date),
                description,
                coverImage,
                status: 'ACTIVE'
            }
        });

        // 4. Processar cada imagem (Download Drive -> Upload Cloudinary -> Salvar no DB)
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        // Procesamento sequencial para não sobrecarregar
        for (const file of files) {
            try {
                logToFile(`Processing file: ${file.name} (${file.id})`);

                // Download do Drive
                const buffer = await googleDriveService.downloadFile(file.id);

                // Gerar versão com marca d'água
                logToFile(`Generating watermark for: ${file.name}`);
                const watermarkedBuffer = await watermarkService.generateWatermark(buffer);
                const watermarkedFileName = `events/event_${event.id}/watermarked/${Date.now()}_wm_${file.name.replace(/\s+/g, '_')}`;
                const watermarkedUrl = await s3Service.uploadToS3(watermarkedBuffer, watermarkedFileName, 'image/jpeg');

                // Upload original para S3 (pasta específica do evento)
                const originalFileName = `events/event_${event.id}/originals/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const originalUrl = await s3Service.uploadToS3(buffer, originalFileName, file.mimeType || 'image/jpeg');

                // 4. Rekognition (Index Face)
                logToFile(`Starting AWS Rekognition for: ${file.name}`);
                let embedding = null;
                try {
                    // Garantir que a imagem esteja "limpa" e com orientação correta para a IA
                    let bufferForRekognition = buffer;
                    if (buffer.length > 5 * 1024 * 1024) {
                        logToFile('File > 5MB, resizing for Rekognition...');
                        bufferForRekognition = await sharp(buffer).rotate().resize(1200).toBuffer();
                    } else {
                        bufferForRekognition = await sharp(buffer).rotate().toBuffer();
                    }

                    embedding = await rekognitionService.indexFaces(bufferForRekognition);
                    logToFile(`AWS success, FaceID: ${embedding}`);
                } catch (awsError) {
                    logToFile(`AWS failed for ${file.name}: ${awsError.message}`);
                }

                // Salvar foto no banco
                await prisma.photo.create({
                    data: {
                        eventId: event.id,
                        originalUrl: originalUrl,
                        watermarkedUrl: watermarkedUrl,
                        price: 10.0, // Preço padrão
                        embedding: embedding
                    }
                });

                // Se for a primeira imagem e o evento NÃO tiver capa, define como capa
                if (results.success === 0 && !event.coverImage) {
                    await prisma.event.update({
                        where: { id: event.id },
                        data: { coverImage: originalUrl }
                    });
                }

                results.success++;
            } catch (err) {
                logToFile(`Error processing file ${file.name}: ${err.message}`);
                results.failed++;
                results.errors.push({ file: file.name, error: err.message });
            }
        }

        logToFile(`Import completed: ${results.success} success, ${results.failed} failed`);

        res.status(201).json({
            message: 'Event created and images imported',
            event,
            summary: results
        });

    } catch (error) {
        logToFile(`Create Event from Drive Error: ${error.message}`);
        console.error("Create Event from Drive Error:", error);
        res.status(500).json({ error: 'Internal Server Error: ' + error.message });
    }
};

