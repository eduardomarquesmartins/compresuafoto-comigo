"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { KeyRound, Mail, ArrowLeft, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';

function ForgotPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [login, setLogin] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(token ? 3 : 1); // 1: identify, 2: email sent, 3: reset with token
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // If there's a token but we're not on step 3, maybe user manually put it, let's force step 3
    useEffect(() => {
        if (token) setStep(3);
    }, [token]);

    const handleRequestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { login });
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao processar sua solicitação. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetWithToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            return setError('As senhas não coincidem.');
        }

        if (newPassword.length < 6) {
            return setError('A senha deve ter pelo menos 6 caracteres.');
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-with-token', { token, newPassword });
            setSuccess('Senha redefinida com sucesso!');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Link inválido ou expirado. Peça uma nova recuperação.');
            if (err.response?.status === 401) {
                setTimeout(() => setStep(1), 3000);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative z-10 border border-black/5">
                <div className="text-center mb-10 flex flex-col items-center">
                    <Link href="/">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-16 w-auto object-contain hover:opacity-80 transition-opacity mb-6"
                        />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900">Recuperar Senha</h1>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-sm text-center font-medium">{error}</div>}
                {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-3 rounded-xl mb-6 text-sm text-center font-medium">{success}</div>}

                {step === 1 && (
                    <form onSubmit={handleRequestEmail} className="space-y-6">
                        <p className="text-sm text-slate-500 text-center mb-4">Informe seu e-mail de cadastro e enviaremos um link para você criar uma nova senha.</p>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-slate-400">E-mail ou Celular</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 transition-all font-light"
                                    value={login}
                                    onChange={e => setLogin(e.target.value)}
                                    placeholder="ex: seu@email.com"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-slate-900 text-white py-4 rounded-xl font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10'}`}
                        >
                            {loading ? 'Enviando e-mail...' : 'Enviar Link'}
                        </button>
                        <div className="text-center mt-6">
                            <Link href="/login" className="text-sm text-brand font-bold hover:underline">Voltar para o Login</Link>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="text-brand" size={40} />
                        </div>
                        <p className="text-slate-600">Um link de recuperação foi enviado para o seu e-mail cadastrado. Por favor, cheque sua caixa de entrada e spam.</p>
                        <button
                            onClick={() => setStep(1)}
                            className="text-sm text-brand font-bold hover:underline"
                        >
                            Não recebi o e-mail? Tentar novamente
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetWithToken} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-sm text-slate-500 text-center mb-4">Crie uma nova senha segura para sua conta.</p>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-slate-400">Nova Senha</label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-slate-900 outline-none focus:border-brand/50 transition-all font-light"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="No mínimo 6 caracteres"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-slate-400">Confirmar Nova Senha</label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 pl-12 text-slate-900 outline-none focus:border-brand/50 transition-all font-light"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a senha"
                                    required
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || success !== ''}
                            className={`w-full bg-slate-900 text-white py-4 rounded-xl font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/10'}`}
                        >
                            {loading ? 'Redefinindo...' : 'Alterar Senha'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
        }>
            <ForgotPasswordContent />
        </Suspense>
    );
}
