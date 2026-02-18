const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} - Result object with url, public_id etc.
 */
exports.uploadStream = (buffer, folder = 'uploads') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto"
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

/**
 * Upload a file directly from disk to Cloudinary using streams (memory efficient)
 * @param {string} filePath - Path to the file on disk
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<object>} - Result object with url, public_id etc.
 */
exports.uploadFromFile = (filePath, folder = 'uploads') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto"
            },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error || new Error('Upload to Cloudinary failed'));
                }
            }
        );
        const fs = require('fs');
        fs.createReadStream(filePath).pipe(uploadStream);
    });
};

/**
 * Extracts the public_id from a Cloudinary URL
 * Example: https://res.cloudinary.com/demo/image/upload/v12345/folder/image.jpg -> folder/image
 * @param {string} url 
 * @returns {string|null}
 */
exports.extractPublicId = (url) => {
    if (!url) return null;
    try {
        // Find everything after /upload/ (skipping version like /v12345/) and before the extension
        const parts = url.split('/upload/');
        if (parts.length < 2) return null;

        let path = parts[1];
        // Remove version if matches v\d+
        if (path.startsWith('v')) {
            const nextSlash = path.indexOf('/');
            path = path.substring(nextSlash + 1);
        }

        // Remove extension
        const lastDot = path.lastIndexOf('.');
        if (lastDot !== -1) {
            path = path.substring(0, lastDot);
        }
        return path;
    } catch (e) {
        return null;
    }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId 
 */
exports.deleteFile = async (publicId) => {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
    }
};

module.exports = {
    uploadStream: exports.uploadStream,
    uploadFromFile: exports.uploadFromFile,
    deleteFile: exports.deleteFile,
    extractPublicId: exports.extractPublicId,
    v2: cloudinary
};
