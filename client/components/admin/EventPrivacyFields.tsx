"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Unlock, UserRoundCheck } from "lucide-react";
import api from "@/lib/api";

type Customer = {
    id: number;
    name: string | null;
    fullName?: string | null;
    email: string;
    role: string;
};

type EventPrivacyFieldsProps = {
    visibility: "PUBLIC" | "PRIVATE";
    authorizedUserId: string;
    onVisibilityChange: (visibility: "PUBLIC" | "PRIVATE") => void;
    onAuthorizedUserChange: (userId: string) => void;
    disabled?: boolean;
};

export default function EventPrivacyFields({
    visibility,
    authorizedUserId,
    onVisibilityChange,
    onAuthorizedUserChange,
    disabled = false,
}: EventPrivacyFieldsProps) {
    const [users, setUsers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadCustomers = async () => {
            try {
                const response = await api.get<Customer[]>("/users");
                setUsers(Array.isArray(response.data) ? response.data : []);
            } catch {
                setUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadCustomers();
    }, []);

    const customers = useMemo(
        () => users.filter((user) => user.role === "CUSTOMER"),
        [users]
    );

    return (
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-5">
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${visibility === "PRIVATE" ? "border-violet-400/30 bg-violet-500/15 text-violet-200" : "border-blue-400/20 bg-blue-500/10 text-blue-300"}`}>
                    {visibility === "PRIVATE" ? <LockKeyhole size={18} /> : <Unlock size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">Acesso à galeria</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Uma galeria privada não aparece na lista pública e só pode ser aberta pela cliente selecionada após o login.
                    </p>
                </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Visibilidade</span>
                    <select
                        value={visibility}
                        disabled={disabled}
                        onChange={(event) => {
                            const nextVisibility = event.target.value as "PUBLIC" | "PRIVATE";
                            onVisibilityChange(nextVisibility);
                            if (nextVisibility === "PUBLIC") onAuthorizedUserChange("");
                        }}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <option value="PUBLIC">Pública — disponível para todos</option>
                        <option value="PRIVATE">Privada — somente uma cliente</option>
                    </select>
                </label>

                <label className="block">
                    <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        <UserRoundCheck size={13} /> Cliente autorizada
                    </span>
                    <select
                        value={authorizedUserId}
                        disabled={disabled || visibility !== "PRIVATE" || isLoading}
                        required={visibility === "PRIVATE"}
                        onChange={(event) => onAuthorizedUserChange(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">
                            {isLoading ? "Carregando clientes..." : "Selecione a conta da cliente"}
                        </option>
                        {customers.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.fullName || user.name || user.email} — {user.email}
                            </option>
                        ))}
                    </select>
                    {visibility === "PRIVATE" && !isLoading && customers.length === 0 && (
                        <p className="mt-2 text-xs text-amber-300">Nenhuma conta de cliente encontrada. Cadastre a cliente antes de tornar a galeria privada.</p>
                    )}
                </label>
            </div>
        </section>
    );
}
