"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Download, Package, Calendar, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Order {
    id: number;
    publicId: string;
    total: number;
    status: string;
    createdAt: string;
    items: string;
}

export default function MyOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // useLayoutEffect usually better for auth redirect to avoid flash but useEffect is standard in next
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));

        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders/my-orders');
            setOrders(res.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
            case 'approved':
                return <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-100/50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"><CheckCircle size={14} /> Pago</span>;
            case 'PENDING':
            case 'pending':
                return <span className="flex items-center gap-1.5 text-amber-600 bg-amber-100/50 border border-amber-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"><Clock size={14} /> Pendente</span>;
            default:
                return <span className="flex items-center gap-1.5 text-red-600 bg-red-100/50 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"><XCircle size={14} /> Cancelado</span>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPhotoCount = (itemsString: string) => {
        try {
            const items = JSON.parse(itemsString);
            return Array.isArray(items) ? items.length : 0;
        } catch (e) {
            return 0;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background font-sans selection:bg-brand/10 selection:text-brand">
            <Navbar />

            <div className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-5xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <h1 className="text-4xl font-normal text-slate-900 mb-2 tracking-tight">Meus Pedidos</h1>
                        <p className="text-lg text-slate-500 font-light">Gerencie suas fotos e realize o download dos seus pacotes.</p>
                    </motion.div>

                    {orders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-24 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2.5rem] shadow-sm"
                        >
                            <div className="bg-white p-6 rounded-full w-fit mx-auto shadow-sm mb-6">
                                <Package size={48} className="text-brand/50" />
                            </div>
                            <h2 className="text-2xl font-medium text-slate-900 mb-3">Você ainda não tem pedidos</h2>
                            <p className="text-slate-500 font-light mb-8 max-w-md mx-auto">
                                Participe dos eventos parceiros da & Conti e encontre suas fotos usando nossa tecnologia de IA.
                            </p>
                            <Link href="/events" className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-full font-medium shadow-lg shadow-brand/20 hover:bg-slate-900 transition-all hover:scale-105 active:scale-95">
                                Ver Eventos Disponíveis <ArrowRight size={18} />
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {orders.map((order, idx) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/60 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:bg-white/80 transition-all duration-300 group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                            <Calendar size={16} className="text-brand/60" />
                                            {formatDate(order.createdAt).split(' às ')[0]}
                                        </div>
                                        {getStatusBadge(order.status)}
                                    </div>

                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-sm text-slate-400 font-medium">Total</span>
                                            <span className="text-3xl font-normal text-slate-900">R$ {order.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/50 w-fit px-3 py-1 rounded-lg border border-white/50">
                                            <Package size={14} />
                                            {getPhotoCount(order.items)} fotos selecionadas
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-auto">
                                        {(order.status === 'PAID' || order.status === 'approved') ? (
                                            <a
                                                href={`${process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com'}/api/orders/${order.publicId || order.id}/zip`}
                                                target="_blank"
                                                className="w-full bg-brand text-white hover:bg-brand-dark py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand/20 hover:shadow-brand/40 hover:-translate-y-1 active:translate-y-0"
                                            >
                                                <Download size={20} />
                                                Baixar Fotos
                                            </a>
                                        ) : (
                                            <div className="w-full bg-slate-100 text-slate-400 border border-slate-200 py-4 rounded-xl font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                                                <AlertCircle size={20} />
                                                Aguardando Pagamento
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
