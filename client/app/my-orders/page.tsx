"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Download, Package, Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronLeft } from 'lucide-react';
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
        // Check auth
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
                return <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-sm"><CheckCircle size={14} /> Pago</span>;
            case 'PENDING':
            case 'pending':
                return <span className="flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full text-sm"><Clock size={14} /> Pendente</span>;
            default:
                return <span className="flex items-center gap-1 text-red-400 bg-red-400/10 px-3 py-1 rounded-full text-sm"><XCircle size={14} /> Cancelado</span>;
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
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-12 pb-12 px-4 font-sans">
            <div className="container mx-auto">
                {/* Header with Logo and Back Button */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <Link href="/" className="transition-transform hover:scale-105">
                        <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
                    </Link>

                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group px-4 py-2 rounded-full border border-white/5 hover:bg-white/5"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-bold uppercase text-xs tracking-widest">Voltar para Início</span>
                    </Link>
                </div>

                <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 gap-4 border-b border-white/5 pb-8">
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Meus Pedidos</h1>
                        <p className="text-gray-400 font-medium">Gerencie suas fotos e downloads recentes.</p>
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                        <Package size={48} className="mx-auto text-gray-600 mb-4" />
                        <h2 className="text-xl font-bold text-gray-300 mb-2">Você ainda não tem pedidos</h2>
                        <p className="text-gray-500 mb-6">Explore os eventos e encontre suas fotos!</p>
                        <Link href="/" className="bg-brand text-white px-6 py-3 rounded-full font-bold hover:bg-brand/80 transition-colors">
                            Ver Eventos
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map((order) => (
                            <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-brand/30 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                        <Calendar size={14} />
                                        {formatDate(order.createdAt)}
                                    </div>
                                    {getStatusBadge(order.status)}
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm text-gray-400">Total:</span>
                                        <span className="text-2xl font-bold text-white">R$ {order.total.toFixed(2)}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1">
                                        {getPhotoCount(order.items)} fotos selecionadas
                                    </div>
                                </div>

                                <div className="border-t border-white/10 pt-4 mt-4">
                                    {(order.status === 'PAID' || order.status === 'approved') ? (
                                        <a
                                            href={`${process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com'}/api/orders/${order.publicId || order.id}/zip`}
                                            target="_blank"
                                            className="w-full bg-brand/20 hover:bg-brand text-brand hover:text-white border border-brand/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Download size={18} />
                                            Baixar Fotos
                                        </a>
                                    ) : (
                                        <div className="w-full bg-white/5 text-gray-500 py-3 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                                            <AlertCircle size={18} />
                                            Aguardando Pagamento
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
