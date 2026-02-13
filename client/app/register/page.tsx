"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/register', {
                name,
                email,
                password,
                phone,
                securityQuestion,
                securityAnswer
            });

            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                if (res.data.user) {
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }

                if (redirectTo) {
                    router.push(redirectTo);
                } else {
                    router.push('/');
                }
            }
        } catch (err: any) {
            console.error('Register Error:', err);
            if (!err.response) {
                setError('Erro de conexão com o servidor. Tente novamente.');
            } else {
                setError(err.response?.data?.error || 'Erro ao criar conta');
            }
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

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Nome</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Seu Nome"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Email</label>
                        <input
                            type="email"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Senha</label>
                        <input
                            type="password"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Celular (para login e recuperação)</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Pergunta de Segurança (Recuperação)</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={securityQuestion}
                            onChange={e => setSecurityQuestion(e.target.value)}
                            required
                        >
                            <option value="">Selecione uma pergunta...</option>
                            <option value="Nome do primeiro animal">Nome do primeiro animal</option>
                            <option value="Cidade onde nasceu">Cidade onde nasceu</option>
                            <option value="Nome da mãe">Nome da mãe</option>
                            <option value="Escola onde estudou">Escola onde estudou</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-300">Resposta da Segurança</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white placeholder-slate-600 outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all font-light"
                            value={securityAnswer}
                            onChange={e => setSecurityAnswer(e.target.value)}
                            placeholder="Sua resposta"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-white text-black py-3 rounded-lg font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98]'}`}
                    >
                        {loading ? 'Criando conta...' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-400">
                    Já tem uma conta? <Link href={`/login${redirectTo ? `?redirectTo=${redirectTo}` : ''}`} className="text-blue-400 hover:text-blue-300">Entrar</Link>
                </div>
                <div className="mt-2 text-center text-sm text-slate-400">
                    <Link href="/" className="text-slate-500 hover:text-slate-300">Voltar para Home</Link>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
