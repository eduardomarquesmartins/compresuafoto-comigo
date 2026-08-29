"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEvent, updateEvent } from '@/lib/api'; // Ensure getEvent is exported correctly
import { useParams } from 'next/navigation';
import { Save, ArrowLeft, Archive, RefreshCw, Image as ImageIcon, Upload } from 'lucide-react';
import { adminPath } from '@/lib/adminPath';
import EventPrivacyFields from '@/components/admin/EventPrivacyFields';

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [coverImage, setCoverImage] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        description: '',
        status: 'ACTIVE',
        visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
        authorizedUserId: ''
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
                router.push(adminPath('events'));
                return;
            }
            setFormData({
                name: event.name,
                date: event.date.split('T')[0], // Extract YYYY-MM-DD
                description: event.description || '',
                status: event.status || 'ACTIVE',
                visibility: event.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
                authorizedUserId: event.authorizedUserId ? String(event.authorizedUserId) : ''
            });
            setCoverPreview(event.coverImage || null);
        } catch (error) {
            alert('Falha ao carregar evento');
            router.push(adminPath('events'));
        } finally {
            setLoading(false);
        }
    };

    const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setCoverImage(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (coverImage) {
                const payload = new FormData();
                Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
                payload.append('coverImage', coverImage);
                await updateEvent(Number(params?.id), payload);
            } else {
                await updateEvent(Number(params?.id), formData);
            }
            alert('Evento atualizado com sucesso!');
            router.push(adminPath('events'));
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

            <form onSubmit={handleSubmit} className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-2xl space-y-6">
                <div>
                    <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Nome do Evento</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                    />
                </div>

                <div>
                    <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Descrição</label>
                    <textarea
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 resize-none"
                    />
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between px-1">
                        <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Foto de capa</label>
                        <span className="text-xs text-zinc-500">JPG, PNG ou WEBP</span>
                    </div>
                    <label className="group relative flex min-h-44 cursor-pointer items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-zinc-700 bg-zinc-950 transition hover:border-blue-500/70 hover:bg-blue-500/5">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleCoverChange}
                            className="sr-only"
                        />
                        {coverPreview ? (
                            <>
                                <img src={coverPreview} alt="Prévia da capa do evento" className="absolute inset-0 h-full w-full object-cover opacity-80 transition group-hover:opacity-45" />
                                <div className="relative z-10 flex flex-col items-center gap-2 rounded-xl bg-black/60 px-5 py-3 text-center opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
                                    <Upload size={18} className="text-blue-300" />
                                    <span className="text-sm font-semibold text-white">Trocar foto de capa</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 px-5 py-8 text-center text-zinc-400 transition group-hover:text-blue-300">
                                <ImageIcon size={24} />
                                <span className="text-sm font-semibold text-zinc-200">Escolher foto de capa</span>
                                <span className="text-xs">Esta imagem aparece na abertura do evento.</span>
                            </div>
                        )}
                    </label>
                </div>

                <EventPrivacyFields
                    visibility={formData.visibility}
                    authorizedUserId={formData.authorizedUserId}
                    onVisibilityChange={(visibility) => setFormData({ ...formData, visibility })}
                    onAuthorizedUserChange={(authorizedUserId) => setFormData({ ...formData, authorizedUserId })}
                    disabled={saving}
                />

                <div className="flex gap-4 pt-6 border-t border-zinc-800 mt-8 items-center">
                    <button
                        type="button"
                        onClick={toggleArchive}
                        className={`flex items-center gap-2 px-6 py-4 rounded-[16px] text-sm font-semibold transition-colors ${formData.status === 'ACTIVE' ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'}`}
                    >
                        {formData.status === 'ACTIVE' ? <Archive size={16} /> : <RefreshCw size={16} />}
                        {formData.status === 'ACTIVE' ? 'Arquivar Evento' : 'Reativar Evento'}
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[16px] text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                        <Save size={16} />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}
