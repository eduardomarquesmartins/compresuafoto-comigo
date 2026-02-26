"use client";
import React from 'react';
import { motion } from 'framer-motion';

export default function PhotoSkeleton() {
    return (
        <div className="relative break-inside-avoid mb-6">
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/5 relative aspect-[2/3] shadow-sm">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                />
                <div className="absolute inset-0 bg-slate-800/50" />
            </div>
        </div>
    );
}
