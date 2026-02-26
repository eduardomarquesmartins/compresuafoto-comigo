"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

function RegisterContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo');
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
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
                fullName,
                name: fullName,
                cpf,
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
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-2xl relative z-10">
                <div className="text-center mb-10 flex flex-col items-center">
                    <Link href="/">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-16 w-auto object-contain hover:opacity-80 transition-opacity"
                        />
                    </Link>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">Nome Completo</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Seu Nome Completo"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">CPF</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={cpf}
                            onChange={e => setCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">Email</label>
                        <input
                            type="email"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">Senha</label>
                        <input
                            type="password"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">Celular (para login e recuperação)</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-600">Pergunta de Segurança (Recuperação)</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
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
                        <label className="block text-sm font-medium mb-2 text-slate-600">Resposta da Segurança</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder-slate-400 outline-none focus:border-brand/50 focus:bg-white transition-all font-light"
                            value={securityAnswer}
                            onChange={e => setSecurityAnswer(e.target.value)}
                            placeholder="Sua resposta"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-slate-900 text-white py-3 rounded-xl font-bold transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand hover:scale-[1.02] active:scale-[0.98]'}`}
                    >
                        {loading ? 'Criando conta...' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Já tem uma conta? <Link href={`/login${redirectTo ? `?redirectTo=${redirectTo}` : ''}`} className="text-brand font-bold hover:underline">Entrar</Link>
                </div>
                <div className="mt-4 text-center text-sm">
                    <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">Voltar para Home</Link>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
            </div>
        }>
            <RegisterContent />
        </Suspense>
    );
}
