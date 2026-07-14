"use client";
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Upload } from 'lucide-react';
import axios from 'axios';
import { uploadPhotosDirectToS3 } from '@/lib/directPhotoUpload';

export default function UploadPhotosPage() {
    const params = useParams();
    const eventId = params.id;
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        const files = Array.from(e.target.files);
        setUploading(true);
        setProgress(0);

        try {
            await uploadPhotosDirectToS3({
                eventId: eventId as string,
                files,
                price: '15.00',
                batchSize: 5,
                onStatus: setStatus,
                onProgress: setProgress,
            });

            setProgress(100);
            setStatus('Upload concluido! A indexacao facial continua em segundo plano...');
            setTimeout(() => {
                alert('Upload concluido com sucesso!');
                setUploading(false);
            }, 1000);
        } catch (error: unknown) {
            console.error('Full Upload Error:', error);
            const serverMsg = axios.isAxiosError(error)
                ? error.response?.data?.error || error.message || 'Erro desconhecido'
                : 'Erro desconhecido';
            setStatus(`Erro no upload: ${serverMsg}`);
            alert(`Falha no upload: ${serverMsg}`);
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700/50">
            <h1 className="text-3xl font-light mb-6 text-white">Upload de Fotos</h1>

            <div className={`border-4 border-dashed rounded-3xl p-20 text-center transition-all relative ${uploading ? 'border-blue-500/30 bg-blue-500/10' : 'border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50'}`}>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleUpload}
                    disabled={uploading}
                />

                <div className="flex flex-col items-center gap-6 pointer-events-none w-full max-w-md mx-auto">
                    {uploading ? (
                        <>
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>

                            <div className="w-full text-center space-y-3">
                                <p className="text-lg font-medium text-slate-300 animate-pulse">{status}</p>
                                <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-sm text-slate-400">{progress}%</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-blue-500/20 p-6 rounded-full backdrop-blur-sm">
                                <Upload size={48} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xl font-medium text-white mb-2">Arraste fotos ou clique para selecionar</p>
                                <p className="text-slate-400">Suporta JPG, JPEG e PNG</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
