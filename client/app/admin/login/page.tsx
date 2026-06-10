"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import logoAdmin from "../logo-admin.jpg";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.post("/auth/login", { login: email, password });

            if (res.data.user?.role !== "ADMIN") {
                setError("Acesso restrito a administradores.");
                return;
            }

            if (res.data.token) {
                localStorage.setItem("token", res.data.token);
                if (res.data.user) {
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                }
                router.push("/admin/dashboard");
            }
        } catch (err: unknown) {
            console.error("Login Error:", err);
            const loginError = err as { response?: { data?: { error?: string } } };

            if (!loginError.response) {
                setError("Erro de conexão com o servidor. Tente novamente.");
            } else {
                setError(loginError.response.data?.error || "Credenciais inválidas");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-dvh overflow-hidden bg-[#050505] text-white">
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(120deg,rgba(10,114,239,0.14),transparent_28%,rgba(222,29,141,0.08),transparent_58%)] bg-[length:46px_46px,46px_46px,auto]" />
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.045),transparent_22rem),linear-gradient(180deg,transparent,rgba(0,0,0,0.86))]" />

            <section className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[480px] items-center justify-center px-5 py-8">
                <div className="w-full border border-white/10 bg-[#0b0b0d]/88 p-6 shadow-[0_24px_90px_-48px_rgba(0,0,0,1)] backdrop-blur-2xl md:p-8 rounded-lg">

                    {error && (
                        <div className="mb-5 border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#0a72ef]/70 focus:ring-4 focus:ring-[#0a72ef]/15"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@empresa.com"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                Senha
                            </label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-lg border border-white/10 bg-black/45 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-[#0a72ef]/70 focus:ring-4 focus:ring-[#0a72ef]/15"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Digite sua senha"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Verificando
                                </>
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
