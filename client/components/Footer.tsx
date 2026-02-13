"use client";
import React from 'react';
import { Instagram, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function Footer() {
    const currentYear = new Date().getFullYear();
    const pathname = usePathname();
    if (pathname?.startsWith('/admin')) {
        return null;
    }
    return (
        <footer className="bg-black text-white py-16 px-6">
            <div className="container mx-auto flex flex-col items-center">
                {/* Logo Section */}
                <div className="mb-10 text-center">
                    <img
                        src="/logo.png"
                        alt="& Conti Marketing Digital"
                        className="h-14 w-auto object-contain brightness-0 invert"
                    />
                </div>
                {/* Social Icons Section */}
                <div className="flex items-center gap-8 mb-12">
                    <a
                        href="https://www.instagram.com/econticomigo/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group"
                        title="Instagram"
                    >
                        <Instagram className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </a>
                    <a
                        href="https://wa.me/5551989794082"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group"
                        title="WhatsApp"
                    >
                        <MessageCircle className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </a>
                    <a
                        href="mailto:marketing@econti.com.br"
                        className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10 group"
                        title="Email"
                    >
                        <Mail className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </a>
                </div>
                {/* Copyright Section */}
                <div className="text-center opacity-40">
                    <p className="text-[10px] md:text-sm tracking-[0.2em] font-light">
                        © {currentYear} & CONTI - TODOS OS DIREITOS RESERVADOS
                    </p>
                </div>
            </div>
        </footer>
    );
}
