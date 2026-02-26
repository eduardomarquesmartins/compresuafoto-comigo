"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PhotoSkeleton from './PhotoSkeleton';

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
            className="relative break-inside-avoid mb-6 cursor-pointer"
            onClick={() => onToggle(photo)}
        >
            <div className={`rounded-2xl overflow-hidden bg-slate-900 border relative transition-all shadow-sm ${isSelected ? 'border-brand ring-4 ring-brand/20' : 'border-black/5 hover:border-brand/30 hover:shadow-md'}`}>

                {/* Skeleton visible while image is loading */}
                {(!isLoaded || !photoUrl) && (
                    <div className="w-full">
                        <PhotoSkeleton />
                    </div>
                )}

                {photoUrl && (
                    <motion.img
                        src={getImageUrl(photoUrl)}
                        alt={`Photo ${photo.id}`}
                        className={`w-full h-auto object-contain transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
                        onLoad={() => setIsLoaded(true)}
                        loading="lazy"
                    />
                )}

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
