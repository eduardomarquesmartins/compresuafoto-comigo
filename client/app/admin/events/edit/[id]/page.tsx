"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEvent, updateEvent } from '@/lib/api'; // Ensure getEvent is exported correctly
import { useParams } from 'next/navigation';
import { Save, ArrowLeft, Archive, RefreshCw } from 'lucide-react';

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        description: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        if (params?.id) {
            loadEvent(params.id as string);
        }
    }, [params?.id]);

    const loadEvent = async (id: string) => {
        try {
            const event = await getEvent(id);
            if (!event) {
                alert('Evento indisponível no momento');
                router.push('/admin/events');
                return;
            }
            setFormData({
                name: event.name,
                date: event.date.split('T')[0], // Extract YYYY-MM-DD
                description: event.description || '',
                status: event.status || 'ACTIVE'
            });
        } catch (error) {
            alert('Falha ao carregar evento');
            router.push('/admin/events');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateEvent(Number(params?.id), formData);
            alert('Evento atualizado com sucesso!');
            router.push('/admin/events');
        } catch (error) {
            alert('Erro ao atualizar evento');
        } finally {
            setSaving(false);
        }
    };

    const toggleArchive = async () => {
        const newStatus = formData.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
        if (!confirm(`Deseja realmente ${newStatus === 'ARCHIVED' ? 'arquivar' : 'ativar'} este evento?`)) return;

        try {
            await updateEvent(Number(params?.id), { status: newStatus });
            setFormData({ ...formData, status: newStatus });
            alert(`Evento ${newStatus === 'ARCHIVED' ? 'arquivado' : 'ativado'} com sucesso!`);
        } catch (error) {
            alert('Erro ao alterar status');
        }
    };

    if (loading) return <div className="p-10 text-center">Carregando...</div>;

    return (
        <div className="max-w-2xl mx-auto text-white">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold tracking-tight text-white">Editar Evento</h1>
                <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${formData.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                    {formData.status === 'ACTIVE' ? 'ATIVO' : 'ARQUIVADO'}
                </span>
            </header>

            <form onSubmit={handleSubmit} className="bg-[#0b0b0d]/80 backdrop-blur-2xl p-8 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] space-y-6">
                <div>
                    <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Nome do Evento</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#0a72ef]/70 focus:ring-4 focus:ring-[#0a72ef]/15"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Descrição</label>
                    <textarea
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#0a72ef]/70 focus:ring-4 focus:ring-[#0a72ef]/15 resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-6 border-t border-white/10 mt-8 items-center">
                    <button
                        type="button"
                        onClick={toggleArchive}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-colors ${formData.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20' : 'text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20'}`}
                    >
                        {formData.status === 'ACTIVE' ? <Archive size={16} /> : <RefreshCw size={16} />}
                        {formData.status === 'ACTIVE' ? 'Arquivar Evento' : 'Reativar Evento'}
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="ml-auto flex items-center gap-2 bg-[#0a72ef] hover:bg-[#0a72ef]/90 text-white px-8 py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}
