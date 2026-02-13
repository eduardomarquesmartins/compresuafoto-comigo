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
            const data = await api.get('/events', { params: { status: 'ACTIVE' } });
            setEvents(data.data);
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
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white">
            <Navbar />

            <div className="pt-32 pb-20 px-6">
                <div className="container mx-auto">
                    <header className="mb-16 text-center">
                        <motion.span
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-block px-4 py-1.5 bg-brand/5 text-brand rounded-full text-sm font-medium tracking-wider uppercase mb-4"
                        >
                            GALERIA DE EVENTOS
                        </motion.span>
                        <p className="text-slate-500 font-light text-lg">Escolha um evento abaixo para encontrar suas fotos.</p>
                    </header>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
                        </div>
                    ) : (
                        <motion.div
                            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1 }
                                }
                            }}
                        >
                            {events.map((event) => (
                                <Link href={`/events/${event.id}`} key={event.id} className="block group cursor-pointer">
                                    <motion.div
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                    >
                                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden mb-5 border border-black/5 group-hover:border-brand/30 transition-all duration-500 shadow-sm group-hover:shadow-2xl group-hover:-translate-y-2">
                                            <img
                                                src={getImageUrl(event.coverImage)}
                                                alt={event.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                        </div>

                                        <div className="px-1 text-center">
                                            <h3 className="text-xl md:text-2xl font-light text-slate-800 group-hover:text-brand transition-colors line-clamp-2 uppercase tracking-tight leading-tight">
                                                {event.name}
                                            </h3>
                                        </div>
                                    </motion.div>
                                </Link>
                            ))}
                        </motion.div>
                    )}

                    {!loading && events.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-light text-xl">
                            Nenhum evento encontrado no momento.
                        </div>
                    )}
                </div>
            </div>

            <div className="pb-32">
                <DiscountCard />
            </div>
        </div>
    );
}
