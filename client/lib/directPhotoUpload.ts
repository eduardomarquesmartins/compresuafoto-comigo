import api from './api';
import { processPhotoLocally } from './clientImageProcessing';

type PresignedUpload = {
    uploadUrls: {
        original: string;
        watermarked: string;
        face: string;
    };
};

type DirectUploadOptions = {
    eventId: string | number;
    files: File[];
    price?: string;
    batchSize?: number;
    onStatus?: (status: string) => void;
    onProgress?: (progress: number) => void;
};

const putToS3 = async (url: string, file: File) => {
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || 'image/jpeg',
        },
        body: file,
    });

    if (!response.ok) {
        throw new Error(`Falha ao enviar para S3 (${response.status})`);
    }
};

const isRawFile = (file: File) => file.name.toLowerCase().endsWith('.arw');

export const uploadPhotosDirectToS3 = async ({
    eventId,
    files,
    price = '15.00',
    batchSize = 5,
    onStatus,
    onProgress,
}: DirectUploadOptions) => {
    const rawFiles = files.filter(isRawFile);
    if (rawFiles.length > 0) {
        throw new Error('Arquivos .ARW nao sao suportados neste servidor. Exporte as fotos em JPG antes do upload.');
    }

    const total = files.length;
    let completed = 0;

    for (let i = 0; i < files.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(files.length / batchSize);
        const chunk = files.slice(i, i + batchSize);

        onStatus?.(`Gerando marca d'agua localmente ${batchNumber} de ${totalBatches}...`);
        const processed = await Promise.all(chunk.map(processPhotoLocally));

        onStatus?.(`Preparando upload direto para S3 ${batchNumber} de ${totalBatches}...`);
        const presignResponse = await api.post('/photos/direct-upload-urls', {
            eventId,
            files: processed.map(({ original }) => ({
                name: original.name,
                contentType: original.type || 'image/jpeg',
            })),
        });

        const uploads = presignResponse.data.uploads;

        onStatus?.(`Enviando lote ${batchNumber} de ${totalBatches} direto para S3...`);
        await Promise.all(uploads.map((upload: PresignedUpload, index: number) => {
            const item = processed[index];
            return Promise.all([
                putToS3(upload.uploadUrls.original, item.original),
                putToS3(upload.uploadUrls.watermarked, item.watermarked),
                putToS3(upload.uploadUrls.face, item.faceSearch),
            ]).then(() => {
                completed += 1;
                onProgress?.(Math.round((completed / total) * 100));
            });
        }));

        onStatus?.(`Registrando lote ${batchNumber} de ${totalBatches} no sistema...`);
        await api.post('/photos/register-direct-upload', {
            eventId,
            price,
            uploads,
        });
    }

    onProgress?.(100);
};
