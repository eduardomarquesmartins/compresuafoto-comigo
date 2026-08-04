const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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
            },
        });

        await upload.done();

        const region = process.env.AWS_REGION || 'us-east-1';
        return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Falha ao subir para o S3: ${error.message}`);
    }
};

/**
 * Gera uma URL assinada (temporária) para um objeto no S3
 * @param {string} url - URL completa ou Key do S3
 * @param {number} expiresIn - Tempo de expiração em segundos (default 900 = 15min)
 */
exports.getPresignedUrl = async (url, expiresIn = 900) => {
    try {
        const key = exports.extractS3Key(url);
        if (!key) return url;
        const parsedUrl = new URL(url);
        const hostParts = parsedUrl.hostname.split('.');
        const bucket = hostParts[0] || BUCKET_NAME;
        const region = hostParts[2] || process.env.AWS_REGION || 'us-east-1';
        const client = region === (process.env.AWS_REGION || 'us-east-1') ? s3Client : new S3Client({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        return await getSignedUrl(client, command, { expiresIn });
    } catch (error) {
        console.error('Error generating Presigned URL:', error);
        return url;
    }
};

exports.getPresignedUploadUrl = async (key, contentType = 'image/jpeg', expiresIn = 900) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
};

exports.getPublicUrl = (key) => {
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
};

exports.getBucketName = () => BUCKET_NAME;

exports.extractS3Key = (url) => {
    try {
        if (!url) return null;
        const parts = url.split('.amazonaws.com/');
        return parts.length > 1 ? parts[1] : null;
    } catch (e) {
        return null;
    }
};

/**
 * Deleta um objeto do AWS S3
 * @param {string} urlOrKey - URL completa do S3 ou Key do objeto
 */
exports.deleteFromS3 = async (urlOrKey) => {
    try {
        const key = exports.extractS3Key(urlOrKey) || urlOrKey;
        if (!key) return;

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('S3 Delete Error:', error);
    }
};
