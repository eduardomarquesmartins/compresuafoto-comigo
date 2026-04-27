type ProcessedPhoto = {
    original: File;
    watermarked: File;
    faceSearch: File;
};

const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Erro ao carregar imagem ${file.name}`));
        };
        img.src = url;
    });
};

const canvasToFile = (canvas: HTMLCanvasElement, fileName: string, quality: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error(`Erro ao processar imagem ${fileName}`));
                return;
            }
            resolve(new File([blob], fileName.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
    });
};

const drawResized = (img: HTMLImageElement, maxWidth: number): HTMLCanvasElement => {
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nao suportado neste navegador.');

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
};

const drawWatermark = (canvas: HTMLCanvasElement, text = 'PREVIEW') => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nao suportado neste navegador.');

    const maxDim = Math.max(canvas.width, canvas.height);
    const fontSize = Math.max(12, Math.floor(maxDim / 25));
    const step = Math.floor(maxDim / 4);

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = step / 2; y < canvas.height + step; y += step) {
        for (let x = step / 2; x < canvas.width + step; x += step) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-35 * Math.PI / 180);
            ctx.fillText(text, 0, 0);
            ctx.restore();
        }
    }

    ctx.restore();
};

export const processPhotoLocally = async (file: File): Promise<ProcessedPhoto> => {
    const img = await loadImage(file);

    const originalCanvas = drawResized(img, 2000);
    const watermarkedCanvas = drawResized(img, 1200);
    const faceCanvas = drawResized(img, 1000);

    drawWatermark(watermarkedCanvas);

    const [original, watermarked, faceSearch] = await Promise.all([
        canvasToFile(originalCanvas, file.name, 0.85),
        canvasToFile(watermarkedCanvas, file.name, 0.8),
        canvasToFile(faceCanvas, file.name, 0.8),
    ]);

    return { original, watermarked, faceSearch };
};
