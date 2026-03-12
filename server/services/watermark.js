const sharp = require('sharp');

// Disable sharp cache to prevent memory build-up in low RAM environments
sharp.cache(false);

/**
 * Generates a watermarked version of an image from a file path
 * @param {string} filePath - Path to original image on disk
 * @param {string} text - Watermark text (default "PREVIEW")
 * @param {number} targetWidth - Target width for the output image (default 1200)
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
exports.generateWatermark = async (filePath, text = "PREVIEW", targetWidth = 1200) => {
    // 1. Get metadata (rotated) to match SVG size correctly
    const metadataFetcher = sharp(filePath).rotate();
    const resizedMetadata = await metadataFetcher
        .resize(targetWidth, null, { withoutEnlargement: true })
        .metadata();

    const width = Math.floor(resizedMetadata.width);
    const height = Math.floor(resizedMetadata.height);

    // 2. Create SVG Watermark overlay
    // Adjust font size based on image width
    const fontSize = Math.max(12, Math.floor(width / 25)); 
    const opacity = 0.3;

    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .watermark { 
                font-family: Arial, sans-serif; 
                font-weight: bold; 
                font-size: ${fontSize}px; 
                fill: white; 
                fill-opacity: ${opacity}; 
            }
        </style>`;

    // Adjust tiling based on font size/width
    const stepY = Math.floor(height / 5);
    const stepX = Math.floor(width / 3);

    for (let y = stepY; y < height + 100; y += stepY) {
        for (let x = 0; (x < width + 100); x += stepX) {
            svgContent += `<text x="${x}" y="${y}" class="watermark" transform="rotate(-35, ${x}, ${y})">${text}</text>`;
        }
    }
    svgContent += `</svg>`;

    // 3. Composite original with SVG
    return await sharp(filePath)
        .rotate() 
        .resize(width, height) 
        .composite([{
            input: Buffer.from(svgContent),
            top: 0,
            left: 0,
        }])
        .jpeg({ quality: 80 })
        .toBuffer();
};

/**
 * Generates a small thumbnail (400px) with watermark
 */
exports.generateThumbnail = async (filePath, text = "PREVIEW") => {
    return exports.generateWatermark(filePath, text, 400);
};
