const { RekognitionClient, IndexFacesCommand, SearchFacesByImageCommand, DeleteCollectionCommand, CreateCollectionCommand, ListCollectionsCommand } = require("@aws-sdk/client-rekognition");
const fs = require('fs');
const prisma = require('../lib/prisma');

const COLLECTION_ID = process.env.REKOGNITION_COLLECTION_ID || "event-photos-collection";

// Lazy initialization of the client
let client = null;

function getClient() {
    if (client) return client;

    try {
        console.log('Initializing Rekognition Client...');
        console.log('AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
        console.log('AWS_ACCESS_KEY_ID present:', !!process.env.AWS_ACCESS_KEY_ID);
        console.log('AWS_SECRET_ACCESS_KEY present:', !!process.env.AWS_SECRET_ACCESS_KEY);

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.error('CRITICAL: AWS credentials are missing from environment variables!');
            return null;
        }

        client = new RekognitionClient({
            region: process.env.AWS_REGION || "us-east-1",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });
        console.log('Rekognition Client initialized successfully');
        return client;
    } catch (error) {
        console.error('Failed to initialize Rekognition Client:', error);
        return null;
    }
}

// Ensure collection exists (Non-blocking)
async function ensureCollection() {
    const rekognition = getClient();
    if (!rekognition) return;

    try {
        console.log(`Checking collection ${COLLECTION_ID}...`);
        // Add a 10s timeout to the collection check
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AWS Timeout')), 10000));
        await Promise.race([
            rekognition.send(new CreateCollectionCommand({ CollectionId: COLLECTION_ID })),
            timeoutPromise
        ]);
        console.log(`Collection ${COLLECTION_ID} checked/created.`);
    } catch (err) {
        if (err.name === 'ResourceAlreadyExistsException') {
            // console.log(`Collection ${COLLECTION_ID} already exists.`);
        } else {
            console.error("Error ensuring collection:", err);
        }
    }
}

// Export ensureCollection for manual trigger
exports.ensureCollection = ensureCollection;

exports.indexFaces = async (imageInput) => {
    const rekognition = getClient();
    if (!rekognition) throw new Error("AWS Rekognition not initialized");

    try {
        let imageBytes;
        if (Buffer.isBuffer(imageInput)) {
            imageBytes = imageInput;
        } else {
            // Fallback for path if needed (though we aim to use buffer)
            imageBytes = fs.readFileSync(imageInput);
        }

        const command = new IndexFacesCommand({
            CollectionId: COLLECTION_ID,
            Image: { Bytes: imageBytes },
            DetectionAttributes: ["ALL"],
            MaxFaces: 1,
            QualityFilter: "AUTO"
        });

        const response = await rekognition.send(command);

        if (response.FaceRecords && response.FaceRecords.length > 0) {
            const faceId = response.FaceRecords[0].Face.FaceId;
            console.log(`AWS Rekognition: Face indexed with ID ${faceId}`);
            return faceId;
        } else {
            console.warn("AWS Rekognition: No face detected in image.");
            return null;
        }
    } catch (error) {
        console.error("AWS IndexFaces Error:", error);
        throw error; // Re-throw to be caught by controller
    }
};

exports.searchFacesByImage = async (imageInput, eventId) => {
    const rekognition = getClient();
    if (!rekognition) throw new Error("AWS Rekognition not initialized");

    try {
        let imageBytes;
        if (Buffer.isBuffer(imageInput)) {
            imageBytes = imageInput;
        } else {
            // Fallback
            imageBytes = fs.readFileSync(imageInput);
        }

        const command = new SearchFacesByImageCommand({
            CollectionId: COLLECTION_ID,
            Image: { Bytes: imageBytes },
            FaceMatchThreshold: 80,
            MaxFaces: 50
        });

        const response = await rekognition.send(command);

        if (!response.FaceMatches || response.FaceMatches.length === 0) {
            return [];
        }

        const faceIds = response.FaceMatches.map(match => match.Face.FaceId);

        if (faceIds.length === 0) return [];

        // Use Prisma to query photos
        // We use findMany with 'in' operator for checking if embedding matches any of the returned FaceIds
        const photos = await prisma.photo.findMany({
            where: {
                eventId: parseInt(eventId),
                embedding: {
                    in: faceIds
                }
            }
        });

        console.log(`AWS Search: Found ${response.FaceMatches.length} matches, mapped to ${photos.length} database photos.`);

        return photos;

    } catch (error) {
        // Handle common Rekognition error when no face is detected in the source image
        if (error.name === 'InvalidParameterException' && error.message.includes('no faces')) {
            console.warn("AWS Search: No face detected in the source image (selfie).");
            return [];
        }

        console.error("AWS SearchFacesByImage Error:", error);
        throw error;
    }
};
