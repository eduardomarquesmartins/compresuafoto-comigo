"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [login, setLogin] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: identify, 2: answer & reset
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleFetchQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.get('/auth/security-question', { params: { login } });
            setQuestion(res.data.question);
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Usuário não encontrado ou sem pergunta cadastrada');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { login, answer, newPassword });
            setSuccess('Senha redefinida com sucesso! Você será redirecionado para o login.');
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Resposta incorreta ou erro ao redefinir');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10">
                <div className="text-center mb-10 flex flex-col items-center">
                    <Link href="/">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-16 w-auto object-contain hover:opacity-80 transition-opacity"
                        />
                    </Link>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}
                {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-6 text-sm text-center">{success}</div>}

                {step === 1 ? (
                    <form onSubmit={handleFetchQuestion} className="space-y-5">
                        <p className="text-sm text-slate-400 text-center mb-4">Informa seu email ou celular cadastrado para recuperar sua senha.</p>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300">Email ou Celular</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                                value={login}
                                onChange={e => setLogin(e.target.value)}
                                placeholder="ex: seu@email.com ou (11) 99999-9999"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-white text-black py-3 rounded-lg font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]'}`}
                        >
                            {loading ? 'Buscando...' : 'Continuar'}
                        </button>
                        <div className="text-center mt-4">
                            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-300">Voltar para Login</Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleReset} className="space-y-5">
                        <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Pergunta de Segurança</p>
                            <p className="text-lg font-medium text-white">{question}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300">Sua Resposta</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                placeholder="Digite sua resposta"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-300">Nova Senha</label>
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Nova senha"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success !== ''}
                            className={`w-full bg-white text-black py-3 rounded-lg font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]'}`}
                        >
                            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                        </button>

                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-sm text-slate-500 hover:text-slate-300"
                            >
                                Alterar Email/Celular
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
