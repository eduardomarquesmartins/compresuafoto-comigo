"use client";
import { useEffect, useState } from 'react';
import { getEvents, deleteEvent, updateEvent } from '@/lib/api';
import Link from 'next/link';
import { Plus, Image as ImageIcon, Trash2, Edit, Archive, Filter } from 'lucide-react';

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
            // If filter is ALL, passing undefined to fetch everything (backend implementation dependent)
            // My backend currently: if status param is passed, it filters. If not, it returns all?
            // Let's pass param only if not ALL
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
                // Functional update to ensure we use the latest state
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
                    // Update the event status in the list
                    const updated = prev.map(e => e.id === event.id ? { ...e, status: newStatus } : e);

                    // If filter is active, remove from list if it doesn't match anymore
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
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-light text-white">Gerenciar Eventos</h1>
                    <p className="text-slate-400">Organize seus álbuns e vendas</p>
                </div>
                <Link href="/admin/events/create" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-blue-500/20 transition-all">
                    <Plus size={18} />
                    Novo Evento
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setFilterStatus('ACTIVE')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ACTIVE' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    Ativos
                </button>
                <button
                    onClick={() => setFilterStatus('ARCHIVED')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ARCHIVED' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    Arquivados
                </button>
                <button
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                    Todos
                </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-slate-700/50 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-slate-400 font-semibold border-b border-slate-700/50">
                        <tr>
                            <th className="px-6 py-4 w-20">ID</th>
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {loading ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-500">Carregando eventos...</td></tr>
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <Filter size={48} className="text-slate-700" />
                                        <span>Nenhum evento encontrado nesta categoria.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            events.map(event => (
                                <tr key={event.id} className="hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 text-slate-500">#{event.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-medium text-white">{event.name}</p>
                                        <p className="text-xs text-slate-500">{event._count?.photos || 0} fotos</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.status === 'ARCHIVED' ? 'bg-slate-800 text-slate-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {event.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2 justify-end leading-none items-center">
                                        <Link
                                            href={`/admin/events/edit/${event.id}`}
                                            className="text-slate-500 hover:text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Editar Detalhes"
                                        >
                                            <Edit size={18} />
                                        </Link>
                                        <button
                                            onClick={() => handleArchive(event)}
                                            className="text-slate-500 hover:text-amber-400 p-2 hover:bg-amber-500/10 rounded-lg transition-colors"
                                            title={event.status === 'ARCHIVED' ? 'Restaurar' : 'Arquivar'}
                                        >
                                            <Archive size={18} />
                                        </button>
                                        <Link
                                            href={`/admin/events/${event.id}/upload`}
                                            className="text-slate-500 hover:text-purple-400 p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
                                            title="Gerenciar Fotos"
                                        >
                                            <ImageIcon size={18} />
                                        </Link>
                                        <div className="w-px h-4 bg-slate-700 mx-1"></div>
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
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
