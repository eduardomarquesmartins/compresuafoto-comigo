"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api, { uploadWithRetry } from '@/lib/api';

export default function CreateEventPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
    const selectedPhotoCount = selectedPhotos.length;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    const compressImage = (file: File): Promise<Blob> => {
        console.log(`DEBUG: Comprimindo ${file.name}...`);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error(`Erro ao ler arquivo ${file.name}`));
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 2000;
                    const scale = Math.min(1, MAX_WIDTH / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.85);
                };
            };
        });
    };

    const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setSelectedPhotos(Array.from(files));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setUploadProgress(0);

        const formData = new FormData(e.currentTarget);
        // Add current date automatically since input was removed from UI
        formData.set('date', new Date().toISOString().split('T')[0]);
        formData.delete('photos');

        try {
            // 1. Create the event first
            const eventResponse = await api.post('/events', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const eventId = eventResponse.data.id;

            // 2. Upload photos in chunks
            console.log(`DEBUG: Evento criado ID ${eventId}. Fotos selecionadas: ${selectedPhotos.length}`);
            if (selectedPhotos.length > 0) {
                console.log('DEBUG: Iniciando processamento de fotos em lotes...');
                const BATCH_SIZE = 5;
                const total = selectedPhotos.length;

                for (let i = 0; i < total; i += BATCH_SIZE) {
                    const chunk = selectedPhotos.slice(i, i + BATCH_SIZE);
                    const batchFormData = new FormData();
                    batchFormData.append('eventId', eventId.toString());
                    batchFormData.append('price', '15.00');

                    // Compress batch
                    const compressedFiles = await Promise.all(chunk.map(async (file) => {
                        const blob = await compressImage(file);
                        return new File([blob], file.name, { type: 'image/jpeg' });
                    }));

                    compressedFiles.forEach(file => {
                        batchFormData.append('photos', file);
                    });

                    await uploadWithRetry('/photos/upload', batchFormData, (percent) => {
                        const basePercent = (i / total) * 100;
                        const chunkContribution = (percent / 100) * (chunk.length / total) * 100;
                        setUploadProgress(Math.round(basePercent + chunkContribution));
                    });
                }
            }

            setUploadProgress(100);
            setSuccess(true);
        } catch (error: any) {
            console.error('Create Event Error:', error);
            setError(error.response?.data?.error || 'Erro ao comunicar com o servidor. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-xl mx-auto mt-20 p-12 bg-slate-900 border border-white/5 rounded-3xl text-center shadow-2xl">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-4">Evento Criado!</h2>
                <p className="text-slate-400 mb-8 font-light">
                    O evento e as fotos foram enviados com sucesso. O processamento (marcas d'água e IA) continuará em segundo plano.
                </p>
                <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="w-full bg-brand hover:bg-blue-600 text-white p-4 rounded-xl font-bold transition-all"
                >
                    VOLTAR AO PAINEL
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700/50 mx-auto">
            <h1 className="text-3xl font-light mb-8 text-white text-center">Criar Novo Evento</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Form Fields */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300">Nome do Evento</label>
                            <input
                                name="name"
                                required
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                placeholder="Ex: Casamento João e Maria"
                            />
                        </div>


                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300">Capa do Evento</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:bg-slate-800/50 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden">
                                <input
                                    type="file"
                                    name="coverImage"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                {preview ? (
                                    <div className="relative h-48 w-full">
                                        <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <p className="text-white text-sm">Trocar Capa</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-slate-500 group-hover:text-blue-400 py-4">
                                        <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                                        <span className="text-sm font-medium">Escolher Capa</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Photo Upload Section */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300 flex justify-between">
                                Upload de Fotos
                                {selectedPhotoCount > 0 && (
                                    <span className="text-brand font-bold">{selectedPhotoCount} selecionadas</span>
                                )}
                            </label>
                            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:bg-slate-800/50 hover:border-brand/50 transition-all cursor-pointer group relative min-h-[300px] flex flex-col items-center justify-center">
                                <input
                                    type="file"
                                    name="photos"
                                    multiple
                                    accept="image/*"
                                    onChange={handlePhotosChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />

                                {selectedPhotoCount > 0 ? (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-brand/20 rounded-2xl flex items-center justify-center mx-auto">
                                            <Upload className="w-8 h-8 text-brand" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-white font-bold text-lg">{selectedPhotoCount} fotos</p>
                                            <p className="text-slate-400 text-xs text-center">Clique para trocar a seleção</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-slate-500 group-hover:text-brand transition-colors p-4">
                                        <Upload className="w-10 h-10 mx-auto mb-2" />
                                        <p className="font-medium text-sm">Clique para selecionar as fotos</p>
                                        <p className="text-[10px] text-slate-600 font-light">Suporta centenas de fotos simultâneas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status/Error Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm"
                        >
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button & Progress */}
                <div className="space-y-4 pt-4">
                    {loading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin text-brand" />
                                    Enviando arquivos para o servidor...
                                </span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    className="h-full bg-brand"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className={`w-full h-16 rounded-2xl font-black text-lg tracking-widest transition-all shadow-xl flex items-center justify-center gap-3
                            ${loading
                                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-brand hover:bg-blue-600 text-white shadow-brand/20 hover:shadow-brand/40'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                ENVIANDO...
                            </>
                        ) : (
                            'CRIAR EVENTO'
                        )}
                    </motion.button>

                    {!loading && selectedPhotoCount > 100 && (
                        <p className="text-[10px] text-slate-500 text-center font-light italic">
                            O upload de {selectedPhotoCount} fotos pode levar alguns minutos dependendo da sua internet.
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
}
