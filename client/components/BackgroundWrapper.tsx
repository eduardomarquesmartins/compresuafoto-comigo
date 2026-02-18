"use client";
import React from "react";
import { usePathname } from "next/navigation";

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    if (isAdmin) {
        return <>{children}</>;
    }

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Animated Gradient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#F5F5F3]" />
                <div className="absolute inset-0 opacity-40 animate-gradient"
                    style={{
                        background: 'radial-gradient(circle at 10% 10%, #F5F5F3 0%, transparent 80%), radial-gradient(circle at 90% 90%, var(--brand) 0%, transparent 80%)',
                        backgroundSize: '200% 200%'
                    }}
                />
                <div className="absolute inset-0 backdrop-blur-[120px]" />
            </div>

            {/* Content Container */}
            <div className="relative z-30 flex flex-col min-h-screen">
                {children}
            </div>

            <style jsx global>{`
                @keyframes gradientBG {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    animation: gradientBG 15s ease infinite;
                }
            `}</style>
        </div>
    );
}
