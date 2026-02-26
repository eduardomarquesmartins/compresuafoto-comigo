"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import DiscountCard from "@/components/DiscountCard";
import Navbar from "@/components/Navbar";

// Define Event Interface based on Backend Data
interface Event {
    id: number;
    name: string;
    date: string;
    description?: string;
    coverImage?: string;
}

export default function AllEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events', { params: { status: 'ACTIVE' } });
            setEvents(response.data);
        } catch (error) {
            console.error("Erro ao buscar eventos:", error);
        } finally {
            setLoading(false);
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop";
        if (path.startsWith('http')) return path;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com';
        return `${baseUrl}${path}`;
    };

    return (
        <>
            <Navbar />

            <div className="pt-48 pb-20 px-6 relative z-30">
                <div className="container mx-auto">
                    <header className="mb-16 text-center">
                        <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-block px-6 py-2 bg-brand/10 text-brand rounded-full text-sm font-bold tracking-widest uppercase mb-4"
                        >
                            GALERIA DE EVENTOS
                        </motion.span>
                        <p className="text-slate-800 font-normal text-xl">Escolha um evento abaixo para encontrar suas fotos.</p>
                    </header>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
                        </div>
                    ) : (
                        <motion.div
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            {events.map((event) => (
                                <Link href={`/events/${event.id}`} key={event.id} className="block group cursor-pointer">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white/[0.2] backdrop-blur-xl rounded-[2.5rem] p-4 border border-white/40 shadow-xl hover:shadow-brand/20 transition-all duration-500 hover:-translate-y-2 group"
                                    >
                                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5 shadow-sm">
                                            <img
                                                src={getImageUrl(event.coverImage)}
                                                alt={event.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                                        </div>

                                        <div className="px-2 pb-2 text-center">
                                            <h3 className="text-lg md:text-xl font-medium text-slate-900 group-hover:text-brand transition-colors uppercase tracking-wider leading-tight">
                                                {event.name}
                                            </h3>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </motion.div>
                    )}

                    {!loading && events.length === 0 && (
                        <div className="text-center py-20 text-slate-800 font-medium text-xl bg-white/40 backdrop-blur-md rounded-3xl border border-white">
                            Nenhum evento encontrado no momento.
                        </div>
                    )}
                </div>
            </div>

            <div className="pb-32 relative z-30 px-6">
                <div className="container mx-auto">
                    <DiscountCard />
                </div>
            </div>
        </>
    );
}
