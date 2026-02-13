"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { User, Phone, Lock, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
    const router = useRouter();
    const [name, setName] = useState('');
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
        setName(user.name || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setLoading(false);
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSaving(true);

        try {
            const res = await api.patch('/users/profile', {
                name,
                phone,
                password: password || undefined,
                newPassword: newPassword || undefined
            });

            setSuccess('Perfil atualizado com sucesso!');
            localStorage.setItem('user', JSON.stringify(res.data.user));

            // Clear passwords
            setPassword('');
            setNewPassword('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 font-sans">
            <div className="container mx-auto max-w-2xl">
                <Link href="/my-orders" className="flex items-center gap-2 text-gray-400 hover:text-brand transition-all mb-8 w-fit">
                    <ArrowLeft size={18} />
                    Voltar para Meus Pedidos
                </Link>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="bg-brand/20 p-4 rounded-2xl">
                            <User className="text-brand" size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Minhas Configurações</h1>
                            <p className="text-gray-400">{email}</p>
                        </div>
                    </div>

                    {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm">{error}</div>}
                    {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl mb-6 text-sm">{success}</div>}

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                                    <User size={14} /> Nome Completo
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand/50 outline-none transition-all"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-medium mb-2 text-gray-300">
                                    <Phone size={14} /> Celular
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand/50 outline-none transition-all"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6 mt-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Lock size={18} /> Alterar Senha
                            </h2>
                            <p className="text-xs text-gray-500 mb-4 italic">Preencha apenas se desejar mudar sua senha atual.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-400">Senha Atual</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand/50 outline-none transition-all"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-gray-400">Nova Senha</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-brand/50 outline-none transition-all"
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
                            className={`w-full bg-brand text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform ${saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-brand/80 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-brand/20'}`}
                        >
                            <Save size={20} />
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
