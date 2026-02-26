"use client";
import Link from 'next/link';
import { Camera, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [user, setUser] = useState<{ name: string; role: string } | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        // Check auth status
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token && userData) {
            setUser(JSON.parse(userData));
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/';
    };

    return (
        <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4">
            <nav className={`
                w-full max-w-5xl rounded-full transition-all duration-500
                ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-lg border-white/40 border py-2' : 'bg-white/60 backdrop-blur-md border-white/30 border py-4'}
                px-6 flex items-center justify-between
            `}>
                {/* Logo Section */}
                <div className="flex-1 flex justify-start">
                    <Link href="https://www.econticomigo.com.br/" className="flex items-center group">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-10 w-auto object-contain transition-opacity group-hover:opacity-80"
                        />
                    </Link>
                </div>

                {/* Desktop Menu - Centered */}
                <div className="hidden md:flex items-center gap-10 font-normal text-slate-600 absolute left-1/2 -translate-x-1/2">
                    <Link href="/events" className="hover:text-brand transition-colors whitespace-nowrap">Eventos</Link>
                    <Link href="/" className="hover:text-brand transition-colors whitespace-nowrap">Como Funciona</Link>
                </div>

                {/* Desktop User/Login Section */}
                <div className="hidden md:flex flex-1 justify-end items-center gap-6 font-normal">
                    {user ? (
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-foreground font-normal hover:text-brand transition-colors focus:outline-none">
                                <span>Olá, {user.name.split(' ')[0]}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6" /></svg>
                            </button>

                            <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right border border-gray-100">
                                {user.role === 'ADMIN' && (
                                    <Link href="/admin/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 hover:text-brand">
                                        Painel Admin
                                    </Link>
                                )}
                                {user.role !== 'ADMIN' && (
                                    <Link href="/my-orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 hover:text-brand">
                                        Meus Pedidos
                                    </Link>
                                )}
                                <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 hover:text-brand">
                                    Configurações
                                </Link>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                    Sair
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className="bg-black text-white px-8 py-2 rounded-full font-normal uppercase tracking-wider hover:bg-brand transition-all shadow-md active:scale-95">
                            ENTRAR
                        </Link>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-foreground p-2 rounded-full hover:bg-white/50 transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-24 left-4 right-4 bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl z-[150] flex flex-col items-center py-10 gap-6 md:hidden border border-white/50"
                        >
                            <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="text-xl font-normal text-foreground hover:text-brand">Eventos</Link>
                            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="text-xl font-normal text-foreground hover:text-brand">Como Funciona</Link>

                            {user ? (
                                <>
                                    <div className="h-px w-10 bg-gray-200"></div>
                                    <span className="text-lg font-normal text-brand uppercase tracking-tight">Olá, {user.name}</span>
                                    {user.role === 'ADMIN' && (
                                        <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xl font-normal text-foreground hover:text-brand uppercase tracking-tight">Painel Admin</Link>
                                    )}
                                    <Link href="/my-orders" onClick={() => setMobileMenuOpen(false)} className="text-xl font-normal text-foreground hover:text-brand uppercase tracking-tight">Meus Pedidos</Link>
                                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-xl font-normal text-foreground hover:text-brand uppercase tracking-tight">Configurações</Link>
                                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="text-xl font-normal text-red-500 pt-4 uppercase tracking-tight">Sair</button>
                                </>
                            ) : (
                                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="bg-black text-white px-10 py-3 rounded-full font-normal uppercase tracking-wider">ENTRAR</Link>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>
        </div>
    );
}
