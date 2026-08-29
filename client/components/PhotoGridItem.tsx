"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2 } from 'lucide-react';
import PhotoSkeleton from './PhotoSkeleton';
import Image from 'next/image';

interface PhotoGridItemProps {
    photo: any;
    isSelected: boolean;
    onToggle: (photo: any) => void;
    onPreview: (photo: any) => void;
    getImageUrl: (path?: string) => string;
    getPhotoUrl: (photo: any) => string | undefined;
}

export default function PhotoGridItem({ photo, isSelected, onToggle, onPreview, getImageUrl, getPhotoUrl }: PhotoGridItemProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasImageError, setHasImageError] = useState(false);
    const photoUrl = getPhotoUrl(photo);

    return (
        <div
            className="relative cursor-pointer w-full"
            onClick={() => onToggle(photo)}
        >
            <div className={`rounded-2xl overflow-hidden bg-slate-900 border relative transition-all shadow-sm aspect-[2/3] ${isSelected ? 'border-brand ring-4 ring-brand/20' : 'border-black/5 hover:border-brand/30 hover:shadow-md'}`}>

                {/* Skeleton visible while image is loading */}
                {((!isLoaded && !hasImageError) || !photoUrl) && (
                    <div className="absolute inset-0 w-full h-full">
                        <PhotoSkeleton />
                    </div>
                )}

                {hasImageError && photoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800 px-6 text-center text-sm text-slate-300">
                        Não foi possível carregar esta foto.
                    </div>
                )}

                {photoUrl && (
                    <div className={`relative w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                        <Image
                            src={getImageUrl(photoUrl)}
                            alt={`Photo ${photo.id}`}
                            fill
                            // The public gallery must not depend on Vercel's paid image optimizer.
                            // Photos are already served directly by S3.
                            unoptimized
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                            onLoad={() => setIsLoaded(true)}
                            onError={() => setHasImageError(true)}
                            loading="lazy"
                        />
                    </div>
                )}
...

                {/* Selection Overlay */}
                <AnimatePresence>
                    {isLoaded && (
                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-brand border-brand' : 'border-white'}`}>
                                {isSelected && <span className="text-white font-bold">✓</span>}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <button
                type="button"
                aria-label="Ampliar foto"
                title="Ampliar foto"
                onClick={(event) => {
                    event.stopPropagation();
                    onPreview(photo);
                }}
                className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-slate-950/80 text-white shadow-lg backdrop-blur transition hover:scale-105 hover:bg-brand focus:outline-none focus:ring-2 focus:ring-white"
            >
                <Maximize2 size={18} />
            </button>
        </div>
    );
}
