"use client";

import { useEffect, useState, useRef } from 'react';
import { getEvent, searchFaces } from '@/lib/api';
import { useParams } from 'next/navigation';
import { Camera, Upload, CheckCircle, ShoppingCart, ScanFace, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface Event {
    id: number;
    name: string;
    description: string;
    coverImage?: string;
}

interface Photo {
    id: number;
    url: string;
    price: number;
}

export default function EventDetailPage() {
    const params = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [selfie, setSelfie] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [results, setResults] = useState<Photo[]>([]);
    const [searching, setSearching] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (params.id) {
            getEvent(Array.isArray(params.id) ? params.id[0] : params.id)
                .then(setEvent)
                .catch(console.error);
        }
    }, [params.id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelfie(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSearch = async () => {
        if (!event || !selfie) return;
        setSearching(true);
        try {
            const photos = await searchFaces(event.id, selfie);
            setResults(photos);
        } catch (error) {
            console.error(error);
            alert('Erro ao buscar fotos. Tente novamente.');
        } finally {
            setSearching(false);
        }
    };

    if (!event) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-brand">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1 }}
            >
                <ScanFace size={48} />
            </motion.div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-brand selection:text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 p-6">
                <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md px-4 py-2 rounded-full transition-all">
                    <ArrowLeft size={18} />
                    Voltar
                </Link>
            </nav>

            {/* Header / Hero */}
            <div className="relative h-[50vh] w-full overflow-hidden">
                {event.coverImage && (
                    <motion.img
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 1.5 }}
                        src={`${process.env.NEXT_PUBLIC_API_URL}${event.coverImage}`}
                        alt={event.name}
                        className="w-full h-full object-cover opacity-60"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 w-full container mx-auto">
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl md:text-6xl font-bold mb-4"
                    >
                        {event.name}
                    </motion.h1>
                    <p className="text-lg text-slate-300 max-w-2xl">{event.description}</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 max-w-6xl -mt-20 relative z-10">
                {/* Search Interface */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-slate-900/80 border border-white/10 rounded-3xl p-8 md:p-12 mb-20 text-center backdrop-blur-xl shadow-2xl shadow-black/50"
                >
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold mb-3">Reconhecimento Facial</h2>
                        <p className="text-slate-400">Nossa IA escaneia milhares de fotos para encontrar você em segundos.</p>
                    </div>

                    <div className="flex flex-col items-center gap-8">
                        <div className="relative group">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-slate-800/50 border-4 border-dashed border-slate-700 flex items-center justify-center cursor-pointer group-hover:border-brand/50 group-hover:bg-slate-800 transition-all overflow-hidden relative"
                            >
                                {preview ? (
                                    <>
                                        <img src={preview} className="w-full h-full object-cover" />
                                        {searching && (
                                            <motion.div
                                                className="absolute inset-0 bg-brand/20 border-t-4 border-brand"
                                                animate={{ top: ['0%', '100%', '0%'] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-slate-500 group-hover:text-brand transition-colors">
                                        <ScanFace size={48} />
                                        <span className="font-medium">Enviar Selfie</span>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {/* Glow Effect */}
                            <div className="absolute -inset-4 bg-brand/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                        </div>

                        {selfie && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleSearch}
                                disabled={searching}
                                className="bg-brand hover:bg-blue-500 text-white text-lg px-10 py-4 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-brand/20 hover:scale-105"
                            >
                                {searching ? 'Escaneando Evento...' : (
                                    <>
                                        <Upload size={20} />
                                        Encontrar Minhas Fotos
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>
                </motion.div>

                {/* Results Grid */}
                <AnimatePresence>
                    {results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold flex items-center gap-3">
                                    <CheckCircle className="text-green-400" size={24} />
                                    {results.length} Fotos Encontradas
                                </h3>
                                <div className="text-sm text-slate-400">Galeria de Resultados</div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {results.map((photo, index) => (
                                    <motion.div
                                        key={photo.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="group relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg hover:shadow-brand/10 hover:border-brand/30 transition-all"
                                    >
                                        <div className="aspect-[2/3] overflow-hidden">
                                            <img
                                                src={`${process.env.NEXT_PUBLIC_API_URL}${photo.url}`}
                                                alt={`Foto ${photo.id}`}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                <div className="text-2xl font-bold text-white mb-3">R$ {photo.price.toFixed(2)}</div>
                                                <button className="w-full bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand hover:text-white transition-colors">
                                                    <ShoppingCart size={18} />
                                                    Comprar
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
