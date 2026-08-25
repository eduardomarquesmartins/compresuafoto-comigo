"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "@/lib/api";

type Profile = { name?: string | null; fullName?: string | null; email?: string; cpf?: string | null; phone?: string | null };

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile>({});
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [status, setStatus] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get("/auth/me")
            .then(({ data }) => setProfile(data.user || {}))
            .catch(() => setStatus("Não foi possível carregar o perfil."));
    }, []);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        setStatus("");
        if (newPassword && newPassword.length < 6) {
            setStatus("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }
        setSaving(true);
        try {
            const { data } = await api.patch("/users/profile", {
                name: profile.name || "",
                fullName: profile.fullName || "",
                cpf: profile.cpf || "",
                phone: profile.phone || "",
                password: currentPassword || undefined,
                newPassword: newPassword || undefined
            });
            setProfile(data.user || profile);
            localStorage.setItem("user", JSON.stringify(data.user || profile));
            setCurrentPassword("");
            setNewPassword("");
            setStatus("Perfil atualizado com sucesso.");
        } catch (error: unknown) {
            const message = typeof error === "object" && error && "response" in error
                ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
                : undefined;
            setStatus(message || "Não foi possível salvar as alterações.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl">
            <p className="mb-5 text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Meu perfil</p>
            <p className="mb-8 text-slate-500">Atualize seus dados e sua senha de acesso.</p>
            <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">Nome
                        <input value={profile.name || ""} onChange={event => setProfile({ ...profile, name: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Nome completo
                        <input value={profile.fullName || ""} onChange={event => setProfile({ ...profile, fullName: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">E-mail
                        <input value={profile.email || ""} readOnly className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Telefone
                        <input value={profile.phone || ""} onChange={event => setProfile({ ...profile, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
                    </label>
                </div>
                <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-100 pt-6 md:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">Senha atual
                        <input type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Nova senha
                        <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-slate-900" />
                    </label>
                </div>
                {status && <p className="mt-5 text-sm text-slate-600" role="status">{status}</p>}
                <button disabled={saving} className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? "Salvando..." : "Salvar perfil"}
                </button>
            </form>
        </div>
    );
}
