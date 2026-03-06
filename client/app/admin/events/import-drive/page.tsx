"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { CheckCircle2, AlertCircle, Loader2, ChevronRight, HardDrive } from 'lucide-react';

export default function ImportDrivePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [summary, setSummary] = useState<any>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
        }
    };

    // Efeito para simular progresso enquanto a requisição está em curso
    // Isso dá um feedback visual mais "vivo" para o usuário
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (loading && progress < 90) {
            interval = setInterval(() => {
                setProgress(prev => {
                    const next = prev + Math.random() * 2;
                    return next > 90 ? 90 : next;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loading, progress]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setProgress(5);
        setSummary(null);
        setStatusText('Iniciando conexão com Google Drive...');

        const formData = new FormData(e.currentTarget);

        try {
            // Pequenos delays artificiais para os primeiros estados de status
            // para que o usuário consiga ler o que está acontecendo
            setTimeout(() => setStatusText('Localizando imagens na pasta...'), 1500);
            setTimeout(() => setStatusText('Baixando e processando fotos (isso pode levar alguns minutos)...'), 4000);

            const response = await api.post('/events/from-drive', formData);

            setProgress(100);
            setStatusText('Importação concluída com sucesso!');
            setSummary(response.data.summary);

        } catch (error: any) {
            console.error('Import Drive Error:', error);
            const msg = error.response?.data?.error || 'Erro ao comunicar com o servidor';
            setStatusText('Falha na importação');
            alert(`Erro na importação: ${msg}`);
            setLoading(false);
            setProgress(0);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8 flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-2xl">
                    <HardDrive className="text-blue-400" size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-light text-white leading-tight">Importação Drive</h1>
                    <p className="text-slate-500 text-sm">Crie eventos importando fotos diretamente da nuvem</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400 ml-1">Nome do Evento</label>
                                <input
                                    name="name"
                                    required
                                    disabled={loading}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                                    placeholder="Ex: Casamento João e Maria"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-400 ml-1">Data do Evento</label>
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    disabled={loading}
                                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all [color-scheme:dark] disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400 ml-1">Descrição (Opcional)</label>
                            <textarea
                                name="description"
                                rows={2}
                                disabled={loading}
                                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                                placeholder="Breve resumo sobre o evento..."
                            ></textarea>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400 ml-1">Capa do Evento (Opcional)</label>
                            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:bg-slate-800/50 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden bg-slate-950/30 min-h-32 flex flex-col items-center justify-center">
                                <input
                                    type="file"
                                    name="coverImage"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={loading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
                                />
                                {preview ? (
                                    <div className="relative h-48 w-full">
                                        <img
                                            src={preview}
                                            alt="Preview"
                                            className="w-full h-full object-cover rounded-xl"
                                        />
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <p className="text-white font-medium text-sm">Clique para trocar</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 text-slate-500 group-hover:text-blue-400 transition-colors">
                                        <div className="text-3xl mb-1 flex justify-center">🖼️</div>
                                        <span className="font-medium text-sm block">Clique ou arraste a capa aqui</span>
                                        <p className="text-[10px] text-slate-600">Se não escolher, usaremos a primeira foto do Drive</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900/80 p-6 rounded-2xl border border-blue-500/20 space-y-4">
                            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold uppercase tracking-wider">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                Google Drive Folder ID
                            </div>
                            <input
                                name="folderId"
                                required
                                disabled={loading}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 disabled:opacity-50"
                                placeholder="Ex: 1dwsZJ2uhmqnMOCj5SxqQIW1__G2CrTgh"
                            />
                            <div className="flex items-start gap-2 text-slate-500 text-xs bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                                <span className="text-amber-500">⚠️</span>
                                <p>Certifique-se de que a pasta está compartilhada com o e-mail da conta de serviço antes de clicar em importar.</p>
                            </div>
                        </div>

                        {!loading && !summary && (
                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 group"
                            >
                                <span>Iniciar Importação</span>
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}

                        {loading && !summary && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-blue-400 font-medium flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} />
                                        {statusText}
                                    </span>
                                    <span className="text-slate-400 font-mono">{Math.round(progress)}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-center text-xs text-slate-600">
                                    Não feche esta página até a conclusão do processo.
                                </p>
                            </div>
                        )}
                    </form>
                </div>

                {summary && (
                    <div className="bg-gradient-to-br from-green-500/10 to-slate-900 p-8 rounded-3xl border border-green-500/20 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-green-500/20 rounded-2xl">
                                <CheckCircle2 className="text-green-500" size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-medium text-white">Importação Finalizada</h2>
                                <p className="text-slate-400 text-sm">O evento foi criado e as fotos processadas</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-700/50 text-center">
                                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Fotos com Sucesso</p>
                                <p className="text-4xl font-light text-green-400">{summary.success}</p>
                            </div>
                            <div className="p-6 bg-slate-950/50 rounded-2xl border border-slate-700/50 text-center">
                                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-1">Falhas no Processo</p>
                                <p className="text-4xl font-light text-red-400">{summary.failed}</p>
                            </div>
                        </div>

                        {summary.errors.length > 0 && (
                            <div className="bg-slate-950/80 p-5 rounded-2xl border border-red-500/10">
                                <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-3 uppercase tracking-wider">
                                    <AlertCircle size={14} />
                                    Erros encontrados ({summary.errors.length})
                                </div>
                                <ul className="text-sm text-slate-400 space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {summary.errors.map((err: any, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                            <span className="text-red-500/50 mt-0.5">•</span>
                                            <div className="text-xs">
                                                <span className="text-slate-300 font-medium block mb-0.5">{err.file}</span>
                                                <span className="text-red-400/80">{err.error}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <button
                                onClick={() => { setSummary(null); setLoading(false); setProgress(0); setPreview(null); }}
                                className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all text-sm"
                            >
                                Importar Outro
                            </button>
                            <button
                                onClick={() => router.push('/admin/dashboard')}
                                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-sm"
                            >
                                Ver no Dashboard
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
