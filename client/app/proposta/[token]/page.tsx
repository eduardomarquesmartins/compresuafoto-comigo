"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Loader2,
    PenLine,
    UserCheck,
} from "lucide-react";
import { acceptPublicProposal, getPublicProposal } from "@/lib/api";

interface ProposalServiceItem {
    id?: string;
    category?: string;
    name?: string;
    serviceName?: string;
    description?: string;
    price?: number;
    quantity?: number;
}

interface PublicProposalData {
    clientName: string;
    clientEmail?: string | null;
    hasClient?: boolean;
    selectedServices: ProposalServiceItem[] | string[] | string;
    total: number;
    proposalType: string;
    status: "PENDING" | "APPROVED" | "DECLINED" | string;
    acceptedAt?: string | null;
    declinedAt?: string | null;
    signatureLink?: string | null;
}

interface ClientFormData {
    name: string;
    email: string;
    document: string;
    phone: string;
    address: string;
    cityState: string;
}

const formatMoney = (value: number | string | undefined | null) => {
    const num = typeof value === "number" ? value : Number(value || 0);
    return Number.isFinite(num)
        ? num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "R$ 0,00";
};

const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    }
    return digits
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
};

const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
        return digits
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
};

export default function PublicProposalPage() {
    const params = useParams<{ token: string }>();
    const router = useRouter();
    const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";

    const [proposal, setProposal] = useState<PublicProposalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [clientForm, setClientForm] = useState<ClientFormData>({
        name: "",
        email: "",
        document: "",
        phone: "",
        address: "",
        cityState: "",
    });

    const loadProposal = async (isBackgroundSync = false) => {
        if (!token) return;
        if (!isBackgroundSync) setLoading(true);
        setError(null);

        try {
            const data = await getPublicProposal(token);
            setProposal(data);
            if (data) {
                setClientForm((prev) => ({
                    ...prev,
                    name: prev.name || data.clientName || "",
                    email: prev.email || data.clientEmail || "",
                }));
            }
        } catch (err: any) {
            console.warn("Erro ao carregar proposta pública:", err);
            const status = err?.response?.status;
            if (status === 404) {
                setError("Esta proposta não foi encontrada ou o link informado expirou.");
            } else {
                setError("Não foi possível carregar a proposta comercial no momento. Por favor, tente novamente.");
            }
        } finally {
            if (!isBackgroundSync) setLoading(false);
        }
    };

    useEffect(() => {
        loadProposal();
    }, [token]);

    const parsedServices = useMemo<ProposalServiceItem[]>(() => {
        if (!proposal?.selectedServices) return [];
        if (Array.isArray(proposal.selectedServices)) {
            return proposal.selectedServices.map((item, idx) => {
                if (typeof item === "string") {
                    return { id: `item-${idx}`, name: item, category: "Serviço", price: 0, quantity: 1 };
                }
                return {
                    id: item.id || `item-${idx}`,
                    category: item.category || "Serviço",
                    name: item.name || item.serviceName || "Item da proposta",
                    description: item.description,
                    price: typeof item.price === "number" ? item.price : Number(item.price || 0),
                    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                };
            });
        }
        if (typeof proposal.selectedServices === "string") {
            try {
                const parsed = JSON.parse(proposal.selectedServices);
                if (Array.isArray(parsed)) {
                    return parsed.map((item, idx) => ({
                        id: item.id || `item-${idx}`,
                        category: item.category || "Serviço",
                        name: item.name || item.serviceName || "Item da proposta",
                        description: item.description,
                        price: typeof item.price === "number" ? item.price : Number(item.price || 0),
                        quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
                    }));
                }
            } catch {
                return [{ id: "raw-1", name: proposal.selectedServices, category: "Serviço", price: proposal.total, quantity: 1 }];
            }
        }
        return [];
    }, [proposal?.selectedServices, proposal?.total]);

    // Verifica se a proposta já possui vínculo formal de cliente ou se requer preenchimento
    const hasLinkedClient = Boolean(proposal?.hasClient);

    const navigateToSignature = (link: string) => {
        try {
            const url = new URL(link, window.location.origin);
            router.push(`${url.pathname}${url.search}`);
        } catch {
            window.location.href = link;
        }
    };

    const handleAccept = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!token || actionLoading) return;

        // Se a proposta não tem cliente vinculado, valida campos essenciais do formulário
        if (!hasLinkedClient) {
            const name = clientForm.name.trim();
            const email = clientForm.email.trim();
            const documentDigits = clientForm.document.replace(/\D/g, "");
            const address = clientForm.address.trim();
            const cityState = clientForm.cityState.trim();
            if (
                name.split(/\s+/).filter(Boolean).length < 2 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
                ![11, 14].includes(documentDigits.length) ||
                !address ||
                !cityState
            ) {
                setError("Informe nome completo, e-mail válido, CPF/CNPJ, endereço e cidade/UF para emissão do contrato.");
                return;
            }
        }

        try {
            setActionLoading(true);
            setError(null);

            const payload = !hasLinkedClient
                ? {
                      name: clientForm.name.trim(),
                      email: clientForm.email.trim(),
                      document: clientForm.document.trim(),
                      phone: clientForm.phone.trim() || undefined,
                      address: clientForm.address.trim(),
                      cityState: clientForm.cityState.trim(),
                  }
                : undefined;

            const updated = await acceptPublicProposal(token, payload);
            if (updated?.signatureLink) {
                navigateToSignature(updated.signatureLink);
                return;
            }

            const fresh = await getPublicProposal(token);
            if (fresh?.signatureLink) {
                navigateToSignature(fresh.signatureLink);
                return;
            }

            setProposal(fresh);
            setActionLoading(false);
        } catch (err: any) {
            console.warn("Erro ao aceitar proposta:", err);
            const status = err?.response?.status;
            const message = err?.response?.data?.error;

            if (status === 409) {
                const fresh = await getPublicProposal(token).catch(() => null);
                if (fresh?.signatureLink) {
                    navigateToSignature(fresh.signatureLink);
                    return;
                }
                setProposal(fresh);
            } else {
                setError(message || "Não foi possível registrar o aceite no momento. Verifique os dados e tente novamente.");
            }
            setActionLoading(false);
        }
    };

    // Estado: Carregando
    if (loading) {
        return (
            <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-zinc-900 font-sans">
                <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-sm w-full text-center">
                    <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Carregando proposta...
                    </p>
                </div>
            </div>
        );
    }

    // Estado: Erro / Token inválido
    if (error && !proposal) {
        return (
            <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-zinc-900 font-sans">
                <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm space-y-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                        <AlertCircle size={24} />
                    </div>
                    <h1 className="text-lg font-bold text-zinc-950">
                        Proposta indisponível
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        {error}
                    </p>
                </div>
            </div>
        );
    }

    const isApproved = proposal?.status === "APPROVED";
    const isDeclined = proposal?.status === "DECLINED";
    const isPending = proposal?.status === "PENDING";

    return (
        <div className="min-h-screen text-zinc-900 font-sans antialiased pb-16 selection:bg-blue-600 selection:text-white">
            {/* Topbar da Marca */}
            <header className="border-b border-zinc-200/80 bg-white/95 sticky top-0 z-30 shadow-xs">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 py-4 flex items-center">
                    <Image
                        src="/logo.png"
                        alt="& CONTI Marketing Digital"
                        width={140}
                        height={38}
                        className="h-9 w-auto object-contain"
                        priority
                    />
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10 space-y-6">
                {/* Alerta de Erro caso ocorra durante aceite */}
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-900 flex items-center gap-2.5 shadow-xs"
                    >
                        <AlertCircle size={16} className="text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Card Único e Direto da Proposta */}
                <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
                    {/* Cabeçalho Enxuto */}
                    <div className="p-6 sm:p-8 border-b border-zinc-100">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                            Proposta Comercial
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight mt-1 font-sans">
                            {proposal?.clientName || "Cliente"}
                        </h1>
                    </div>

                    {/* Lista Enxuta de Serviços com Preço */}
                    <div className="p-6 sm:p-8 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Serviços Inclusos
                        </p>

                        <div className="divide-y divide-zinc-100">
                            {parsedServices.map((service, idx) => {
                                const qty = service.quantity || 1;
                                const price = Number(service.price || 0);
                                const lineTotal = price * qty;

                                return (
                                    <div
                                        key={service.id || idx}
                                        className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                                    >
                                        <div className="space-y-0.5 flex-1">
                                            <p className="text-sm font-semibold text-zinc-900">
                                                {qty > 1 ? `${qty}x ` : ""}
                                                {service.name}
                                            </p>
                                            {service.description && (
                                                <p className="text-xs text-zinc-500 leading-relaxed">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>

                                        {price > 0 && (
                                            <div className="text-right shrink-0 pt-0.5">
                                                <span className="text-sm font-semibold text-zinc-900 tabular-nums font-sans">
                                                    {formatMoney(lineTotal)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Total da Proposta */}
                    <div className="p-6 sm:p-8 bg-zinc-50/80 border-t border-zinc-100 flex items-center justify-between gap-4">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                                Investimento Total
                            </span>
                            <span className="text-2xl sm:text-3xl font-bold text-zinc-950 tabular-nums tracking-tight block mt-0.5 font-sans">
                                {formatMoney(proposal?.total)}
                            </span>
                        </div>

                        {/* Ação Direta para Proposta já Aprovada */}
                        {isApproved && proposal?.signatureLink && (
                            <Link
                                href={proposal.signatureLink}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 text-xs font-bold uppercase tracking-[0.18em] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                                <PenLine size={15} />
                                Assinar Contrato
                                <ArrowRight size={13} />
                            </Link>
                        )}

                        {isDeclined && (
                            <span className="text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2.5">
                                Proposta Recusada
                            </span>
                        )}
                    </div>

                    {/* Formulário Enxuto para Proposta sem Cliente vinculado (Quando Pendente) */}
                    {isPending && !hasLinkedClient && (
                        <form onSubmit={handleAccept} className="p-6 sm:p-8 border-t border-zinc-200/90 bg-white space-y-5">
                            <div className="flex items-center gap-2 pb-1 border-b border-zinc-100">
                                <UserCheck size={16} className="text-blue-600" />
                                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                                    Dados para Emissão do Contrato
                                </h2>
                            </div>

                            <p className="text-xs text-zinc-500 leading-relaxed">
                                Preencha suas informações para vincular ao contrato de prestação de serviços com validade jurídica.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label className="space-y-1 block">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        Nome Completo / Razão Social *
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={clientForm.name}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="Seu nome ou nome da empresa"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>

                                <label className="space-y-1 block">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        CPF ou CNPJ *
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={clientForm.document}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, document: formatCpfCnpj(e.target.value) }))}
                                        placeholder="000.000.000-00 ou 00.000.000/0001-00"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>

                                <label className="space-y-1 block">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        E-mail *
                                    </span>
                                    <input
                                        type="email"
                                        required
                                        value={clientForm.email}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, email: e.target.value }))}
                                        placeholder="seu-email@exemplo.com"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>

                                <label className="space-y-1 block">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        Telefone / WhatsApp
                                    </span>
                                    <input
                                        type="text"
                                        value={clientForm.phone}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
                                        placeholder="(00) 00000-0000"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>

                                <label className="space-y-1 block sm:col-span-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        Endereço Completo *
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={clientForm.address}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value }))}
                                        placeholder="Rua, número, complemento, bairro"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>

                                <label className="space-y-1 block sm:col-span-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                                        Cidade / UF *
                                    </span>
                                    <input
                                        type="text"
                                        required
                                        value={clientForm.cityState}
                                        onChange={(e) => setClientForm((prev) => ({ ...prev, cityState: e.target.value }))}
                                        placeholder="Ex: Porto Alegre/RS"
                                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                                    />
                                </label>
                            </div>

                            <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                <p className="text-[11px] text-zinc-500 font-medium text-center sm:text-left">
                                    Após aceitar, você poderá revisar o contrato antes de assinar.
                                </p>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                                >
                                    {actionLoading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin text-white" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} />
                                            Aceitar proposta
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Aceite Direto quando a Proposta já possui cliente vinculado (Quando Pendente) */}
                    {isPending && hasLinkedClient && (
                        <div className="p-6 sm:p-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <p className="text-[11px] text-zinc-500 font-medium text-center sm:text-left">
                                Após aceitar, você poderá revisar o contrato antes de assinar.
                            </p>
                            <button
                                type="button"
                                onClick={() => handleAccept()}
                                disabled={actionLoading}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-3.5 text-xs font-bold uppercase tracking-[0.18em] shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                            >
                                {actionLoading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin text-white" />
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Aceitar proposta
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
