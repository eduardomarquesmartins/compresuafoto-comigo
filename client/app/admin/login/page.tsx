"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // Use the shared API client

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        setLoading(true);
        try {
            // Using the 'api' instance automatically handles the base URL fallback
            const res = await api.post('/auth/login', { login: email, password });

            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
                // Also store user info if needed
                if (res.data.user) {
                    localStorage.setItem('user', JSON.stringify(res.data.user));
                }
                router.push('/admin/dashboard');
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            // Distinguish between network/server errors and actual wrong credentials
            if (!err.response) {
                setError('Erro de conexão com o servidor. Tente novamente.');
            } else {
                setError(err.response?.data?.error || 'Credenciais inválidas');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 font-sans relative overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10 border border-slate-800">
                <div className="text-center mb-10 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2 scale-110">
                        <span className="text-4xl font-light text-brand font-sans">&</span>
                        <span className="text-3xl font-normal text-white tracking-wide">CONTI</span>
                    </div>
                    <span className="text-[0.6rem] tracking-[0.4em] text-slate-400 font-normal uppercase">
                        Marketing Digital
                    </span>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-medium">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest mb-2 text-slate-400">Email</label>
                        <input
                            type="email"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white placeholder-slate-600 outline-none focus:border-brand/50 transition-all font-light"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium uppercase tracking-widest mb-2 text-slate-400">Senha</label>
                        <input
                            type="password"
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-white placeholder-slate-600 outline-none focus:border-brand/50 transition-all font-light"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full bg-white text-black py-4 rounded-xl font-medium transition-all transform ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand hover:text-white active:scale-[0.98]'}`}
                    >
                        {loading ? 'Verificando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
