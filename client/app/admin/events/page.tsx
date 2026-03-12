"use client";
import { useEffect, useState } from 'react';
import { getEvents, deleteEvent, updateEvent } from '@/lib/api';
import Link from 'next/link';
import { Plus, Image as ImageIcon, Trash2, Edit, Archive, Filter, Sparkles, Calendar } from 'lucide-react';

interface Event {
    id: number;
    name: string;
    date: string;
    description: string;
    status?: string;
    _count?: {
        photos: number;
    }
}

export default function AdminEventsPage() {
    const [events, setEvents] = useState<Event[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('ACTIVE'); // 'ACTIVE', 'ARCHIVED', 'ALL'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, [filterStatus]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const statusParam = filterStatus === 'ALL' ? undefined : filterStatus;
            const data = await getEvents(statusParam);
            setEvents(data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Tem certeza que deseja excluir permanentemente este evento?')) {
            try {
                await deleteEvent(id);
                setEvents(prev => prev.filter(e => e.id !== id));
            } catch (error) {
                alert('Erro ao excluir evento');
            }
        }
    };

    const handleArchive = async (event: Event) => {
        const newStatus = event.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
        if (confirm(`Deseja ${newStatus === 'ARCHIVED' ? 'arquivar' : 'ativar'} este evento?`)) {
            try {
                await updateEvent(event.id, { status: newStatus });

                setEvents(prev => {
                    const updated = prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e);
                    if (filterStatus !== 'ALL' && newStatus !== filterStatus) {
                        return updated.filter(e => e.id !== event.id);
                    }
                    return updated;
                });
            } catch (error) {
                alert('Erro ao alterar status');
            }
        }
    };

    return (
        <div className="pb-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="text-blue-500 h-5 w-5" />
                        <span className="text-blue-500 font-medium tracking-widest uppercase text-xs">Gestão de Álbuns</span>
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight">Gerenciar Eventos</h1>
                </div>
                <Link href="/admin/events/create" className="group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-white/10 active:scale-95">
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Novo Evento
                </Link>
            </header>

            {/* Filters */}
            <div className="flex gap-2 mb-8 bg-[#0a0a0c]/80 backdrop-blur-xl p-2 rounded-2xl w-fit border border-white/5">
                {[
                    { id: 'ACTIVE', label: 'Ativos' },
                    { id: 'ARCHIVED', label: 'Arquivados' },
                    { id: 'ALL', label: 'Todos' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilterStatus(f.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filterStatus === f.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="bg-[#0a0a0c]/80 backdrop-blur-xl rounded-[32px] border border-white/5 shadow-2xl overflow-hidden relative">
                {/* Glow reflexivo no topo da tabela */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>

                <table className="w-full text-left">
                    <thead className="bg-black/40 border-b border-white/5">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-24">ID</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nome do Evento</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-32">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right w-56">Ações Rápidas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-16">
                                    <div className="flex justify-center items-center text-blue-500">
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                </td>
                            </tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-inner">
                                            <Calendar size={32} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-slate-300 font-medium tracking-wide">Nenhum evento encontrado</p>
                                            <p className="text-slate-600 text-sm mt-1">Altere o filtro ou crie um novo evento.</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            events.map(event => (
                                <tr key={event.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-mono text-sm font-bold text-slate-500 group-hover:text-blue-400 transition-colors">#{event.id}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-medium text-white text-base tracking-tight mb-1">{event.name}</p>
                                        <p className="text-xs font-semibold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                                            <ImageIcon size={12} className="text-blue-500" />
                                            {event._count?.photos || 0} fotos indexadas
                                        </p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase border ${event.status === 'ARCHIVED'
                                                ? 'bg-slate-900 border-slate-700 text-slate-400'
                                                : 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[inset_0_0_10px_rgba(7ade80,0.1)]'
                                            }`}>
                                            {event.status === 'ARCHIVED' ? 'Arquivado' : 'Ativo'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-end gap-2 items-center">
                                            <Link
                                                href={`/admin/events/edit/${event.id}`}
                                                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-lg transition-all"
                                                title="Editar Detalhes"
                                            >
                                                <Edit size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleArchive(event)}
                                                className="text-slate-400 hover:text-amber-400 p-2 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 rounded-lg transition-all"
                                                title={event.status === 'ARCHIVED' ? 'Restaurar' : 'Arquivar'}
                                            >
                                                <Archive size={16} />
                                            </button>
                                            <Link
                                                href={`/admin/events/${event.id}/upload`}
                                                className="text-slate-400 hover:text-purple-400 p-2 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/20 rounded-lg transition-all"
                                                title="Gerenciar Fotos"
                                            >
                                                <ImageIcon size={16} />
                                            </Link>
                                            <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="text-slate-400 hover:text-red-400 p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all"
                                                title="Excluir Permanentemente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
