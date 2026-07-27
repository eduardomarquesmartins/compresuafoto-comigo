"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { AlertTriangle, RefreshCw, Search, Shield, Trash2, UserPlus, X } from "lucide-react";

type UserRole = "ADMIN" | "PHOTOGRAPHER" | string;

interface User {
    id: number;
    name: string | null;
    email: string;
    role: UserRole;
    lastLogin?: string | null;
    createdAt: string;
}

type NewUser = {
    name: string;
    email: string;
    password: string;
    role: "ADMIN" | "PHOTOGRAPHER";
};

const emptyNewUser: NewUser = { name: "", email: "", password: "", role: "PHOTOGRAPHER" };

const getUsersErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "ECONNABORTED") {
            return "A API demorou demais para responder a lista de usuários. O painel continua aberto; tente novamente em alguns segundos.";
        }
        if (code === "ERR_NETWORK") {
            return "Não consegui conectar na API local. Verifique se o servidor está rodando na porta 3002.";
        }
    }

    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { status?: number; data?: { error?: string } } }).response;
        if (response?.status === 401 || response?.status === 403) {
            return "Sessão expirada ou sem permissão para gerenciar usuários. Faça login novamente.";
        }
        if (response?.status) {
            return `A API respondeu com erro ${response.status}.`;
        }
    }

    return "Não foi possível carregar usuários agora.";
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUser, setNewUser] = useState<NewUser>(emptyNewUser);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        setErrorMessage(null);

        try {
            const res = await api.get<User[]>("/users", { timeout: 12000 });
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            setUsers([]);
            setErrorMessage(getUsersErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        if (!normalizedSearch) return users;

        return users.filter(user =>
            user.email.toLowerCase().includes(normalizedSearch) ||
            Boolean(user.name?.toLowerCase().includes(normalizedSearch))
        );
    }, [searchTerm, users]);

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja remover este usuário?")) return;
        setActionMessage(null);

        try {
            await api.delete(`/users/${id}`, { timeout: 12000 });
            setUsers(currentUsers => currentUsers.filter(user => user.id !== id));
        } catch (error) {
            setActionMessage(getUsersErrorMessage(error));
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setActionMessage(null);

        try {
            const res = await api.post<User>("/users", newUser, { timeout: 12000 });
            setUsers(currentUsers => [res.data, ...currentUsers]);
            setIsCreateModalOpen(false);
            setNewUser(emptyNewUser);
        } catch (error) {
            setActionMessage(getUsersErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-page-stack max-w-7xl mx-auto">
            <section className="admin-card p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-[-0.065em] text-white md:text-5xl">Usuários</h1>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="admin-primary-button justify-center"
                    >
                        <UserPlus size={17} />
                        Novo usuário
                    </button>
                </div>
            </section>

            {(errorMessage || actionMessage) && (
                <div className="admin-warning-banner">
                    <div className="flex gap-3">
                        <div className="admin-warning-icon">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Não foi possível concluir a operação</p>
                            <p className="mt-1 text-sm text-slate-400">{errorMessage || actionMessage}</p>
                        </div>
                    </div>
                    {errorMessage && (
                        <button type="button" onClick={fetchUsers} className="admin-secondary-button">
                            <RefreshCw size={15} />
                            Tentar novamente
                        </button>
                    )}
                </div>
            )}

            <section className="admin-card overflow-hidden p-0">
                <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">Acessos</h2>
                    </div>
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            placeholder="Buscar usuários..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-2xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                        />
                        <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                        <thead>
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Função</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Criado em</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.055]">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center">
                                        <div className="mx-auto admin-loader" />
                                        <p className="admin-microcopy mt-4">Carregando usuários</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center">
                                        <div className="admin-empty-state mx-auto">
                                            <Shield size={18} className="mx-auto text-[#0a72ef]" />
                                            <p className="mt-3 text-sm font-medium text-white">
                                                {errorMessage ? "Usuários indisponíveis" : "Nenhum usuário encontrado"}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                {errorMessage ? "Use tentar novamente quando a API voltar a responder." : "Ajuste a busca ou crie um novo acesso."}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.055] text-sm font-semibold uppercase text-white shadow-[rgba(255,255,255,0.1)_0_0_0_1px]">
                                                    {user.name ? user.name[0] : user.email[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{user.name || "Sem nome"}</p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.role === "ADMIN" ? "bg-[#de1d8d]/15 text-[#ff8ccf]" : "bg-[#0a72ef]/15 text-[#7fbdff]"}`}>
                                                <Shield size={12} />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="rounded-xl p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                                                title="Remover usuário"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <div className="admin-card w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <span className="admin-kicker">Invite</span>
                                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">Novo usuário</h2>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-slate-200">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-300">Nome completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-white outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-white outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-300">Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-white outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-300">Função</label>
                                <select
                                    className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-white outline-none focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
                                    value={newUser.role}
                                    onChange={e => setNewUser({ ...newUser, role: e.target.value as NewUser["role"] })}
                                >
                                    <option value="ADMIN">Administrador</option>
                                    <option value="PHOTOGRAPHER">Fotógrafo</option>
                                </select>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="admin-secondary-button"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="admin-primary-button disabled:opacity-50"
                                >
                                    {isSubmitting ? "Salvando..." : "Criar usuário"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
