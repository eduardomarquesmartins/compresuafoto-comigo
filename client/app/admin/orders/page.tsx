"use client";
import React, { useState, useEffect } from "react";
import { CheckCircle, Clock, AlertTriangle, Loader2, Search, Eye, X, ImagePlus, ChevronDown, GitMerge } from "lucide-react";
import api from "@/lib/api";

interface OrderUser {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    cpf: string | null;
}

interface Order {
    id: number;
    publicId: string;
    total: number;
    status: string;
    items: string;
    userId: number;
    couponCode: string | null;
    createdAt: string;
    user: OrderUser;
    photoCount: number;
    event?: { id: number; name: string; status?: string } | null;
}

interface PhotoOption {
    id: number;
    watermarkedUrl: string;
    originalUrl: string;
    eventId: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    approved: { label: "Aprovado", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20 shadow-[inset_0_0_10px_rgba(7ade80,0.1)]", icon: <CheckCircle className="w-3 h-3" /> },
    PAID: { label: "Pago", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20 shadow-[inset_0_0_10px_rgba(7ade80,0.1)]", icon: <CheckCircle className="w-3 h-3" /> },
    PENDING: { label: "Pendente", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]", icon: <Clock className="w-3 h-3" /> },
    rejected: { label: "Rejeitado", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20 shadow-[inset_0_0_10px_rgba(248,113,113,0.1)]", icon: <AlertTriangle className="w-3 h-3" /> },
    cancelled: { label: "Cancelado", color: "text-slate-400", bg: "bg-slate-800/50 border-slate-700", icon: <X className="w-3 h-3" /> },
    MERGED: { label: "Unificado", color: "text-violet-300", bg: "bg-violet-500/10 border-violet-500/20", icon: <GitMerge className="w-3 h-3" /> },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [filter, setFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterEventId, setFilterEventId] = useState<number | "ALL">("ALL");
    const [showOnlyActive, setShowOnlyActive] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
    const [isMergingOrders, setIsMergingOrders] = useState(false);

    // Detail Modal
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderPhotos, setOrderPhotos] = useState<PhotoOption[]>([]);
    const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

    // Add Photos Modal
    const [showAddPhotos, setShowAddPhotos] = useState(false);
    const [eventPhotos, setEventPhotos] = useState<PhotoOption[]>([]);
    const [selectedNewPhotos, setSelectedNewPhotos] = useState<number[]>([]);
    const [isAddingPhotos, setIsAddingPhotos] = useState(false);
    const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        setFetchError(null);

        try {
            const res = await api.get("/orders/admin/all");
            setOrders(res.data);
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.code === 'ECONNABORTED'
                ? 'A API demorou para responder. Tente novamente em instantes.'
                : error.code === 'ERR_NETWORK'
                    ? 'Não foi possível conectar na API. Verifique se o servidor está ativo.'
                    : error.response?.data?.error || error.message || 'Erro inesperado ao buscar pedidos.';

            setOrders([]);
            setFetchError(status ? `Erro ${status}: ${message}` : message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (order: Order) => {
        if (!confirm(`Aprovar pedido #${order.id} de ${order.user?.name || order.user?.email}?`)) return;
        try {
            await api.patch(`/orders/${order.id}/status`, { status: "approved" });
            fetchOrders();
            if (selectedOrder?.id === order.id) {
                setSelectedOrder({ ...selectedOrder, status: "approved" });
            }
        } catch (error) {
            alert("Erro ao aprovar pedido.");
        }
    };

    const toggleOrderSelection = (orderId: number) => {
        setSelectedOrderIds((current) => current.includes(orderId)
            ? current.filter((id) => id !== orderId)
            : [...current, orderId]);
    };

    const handleMergeOrders = async () => {
        const selectedOrders = orders.filter((order) => selectedOrderIds.includes(order.id));
        if (selectedOrders.length < 2) {
            alert('Selecione pelo menos dois pedidos pendentes.');
            return;
        }

        const sameCustomer = selectedOrders.every((order) => order.userId === selectedOrders[0].userId);
        const onlyPending = selectedOrders.every((order) => order.status === 'PENDING');
        if (!sameCustomer || !onlyPending) {
            alert('Selecione somente pedidos pendentes da mesma cliente.');
            return;
        }

        const total = selectedOrders.reduce((sum, order) => sum + order.total, 0);
        const customerName = selectedOrders[0].user?.name || selectedOrders[0].user?.email || 'esta cliente';
        const confirmed = confirm(
            `Unificar ${selectedOrders.length} pedidos de ${customerName} em um único pedido de R$ ${total.toFixed(2)}?\n\nOs pedidos originais permanecerão no histórico como “Unificado” e não poderão mais ser aprovados.`
        );
        if (!confirmed) return;

        setIsMergingOrders(true);
        try {
            const response = await api.post('/orders/admin/merge', { orderIds: selectedOrderIds });
            alert(`Pedido #${response.data.order.id} criado com ${response.data.photoCount} foto(s).`);
            setSelectedOrderIds([]);
            setSelectedOrder(null);
            await fetchOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Não foi possível unificar os pedidos.');
        } finally {
            setIsMergingOrders(false);
        }
    };

    const handleViewDetails = async (order: Order) => {
        setSelectedOrder(order);
        setIsLoadingPhotos(true);
        try {
            const res = await api.get(`/orders/${order.publicId || order.id}`);
            setOrderPhotos(res.data.photos || []);
        } catch (error) {
            console.warn("Error fetching order details. Rendering empty photo list.");
            setOrderPhotos([]);
        } finally {
            setIsLoadingPhotos(false);
        }
    };

    const handleOpenAddPhotos = async () => {
        setShowAddPhotos(true);
        setSelectedNewPhotos([]);
        setSelectedEventId(null);
        setEventPhotos([]);
        try {
            const res = await api.get("/events");
            setEvents(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.warn("Error fetching events. Rendering empty event list.");
            setEvents([]);
        }
    };

    const handleSelectEvent = async (eventId: number) => {
        setSelectedEventId(eventId);
        try {
            const res = await api.get(`/events/${eventId}`);
            setEventPhotos(res.data.photos || []);
        } catch (error) {
            console.warn("Error fetching event photos. Rendering empty photo list.");
            setEventPhotos([]);
        }
    };

    const togglePhotoSelection = (photoId: number) => {
        setSelectedNewPhotos((prev: number[]) =>
            prev.includes(photoId) ? prev.filter((id: number) => id !== photoId) : [...prev, photoId]
        );
    };

    const handleAddPhotosSubmit = async () => {
        if (!selectedOrder || selectedNewPhotos.length === 0) return;
        setIsAddingPhotos(true);
        try {
            await api.post(`/orders/${selectedOrder.id}/photos`, { photoIds: selectedNewPhotos });
            alert(`${selectedNewPhotos.length} foto(s) adicionada(s) ao pedido!`);
            setShowAddPhotos(false);
            fetchOrders();
            handleViewDetails(selectedOrder);
        } catch (error) {
            alert("Erro ao adicionar fotos.");
        } finally {
            setIsAddingPhotos(false);
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com';
        return `${baseUrl}${path}`;
    };

    const getStatusInfo = (status: string) => {
        return STATUS_MAP[status] || { label: status, color: "text-slate-400", bg: "bg-slate-800 border-slate-700", icon: <Clock className="w-3 h-3" /> };
    };

    const filteredOrders = orders.filter((o: Order) => {
        const matchesEvent = filterEventId === "ALL" || o.event?.id === filterEventId;
        const matchesFilter = filter === "ALL" || o.status === filter;
        const matchesSearch = searchTerm === "" ||
            o.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.user?.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.publicId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toString().includes(searchTerm);
        return matchesEvent && matchesFilter && matchesSearch;
    });

    // Get unique events from orders for the filter
    const ordersByEvent = orders.reduce((acc: Record<number, { id: number; name: string, status: string, count: number }>, order: Order) => {
        const eventId = order.event?.id || 0;
        const eventName = order.event?.name || "Sem Evento";
        const eventStatus = order.event?.status || "INACTIVE";
        if (!acc[eventId]) {
            acc[eventId] = { id: eventId, name: eventName, status: eventStatus, count: 0 };
        }
        acc[eventId].count++;
        return acc;
    }, {} as Record<number, { id: number; name: string, status: string, count: number }>);

    const eventList = Object.values(ordersByEvent)
        .filter((ev: any) => !showOnlyActive || ev.status === "ACTIVE")
        .sort((a: any, b: any) => b.count - a.count);

    const pendingCount = orders.filter((o: Order) => o.status === "PENDING").length;
    const approvedCount = orders.filter((o: Order) => o.status === "approved" || o.status === "PAID").length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="pb-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="mb-2">
                        <span className="text-blue-500 font-medium tracking-widest uppercase text-xs">Gestão Financeira</span>
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight flex items-center gap-4">
                        Pedidos
                    </h1>
                </div>
                <div className="flex flex-wrap gap-4">
                    {selectedOrderIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleMergeOrders}
                            disabled={selectedOrderIds.length < 2 || isMergingOrders}
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-violet-950/30 transition-all hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isMergingOrders ? <Loader2 size={16} className="animate-spin" /> : <GitMerge size={16} />}
                            {isMergingOrders ? 'Unificando...' : `Unificar ${selectedOrderIds.length} pedido${selectedOrderIds.length > 1 ? 's' : ''}`}
                        </button>
                    )}
                    <button
                        onClick={() => setShowOnlyActive(!showOnlyActive)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${showOnlyActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 text-slate-400 hover:text-white'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${showOnlyActive ? 'bg-white animate-pulse' : 'bg-slate-600'}`} />
                        {showOnlyActive ? 'Eventos Ativos' : 'Todos Eventos'}
                    </button>
                </div>
            </div>

            {/* Event Grouping/Filter */}
            {fetchError && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-amber-100 shadow-2xl shadow-amber-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-50">Pedidos indisponíveis no momento</p>
                            <p className="mt-1 text-sm text-amber-100/80">{fetchError}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchOrders}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-400/20"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Event Grouping/Filter */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setFilterEventId("ALL")}
                    className={`flex-1 min-w-[150px] p-6 rounded-[24px] border transition-all text-left group overflow-hidden relative ${filterEventId === "ALL" ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]' : 'bg-[#0a0a0c]/80 backdrop-blur-xl border-white/5 hover:border-white/10'}`}
                >
                    {filterEventId === "ALL" && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    )}
                    <div className="relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${filterEventId === "ALL" ? 'text-blue-400' : 'text-slate-500'}`}>Visão Geral</p>
                        <p className={`text-2xl font-light tracking-tight ${filterEventId === "ALL" ? 'text-white' : 'text-slate-300 group-hover:text-white transition-colors'}`}>Todos Eventos</p>
                        <div className="mt-4">
                            <span className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${filterEventId === "ALL" ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                                {orders.length} pedidos
                            </span>
                        </div>
                    </div>
                </button>

                {eventList.map((ev) => (
                    <button
                        key={ev.id}
                        onClick={() => setFilterEventId(ev.id)}
                        className={`flex-1 min-w-[200px] p-6 rounded-[24px] border transition-all text-left group overflow-hidden relative ${filterEventId === ev.id ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]' : 'bg-[#0a0a0c]/80 backdrop-blur-xl border-white/5 hover:border-white/10'}`}
                    >
                        {filterEventId === ev.id && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        )}
                        <div className="relative z-10">
                            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${filterEventId === ev.id ? 'text-blue-400' : 'text-slate-500'}`}>Evento #{ev.id || 'N/A'}</p>
                            <p className={`text-2xl font-light tracking-tight line-clamp-1 ${filterEventId === ev.id ? 'text-white' : 'text-slate-300 group-hover:text-white transition-colors'}`}>{ev.name}</p>
                            <div className="mt-4">
                                <span className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${filterEventId === ev.id ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                                    {ev.count} pedidos
                                </span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou pedido..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-2xl text-white text-sm placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-lg"
                    />
                </div>
                <div className="flex gap-2 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 p-2 rounded-2xl">
                    {[
                        { key: "ALL", label: "Todos" },
                        { key: "PENDING", label: "Pendentes" },
                        { key: "approved", label: "Aprovados" },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === f.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-[#0a0a0c]/80 backdrop-blur-xl rounded-[32px] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                <table className="w-full text-left">
                    <thead className="bg-black/40 border-b border-white/5">
                        <tr>
                            <th className="w-12 px-4 py-5" aria-label="Selecionar pedidos" />
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-24">Pedido</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fotos</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Data</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right w-36">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-inner">
                                            <Search size={32} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-slate-300 font-medium tracking-wide">Nenhum pedido encontrado</p>
                                            <p className="text-slate-600 text-sm mt-1">Altere os filtros ou termos da busca.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const statusInfo = getStatusInfo(order.status);
                                const canApprove = order.status === 'PENDING';
                                const isSelected = selectedOrderIds.includes(order.id);
                                return (
                                    <tr key={order.id} className={`transition-colors group ${isSelected ? 'bg-violet-500/[0.06]' : 'hover:bg-white/[0.02]'}`}>
                                        <td className="px-4 py-6 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={order.status !== 'PENDING'}
                                                onChange={() => toggleOrderSelection(order.id)}
                                                aria-label={`Selecionar pedido #${order.id}`}
                                                className="h-4 w-4 cursor-pointer accent-violet-500 disabled:cursor-not-allowed disabled:opacity-25"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-sm font-bold text-slate-500 group-hover:text-blue-400 transition-colors">#{order.id}</span>
                                            {order.couponCode && (
                                                <div className="mt-1.5">
                                                    <span className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                                        {order.couponCode}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="font-medium text-white text-sm tracking-tight mb-1">{order.user?.name || "Sem nome"}</p>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{order.user?.email}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase border border-solid ${statusInfo.bg} ${statusInfo.color}`}>
                                                {statusInfo.icon}
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-1.5 text-slate-300 font-medium text-sm border border-white/5 bg-white/[0.02] w-fit px-3 py-1.5 rounded-lg">
                                                <ImagePlus size={14} className="text-slate-500" />
                                                <span>{order.photoCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-light tracking-tight text-white text-base">R$ {order.total.toFixed(2)}</span>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-400 font-medium tracking-tight">
                                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                {canApprove && (
                                                    <button
                                                        onClick={() => handleApprove(order)}
                                                        className="text-slate-400 hover:text-green-400 p-2 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 rounded-lg transition-all"
                                                        title="Aprovar Pedido"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleViewDetails(order)}
                                                    className="text-slate-400 hover:text-blue-400 p-2 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-lg transition-all"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0c] border border-white/10 rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                        <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10 shrink-0">
                            <div>
                                <h2 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                                    Detalhes do Pedido <span className="font-mono text-blue-500">#{selectedOrder.id}</span>
                                </h2>
                                <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mt-2">
                                    {selectedOrder.user?.name || "Sem nome"} • {selectedOrder.user?.email}
                                    {selectedOrder.user?.cpf && ` • CPF: ${selectedOrder.user.cpf}`}
                                    {selectedOrder.user?.phone && ` • ${selectedOrder.user.phone}`}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto overflow-x-hidden relative z-10 custom-scrollbar">
                            {/* Order Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase border border-solid ${getStatusInfo(selectedOrder.status).bg} ${getStatusInfo(selectedOrder.status).color}`}>
                                        {getStatusInfo(selectedOrder.status).icon}
                                        {getStatusInfo(selectedOrder.status).label}
                                    </span>
                                </div>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Pago</p>
                                    <p className="text-2xl font-light text-white tracking-tight">R$ {selectedOrder.total.toFixed(2)}</p>
                                </div>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Fotos</p>
                                    <p className="text-2xl font-light text-white tracking-tight">{selectedOrder.photoCount}</p>
                                </div>
                                <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Data Criação</p>
                                    <p className="text-lg font-medium text-white tracking-tight mt-1">{new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {selectedOrder.status !== "MERGED" && (
                                <div className="flex gap-4 mb-10">
                                    {selectedOrder.status === "PENDING" && (
                                        <button
                                            onClick={() => handleApprove(selectedOrder)}
                                            className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-[inset_0_0_15px_rgba(7ade80,0.1)]"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Confirmar Pagamento
                                        </button>
                                    )}
                                    <button
                                        onClick={handleOpenAddPhotos}
                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 py-4 rounded-xl font-bold uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                    >
                                        <ImagePlus className="w-4 h-4" />
                                        Vincular Fotos Manuais
                                    </button>
                                </div>
                            )}

                            {/* Photos Grid */}
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                                    <ImagePlus size={14} /> Fotos Adquiridas
                                </h3>
                                {isLoadingPhotos ? (
                                    <div className="flex justify-center py-20">
                                        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                    </div>
                                ) : orderPhotos.length === 0 ? (
                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl py-16 flex flex-col items-center justify-center text-center">
                                        <ImagePlus size={40} className="text-slate-700 mb-4" />
                                        <p className="text-slate-300 font-medium">Nenhuma foto indexada.</p>
                                        <p className="text-slate-600 text-sm mt-1">Este pedido ainda não possui fotos vinculadas.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {orderPhotos.map((photo) => (
                                            <div key={photo.id} className="group aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 border border-white/10 relative">
                                                <img
                                                    src={getImageUrl(photo.watermarkedUrl || photo.originalUrl)}
                                                    alt={`Foto #${photo.id}`}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                    <span className="text-[10px] font-mono text-white/70">ID: {photo.id}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Photos Modal */}
            {showAddPhotos && selectedOrder && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-[#0a0a0c] border border-white/10 rounded-[32px] w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-light tracking-tight text-white flex items-center gap-3">
                                    <ImagePlus className="text-blue-500" /> Vincular Fotos Extras
                                </h2>
                                <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mt-2">Adição manual para o pedido #{selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setShowAddPhotos(false)} className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Event Selector */}
                            <div className="mb-8">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">1. Origem das Fotos</label>
                                <div className="relative">
                                    <select
                                        value={selectedEventId || ""}
                                        onChange={(e) => handleSelectEvent(parseInt(e.target.value))}
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-5 text-sm font-medium tracking-wide text-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer hover:bg-white/[0.04]"
                                    >
                                        <option value="" className="bg-slate-900 text-slate-500">— Selecione a base de dados do evento —</option>
                                        {events.map((ev) => (
                                            <option key={ev.id} value={ev.id} className="bg-slate-900">{ev.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Photo Grid from Event */}
                            {selectedEventId && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-end mb-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">2. Selecione as imagens</label>
                                        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                                            <span className="text-blue-400 font-black">{selectedNewPhotos.length}</span> Marcações
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 p-1">
                                        {eventPhotos.length === 0 ? (
                                            <div className="col-span-full py-10 text-center text-slate-500 font-medium">Este evento não possui fotos sincronizadas.</div>
                                        ) : (
                                            eventPhotos.map((photo) => {
                                                const isSelected = selectedNewPhotos.includes(photo.id);
                                                return (
                                                    <button
                                                        key={photo.id}
                                                        onClick={() => togglePhotoSelection(photo.id)}
                                                        className={`group aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all relative ${isSelected ? 'border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-[0.98]' : 'border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <img
                                                            src={getImageUrl(photo.watermarkedUrl || photo.originalUrl)}
                                                            alt={`Foto #${photo.id}`}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                        />
                                                        {isSelected && (
                                                            <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[2px] flex items-center justify-center transition-all">
                                                                <div className="bg-blue-500 rounded-full p-2 shadow-lg">
                                                                    <CheckCircle className="w-6 h-6 text-white" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="sticky bottom-0 bg-[#0a0a0c] pt-4 border-t border-white/5">
                                        <button
                                            onClick={handleAddPhotosSubmit}
                                            disabled={selectedNewPhotos.length === 0 || isAddingPhotos}
                                            className="w-full bg-blue-600 text-white py-5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                        >
                                            {isAddingPhotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                            Vincular {selectedNewPhotos.length} {selectedNewPhotos.length === 1 ? 'Foto' : 'Fotos'} ao Pedido
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
