"use client";
import React, { useState, useEffect } from "react";
import { Package, CheckCircle, Clock, AlertTriangle, Loader2, Search, Eye, X, ImagePlus, ChevronDown } from "lucide-react";
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
    event?: { id: number; name: string } | null;
}

interface PhotoOption {
    id: number;
    watermarkedUrl: string;
    originalUrl: string;
    eventId: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    approved: { label: "Aprovado", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle className="w-4 h-4" /> },
    PAID: { label: "Pago", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle className="w-4 h-4" /> },
    PENDING: { label: "Pendente", color: "text-yellow-600", bg: "bg-yellow-100", icon: <Clock className="w-4 h-4" /> },
    rejected: { label: "Rejeitado", color: "text-red-600", bg: "bg-red-100", icon: <AlertTriangle className="w-4 h-4" /> },
    cancelled: { label: "Cancelado", color: "text-slate-500", bg: "bg-slate-100", icon: <X className="w-4 h-4" /> },
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [filterEventId, setFilterEventId] = useState<number | "ALL">("ALL");

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
        try {
            const res = await api.get("/orders/admin/all");
            setOrders(res.data);
        } catch (error: any) {
            console.error("Error fetching orders:", error);
            const status = error.response?.status;
            const message = error.response?.data?.error || error.message;
            alert(`Erro ao buscar pedidos (Status: ${status}): ${message}`);
            if (status === 403 || status === 401) {
                // If unauthorized, maybe token expired
                console.log("Possibly unauthorized - checking session");
            }
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

    const handleViewDetails = async (order: Order) => {
        setSelectedOrder(order);
        setIsLoadingPhotos(true);
        try {
            const res = await api.get(`/orders/${order.publicId || order.id}`);
            setOrderPhotos(res.data.photos || []);
        } catch (error) {
            console.error("Error fetching order details:", error);
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
            setEvents(res.data);
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };

    const handleSelectEvent = async (eventId: number) => {
        setSelectedEventId(eventId);
        try {
            const res = await api.get(`/events/${eventId}`);
            setEventPhotos(res.data.photos || []);
        } catch (error) {
            console.error("Error fetching event photos:", error);
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
        return STATUS_MAP[status] || { label: status, color: "text-slate-500", bg: "bg-slate-100", icon: <Clock className="w-4 h-4" /> };
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
    const ordersByEvent = orders.reduce((acc: Record<number, { id: number; name: string, count: number }>, order: Order) => {
        const eventId = order.event?.id || 0;
        const eventName = order.event?.name || "Sem Evento";
        if (!acc[eventId]) {
            acc[eventId] = { id: eventId, name: eventName, count: 0 };
        }
        acc[eventId].count++;
        return acc;
    }, {} as Record<number, { id: number; name: string, count: number }>);

    const eventList = Object.values(ordersByEvent).sort((a: any, b: any) => b.count - a.count);

    const pendingCount = orders.filter((o: Order) => o.status === "PENDING").length;
    const approvedCount = orders.filter((o: Order) => o.status === "approved" || o.status === "PAID").length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                        <Package className="w-10 h-10 text-blue-500" />
                        Pedidos
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">Gerencie, aprove e adicione fotos aos pedidos.</p>
                </div>
                <div className="flex gap-4">
                </div>
            </div>

            {/* Event Grouping/Filter */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setFilterEventId("ALL")}
                    className={`flex-1 min-w-[150px] p-6 rounded-[32px] border transition-all text-left group ${filterEventId === "ALL" ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                >
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${filterEventId === "ALL" ? 'text-blue-100' : 'text-slate-500'}`}>Visão Geral</p>
                    <p className="text-2xl font-black text-white">Todos Eventos</p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${filterEventId === "ALL" ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                            {orders.length} pedidos
                        </span>
                    </div>
                </button>

                {eventList.map((ev) => (
                    <button
                        key={ev.id}
                        onClick={() => setFilterEventId(ev.id)}
                        className={`flex-1 min-w-[200px] p-6 rounded-[32px] border transition-all text-left group ${filterEventId === ev.id ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                    >
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${filterEventId === ev.id ? 'text-blue-100' : 'text-slate-500'}`}>Evento #{ev.id || 'N/A'}</p>
                        <p className="text-2xl font-black text-white line-clamp-1">{ev.name}</p>
                        <div className="flex items-center gap-2 mt-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${filterEventId === ev.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                {ev.count} pedidos
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, CPF, email ou ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {[
                        { key: "ALL", label: "Todos" },
                        { key: "PENDING", label: "Pendentes" },
                        { key: "approved", label: "Aprovados" },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/30 border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Pedido</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Cliente</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Fotos</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Total</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Data</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center text-slate-600 font-bold uppercase tracking-widest text-sm">
                                    Nenhum pedido encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const statusInfo = getStatusInfo(order.status);
                                const isPaid = order.status === "approved" || order.status === "PAID";
                                return (
                                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-white text-sm">#{order.id}</span>
                                            {order.couponCode && (
                                                <span className="ml-2 text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">
                                                    {order.couponCode}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-white text-sm">{order.user?.name || "Sem nome"}</p>
                                            <p className="text-xs text-slate-500">{order.user?.email}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusInfo.bg} ${statusInfo.color}`}>
                                                {statusInfo.icon}
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-white">{order.photoCount}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-white">R$ {order.total.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(order)}
                                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                                    title="Ver Detalhes"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                {!isPaid && (
                                                    <button
                                                        onClick={() => handleApprove(order)}
                                                        className="px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-500 transition-all"
                                                    >
                                                        Aprovar
                                                    </button>
                                                )}
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-[40px] w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl">
                        <div className="p-8">
                            {/* Modal Header */}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                                        Pedido #{selectedOrder.id}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {selectedOrder.user?.name || "Sem nome"} — {selectedOrder.user?.email}
                                        {selectedOrder.user?.cpf && ` — CPF: ${selectedOrder.user.cpf}`}
                                        {selectedOrder.user?.phone && ` — ${selectedOrder.user.phone}`}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-slate-800 rounded-2xl transition-all">
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>

                            {/* Order Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Status</p>
                                    <span className={`inline-flex items-center gap-1.5 text-sm font-black ${getStatusInfo(selectedOrder.status).color}`}>
                                        {getStatusInfo(selectedOrder.status).icon}
                                        {getStatusInfo(selectedOrder.status).label}
                                    </span>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Total</p>
                                    <p className="text-sm font-black text-white">R$ {selectedOrder.total.toFixed(2)}</p>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Fotos</p>
                                    <p className="text-sm font-black text-white">{selectedOrder.photoCount}</p>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Data</p>
                                    <p className="text-sm font-black text-white">{new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")}</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 mb-8">
                                {selectedOrder.status !== "approved" && selectedOrder.status !== "PAID" && (
                                    <button
                                        onClick={() => handleApprove(selectedOrder)}
                                        className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Aprovar Pedido
                                    </button>
                                )}
                                <button
                                    onClick={handleOpenAddPhotos}
                                    className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                                >
                                    <ImagePlus className="w-5 h-5" />
                                    Adicionar Fotos
                                </button>
                            </div>

                            {/* Photos Grid */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Fotos do Pedido</h3>
                                {isLoadingPhotos ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                    </div>
                                ) : orderPhotos.length === 0 ? (
                                    <p className="text-slate-600 text-center py-8 font-bold">Nenhuma foto neste pedido.</p>
                                ) : (
                                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                        {orderPhotos.map((photo) => (
                                            <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                                                <img
                                                    src={getImageUrl(photo.watermarkedUrl || photo.originalUrl)}
                                                    alt={`Foto #${photo.id}`}
                                                    className="w-full h-full object-cover"
                                                />
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-[40px] w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
                                        Adicionar Fotos
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Pedido #{selectedOrder.id}</p>
                                </div>
                                <button onClick={() => setShowAddPhotos(false)} className="p-3 hover:bg-slate-800 rounded-2xl transition-all">
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>

                            {/* Event Selector */}
                            <div className="mb-6">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Selecione um evento</label>
                                <div className="relative">
                                    <select
                                        value={selectedEventId || ""}
                                        onChange={(e) => handleSelectEvent(parseInt(e.target.value))}
                                        className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 font-bold text-white focus:border-blue-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">— Escolha o evento —</option>
                                        {events.map((ev) => (
                                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Photo Grid from Event */}
                            {selectedEventId && (
                                <>
                                    <p className="text-xs text-slate-500 mb-4">
                                        <span className="font-black text-blue-400">{selectedNewPhotos.length}</span> foto(s) selecionada(s)
                                    </p>
                                    <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6 max-h-[40vh] overflow-y-auto">
                                        {eventPhotos.map((photo) => {
                                            const isSelected = selectedNewPhotos.includes(photo.id);
                                            return (
                                                <button
                                                    key={photo.id}
                                                    onClick={() => togglePhotoSelection(photo.id)}
                                                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all relative ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/20' : 'border-slate-700 hover:border-slate-600'}`}
                                                >
                                                    <img
                                                        src={getImageUrl(photo.watermarkedUrl || photo.originalUrl)}
                                                        alt={`Foto #${photo.id}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center">
                                                            <CheckCircle className="w-8 h-8 text-white" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={handleAddPhotosSubmit}
                                        disabled={selectedNewPhotos.length === 0 || isAddingPhotos}
                                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isAddingPhotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                                        Adicionar {selectedNewPhotos.length} Foto(s) ao Pedido
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
