"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PhotoSkeleton from './PhotoSkeleton';
import Image from 'next/image';

interface PhotoGridItemProps {
    photo: any;
    isSelected: boolean;
    onToggle: (photo: any) => void;
    getImageUrl: (path?: string) => string;
    getPhotoUrl: (photo: any) => string | undefined;
}

export default function PhotoGridItem({ photo, isSelected, onToggle, getImageUrl, getPhotoUrl }: PhotoGridItemProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const photoUrl = getPhotoUrl(photo);

    return (
        <div
            className="relative cursor-pointer w-full"
            onClick={() => onToggle(photo)}
        >
            <div className={`rounded-2xl overflow-hidden bg-slate-900 border relative transition-all shadow-sm aspect-[2/3] ${isSelected ? 'border-brand ring-4 ring-brand/20' : 'border-black/5 hover:border-brand/30 hover:shadow-md'}`}>

                {/* Skeleton visible while image is loading */}
                {(!isLoaded || !photoUrl) && (
                    <div className="absolute inset-0 w-full h-full">
                        <PhotoSkeleton />
                    </div>
                )}

                {photoUrl && (
                    <div className={`relative w-full h-full transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
                        <Image
                            src={getImageUrl(photoUrl)}
                            alt={`Photo ${photo.id}`}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover"
                            onLoad={() => setIsLoaded(true)}
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
        </div>
    );
}
