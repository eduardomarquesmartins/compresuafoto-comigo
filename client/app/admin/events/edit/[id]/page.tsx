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
        <div className="max-w-2xl mx-auto">
            <header className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Editar Evento</h1>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {formData.status === 'ACTIVE' ? 'ATIVO' : 'ARQUIVADO'}
                </span>
            </header>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Evento</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                    />
                </div>


                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                    <textarea
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100 mt-8">
                    <button
                        type="button"
                        onClick={toggleArchive}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${formData.status === 'ACTIVE' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                    >
                        {formData.status === 'ACTIVE' ? <Archive size={18} /> : <RefreshCw size={18} />}
                        {formData.status === 'ACTIVE' ? 'Arquivar Evento' : 'Reativar Evento'}
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-200"
                    >
                        <Save size={18} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}
