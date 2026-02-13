"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo');

    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { login: loginInput, password });

            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                if (res.data.user) {
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }

                if (redirectTo) {
                    router.push(redirectTo);
                } else if (res.data.user.role === 'ADMIN') {
                    router.push('/admin/dashboard');
                } else {
                    router.push('/my-orders');
                }
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            setError(err.response?.data?.error || 'Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/google', {
                credential: credentialResponse.credential
            });

            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));

                if (redirectTo) {
                    router.push(redirectTo);
                } else {
                    router.push(res.data.user.role === 'ADMIN' ? '/admin/dashboard' : '/my-orders');
                }
            }
        } catch (err: any) {
            setError('Falha no login com Google. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10 border border-slate-800">
                <div className="text-center mb-10 flex justify-center">
                    <Link href="/">
                        <img
                            src="/logo.png"
                            alt="Logo"
                            className="h-16 w-auto object-contain hover:opacity-80 transition-opacity"
                        />
                    </Link>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest mb-2 text-slate-400">Email ou Celular</label>
                        <input
                            type="text"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white outline-none focus:border-brand/50 transition-all font-light placeholder-slate-600"
                            value={loginInput}
                            onChange={e => setLoginInput(e.target.value)}
                            placeholder="seu@email.com ou (11) 99999-9999"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-medium uppercase tracking-widest text-slate-400">Senha</label>
                            <Link href="/forgot-password" title="Esqueci minha senha" className="text-xs text-brand/80 hover:text-brand transition-colors">Esqueci minha senha</Link>
                        </div>
                        <input
                            type="password"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white outline-none focus:border-brand/50 transition-all font-light"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-white text-black py-4 rounded-xl font-medium transition-all transform ${loading ? 'opacity-70' : 'hover:bg-brand hover:text-white active:scale-[0.98]'}`}
                    >
                        {loading ? 'Verificando...' : 'Entrar'}
                    </button>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-semibold tracking-[0.2em]">
                            <span className="bg-slate-900 px-4 text-slate-500">Ou entre com</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError('Erro no Google Login')}
                            theme="filled_black"
                            shape="pill"
                            width="100%"
                        />
                    </div>

                    <div className="mt-10 text-center text-sm text-slate-400 font-light">
                        Não tem uma conta? <Link href={`/register${redirectTo ? `?redirectTo=${redirectTo}` : ''}`} className="text-brand/80 hover:text-brand transition-colors font-medium">Cadastre-se</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
