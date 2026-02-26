"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { User, Phone, Lock, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function ProfileContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isIncomplete = searchParams.get('incomplete') === 'true';

    const [name, setName] = useState('');
    const [fullName, setFullName] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState(''); // current password
    const [newPassword, setNewPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            router.push('/login');
            return;
        }

        const user = JSON.parse(userData);
        setFullName(user.fullName || '');
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setCpf(user.cpf || '');
        setLoading(false);
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation for mandatory fields
        if (!cpf || !cpf.trim()) {
            setError('O CPF é obrigatório para manter sua conta ativa e utilizar cupons.');
            return;
        }
        if (!phone || !phone.trim()) {
            setError('O Celular é obrigatório para comunicações e segurança.');
            return;
        }

        setSaving(true);

        try {
            const res = await api.patch('/users/profile', {
                fullName,
                name: fullName,
                cpf,
                phone,
                password: password || undefined,
                newPassword: newPassword || undefined
            });

            setSuccess('Perfil atualizado com sucesso! Redirecionando...');
            localStorage.setItem('user', JSON.stringify(res.data.user));

            // Clear passwords
            setPassword('');
            setNewPassword('');

            // Redirect logic after a short delay to show the success message
            setTimeout(() => {
                const redirectTo = searchParams.get('redirectTo');
                if (redirectTo) {
                    router.push(redirectTo);
                } else {
                    router.push('/my-orders');
                }
            }, 1500);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-4 font-sans">
            <div className="container mx-auto max-w-2xl">
                <Link href="/my-orders" className="flex items-center gap-2 text-slate-500 hover:text-brand transition-all mb-8 w-fit group">
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    Voltar para Meus Pedidos
                </Link>

                <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="bg-brand/10 p-4 rounded-2xl">
                            <User className="text-brand" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Minhas Configurações</h1>
                            <p className="text-slate-500">{email}</p>
                        </div>
                    </div>

                    {isIncomplete && !success && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-2xl mb-8 flex gap-3 items-start animate-pulse">
                            <AlertCircle className="mt-0.5 shrink-0" size={18} />
                            <div>
                                <p className="font-bold text-sm">Cadastro Incompleto</p>
                                <p className="text-xs opacity-90">Para sua segurança e ativação completa da conta, por favor preencha seu CPF e Celular abaixo.</p>
                            </div>
                        </div>
                    )}

                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">{error}</div>}
                    {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 p-4 rounded-xl mb-6 text-sm font-medium">{success}</div>}

                    <form onSubmit={handleUpdate} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold mb-3 text-slate-400">
                                    <User size={12} /> Nome Completo
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:border-brand/50 outline-none transition-all placeholder-slate-400 font-light"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="Seu nome completo"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold mb-3 text-slate-400 text-brand">
                                    <User size={12} /> CPF (Obrigatório)
                                </label>
                                <input
                                    type="text"
                                    className={`w-full bg-slate-50 border rounded-xl p-4 text-slate-900 focus:border-brand/50 outline-none transition-all placeholder-slate-400 font-light ${isIncomplete && !cpf ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}
                                    value={cpf}
                                    onChange={e => setCpf(e.target.value)}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold mb-3 text-slate-400 text-brand">
                                    <Phone size={12} /> Celular (Obrigatório)
                                </label>
                                <input
                                    type="text"
                                    className={`w-full bg-slate-50 border rounded-xl p-4 text-slate-900 focus:border-brand/50 outline-none transition-all placeholder-slate-400 font-light ${isIncomplete && !phone ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-8 mt-4">
                            <h2 className="text-sm font-bold mb-6 flex items-center gap-2 text-slate-800">
                                <Lock size={16} /> Alterar Senha
                            </h2>
                            <p className="text-[10px] text-slate-400 mb-6 uppercase tracking-wider">Deixe em branco se não desejar alterar.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-3 text-slate-400">Senha Atual</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:border-brand/50 outline-none transition-all font-light"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-3 text-slate-400">Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:border-brand/50 outline-none transition-all font-light"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className={`w-full bg-slate-900 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-black/10'}`}
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                            ) : (
                                <Save size={20} />
                            )}
                            {saving ? 'Gravando...' : 'Salvar Alterações'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}
