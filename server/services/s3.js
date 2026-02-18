const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || 'compresuafoto-comigo-fotos';

/**
 * Faz upload de um buffer para o AWS S3
 * @param {Buffer} buffer 
 * @param {string} fileName 
 * @param {string} mimeType 
 * @returns {Promise<string>} URL pública do arquivo
 */
exports.uploadToS3 = async (buffer, fileName, mimeType = 'image/jpeg') => {
    try {
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: BUCKET_NAME,
                Key: fileName,
                Body: buffer,
                ContentType: mimeType,
                // ACL: 'public-read', // Depende da configuração do bucket, melhor usar URLs via Cloudfront ou políticas de bucket
            },
        });

        await upload.done();

        // Retorna a URL padrão do S3 (pode ser personalizada se usar CloudFront)
        const region = process.env.AWS_REGION || 'us-east-1';
        return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Falha ao subir para o S3: ${error.message}${error.code ? ' (' + error.code + ')' : ''}`);
    }
};

exports.extractS3Key = (url) => {
    try {
        const parts = url.split('.amazonaws.com/');
        return parts.length > 1 ? parts[1] : null;
    } catch (e) {
        return null;
    }
};
