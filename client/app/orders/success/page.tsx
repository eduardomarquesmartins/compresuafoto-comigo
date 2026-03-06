"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { CheckCircle, Download, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";

interface Order {
    id: number;
    publicId?: string;
    status: string;
    total: number;
    photos: {
        id: number;
        originalUrl: string | null;
        watermarkedUrl: string;
    }[];
}

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get("external_reference") || searchParams.get("id"); // From Mercado Pago OR Email Link
    const paymentStatus = searchParams.get("status"); // 'approved', 'pending'

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [simulating, setSimulating] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrder(orderId);
            // Optionally update status immediately if URL says approved
            if (paymentStatus === 'approved') {
                updateStatus(orderId, 'approved');
            }
        } else {
            // Stop loading if no ID found
            setLoading(false);
        }
    }, [orderId, paymentStatus]);

    const fetchOrder = async (id: string) => {
        try {
            const res = await api.get(`/orders/${id}`);
            setOrder(res.data);
        } catch (error) {
            console.error("Erro ao buscar pedido:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/orders/${id}/status`, { status });
            fetchOrder(id); // Reload to get originalUrls
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
        }
    };


    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com';
        return `${baseUrl}${path}`;
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback
            window.open(url, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
                    <p className="text-gray-600 mt-2">Verifique se o link está correto.</p>
                </div>
            </div>
        );
    }

    const isPaid = order.status === 'approved' || order.status === 'PAID';

    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-6 flex flex-col items-center pt-20">
            <div className={`max-w-3xl w-full bg-white shadow-xl border ${isPaid ? 'border-green-500/20' : 'border-yellow-500/20'} rounded-3xl p-8 mb-8 text-center`}>

                {isPaid ? (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Compra Confirmada!</h1>
                        <p className="text-gray-600 mb-6">Suas fotos foram desbloqueadas. Você pode baixá-las abaixo.</p>

                        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                            <ShieldCheck className="text-green-500" />
                            <div className="text-left">
                                <p className="text-sm text-gray-500">ID do Pedido</p>
                                <p className="font-mono text-black">{order.id}</p>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-2"></div>
                            <div className="text-left">
                                <p className="text-sm text-gray-500">Total Pago</p>
                                <p className="font-bold text-green-600">R$ {order.total.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <a
                                href={`${process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com'}/api/orders/${order.publicId || order.id}/zip`}
                                target="_blank"
                                className="bg-brand hover:bg-brand/80 text-white px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 shadow-xl shadow-brand/20"
                            >
                                <Download size={24} />
                                Baixar Todas (ZIP)
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                            <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Aguardando Pagamento</h1>
                        <p className="text-gray-300 mb-6">Estamos confirmando seu pagamento. Assim que aprovar, suas fotos aparecerão aqui.</p>

                    </div>
                )}
            </div>

            {isPaid && (
                <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {order.photos.map((photo) => (
                        <div key={photo.id} className="bg-white border border-slate-100 shadow-lg rounded-2xl overflow-hidden group">
                            <div className="relative aspect-[2/3]">
                                <img
                                    src={getImageUrl(photo.originalUrl || photo.watermarkedUrl)} // Fallback just in case
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => handleDownload(getImageUrl(photo.originalUrl || photo.watermarkedUrl), `foto-${photo.id}.jpg`)}
                                        className="bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
                                    >
                                        <Download size={20} />
                                        Baixar
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between">
                                <span className="text-sm text-gray-500 font-medium">Foto #{photo.id}</span>
                                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full uppercase tracking-wider font-bold">Desbloqueada</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 text-brand animate-spin" /></div>}>
            <OrderSuccessContent />
        </Suspense>
    );
}
