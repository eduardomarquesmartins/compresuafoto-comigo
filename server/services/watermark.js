const sharp = require('sharp');

// Disable sharp cache to prevent memory build-up in low RAM environments
sharp.cache(false);

/**
 * Generates a watermarked version of an image from a file path
 * @param {string} filePath - Path to original image on disk
 * @param {string} text - Watermark text (default "PREVIEW")
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
exports.generateWatermark = async (filePath, text = "PREVIEW") => {
    // 1. Get metadata (rotated) to match SVG size correctly
    // .rotate() without arguments auto-rotates based on EXIF
    const metadataFetcher = sharp(filePath).rotate();
    const resizedMetadata = await metadataFetcher
        .resize(1200, null, { withoutEnlargement: true })
        .metadata();

    const width = Math.floor(resizedMetadata.width);
    const height = Math.floor(resizedMetadata.height);

    // 2. Create SVG Watermark overlay
    const fontSize = 48;
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

    for (let y = 0; y < height + 100; y += 150) {
        for (let x = 0; (x < width + 100); x += 250) {
            svgContent += `<text x="${x}" y="${y}" class="watermark" transform="rotate(-35, ${x}, ${y})">${text}</text>`;
        }
    }
    svgContent += `</svg>`;

    // 3. Composite original with SVG
    return await sharp(filePath)
        .rotate() // Ensure orientation is applied before/during resize
        .resize(width, height) // Use the exact same dimensions as the SVG
        .composite([{
            input: Buffer.from(svgContent),
            top: 0,
            left: 0,
        }])
        .jpeg({ quality: 80 })
        .toBuffer();
};
