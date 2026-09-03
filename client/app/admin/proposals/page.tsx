"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    Copy,
    DollarSign,
    ExternalLink,
    FileSignature,
    FileText,
    Kanban,
    Layers,
    Loader2,
    MessageCircle,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Table,
    Trash2,
    XCircle,
} from "lucide-react";
import {
    approveProposal,
    deleteProposal,
    getBillingCharges,
    getClients,
    getContracts,
    getOrCreateProposalContract,
    getProposals,
    linkProposalClient,
} from "@/lib/api";

type ProposalStatus = "PENDING" | "APPROVED" | "DECLINED" | "DELETED";

interface Proposal {
    id: number;
    clientId?: number | null;
    clientName: string;
    clientEmail?: string | null;
    selectedServices: any[];
    total: number;
    status: ProposalStatus | string;
    proposalType?: string;
    publicToken?: string | null;
    acceptedAt?: string | null;
    declinedAt?: string | null;
    approvedAt?: string | null;
    createdAt: string;
    updatedAt?: string;
    client?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
        document?: string;
    } | null;
}

interface Contract {
    id: number;
    clientId: number;
    proposalId?: number | null;
    scope: string;
    monthlyValue: number;
    durationMonths: number;
    paymentDay: number;
    status: string;
    signatureToken?: string | null;
    signedAt?: string | null;
    signedName?: string | null;
    contractDate?: string;
    createdAt: string;
    client?: {
        name: string;
        email: string;
        document?: string;
    };
}

interface BillingCharge {
    id: number;
    publicId: string;
    clientId: number;
    amount: string | number;
    description: string;
    status: string;
    contractId?: number | null;
    proposalId?: number | null;
    dueDate?: string | null;
    paidAt?: string | null;
    checkoutUrl?: string | null;
}

interface Client {
    id: number;
    name: string;
    email: string;
    phone?: string;
    document?: string;
    status: string;
}

const formatMoney = (value: number | string | undefined | null) => {
    const num = typeof value === "number" ? value : Number(value || 0);
    return Number.isFinite(num)
        ? num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "R$ 0,00";
};

const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("pt-BR");
    } catch {
        return "-";
    }
};

const PUBLIC_LINK_UNAVAILABLE = "Link público indisponível até a sincronização da proposta";
const getPublicProposalPath = (token?: string | null) => {
    const normalized = token?.trim();
    if (!normalized || normalized.toLowerCase() === "undefined" || normalized.toLowerCase() === "null") return null;
    return `/proposta/${encodeURIComponent(normalized)}`;
};

const PROPOSAL_TYPE_NAMES: Record<string, string> = {
    empresarial: "Empresarial",
    casamento: "Casamento",
    "15anos": "15 Anos",
    aniversario: "Aniversário",
};

interface ProposalStageStep {
    stepNumber: number;
    title: string;
    label: string;
    shortLabel: string;
    state: "completed" | "current" | "future" | "declined";
    tooltip: string;
    badgeText?: string;
    colorVariant?: "amber" | "indigo" | "teal" | "blue" | "emerald" | "rose";
}

const getProposalStageSteps = (pipeline: {
    isApproved: boolean;
    isDeclined: boolean;
    isPending: boolean;
    isSigned: boolean;
    awaitingSignature: boolean;
    hasContract: boolean;
    isPaid: boolean;
    charge?: BillingCharge | null;
}): ProposalStageStep[] => {
    const isDeclined = pipeline.isDeclined;
    const isPaid = pipeline.isPaid;
    const isSigned = pipeline.isSigned;
    const hasContract = pipeline.hasContract || pipeline.awaitingSignature;
    const isApproved = pipeline.isApproved || hasContract || isSigned || isPaid;

    // Step 1: Proposta (Proposal created & sent)
    const step1: ProposalStageStep = {
        stepNumber: 1,
        title: "Proposta",
        label: "1. Proposta",
        shortLabel: "Prop",
        state: "completed",
        tooltip: "1. Proposta: Elaborada e enviada ao cliente (Concluída)",
    };

    // Step 2: Aprovação
    let step2: ProposalStageStep;
    if (isDeclined) {
        step2 = {
            stepNumber: 2,
            title: "Aprovação",
            label: "2. Recusada",
            shortLabel: "Recus",
            state: "declined",
            colorVariant: "rose",
            badgeText: "Recusada",
            tooltip: "2. Aprovação: Proposta recusada pelo cliente",
        };
    } else if (hasContract || isSigned || isPaid || isApproved) {
        step2 = {
            stepNumber: 2,
            title: "Aprovação",
            label: "2. Aprovada",
            shortLabel: "Aprov",
            state: "completed",
            tooltip: "2. Aprovação: Proposta aprovada pelo cliente (Concluída)",
        };
    } else {
        step2 = {
            stepNumber: 2,
            title: "Aprovação",
            label: "2. Aprovação",
            shortLabel: "Aprov",
            state: "current",
            colorVariant: "amber",
            badgeText: "Atual",
            tooltip: "2. Aprovação: Aguardando aprovação do cliente (Etapa Atual)",
        };
    }

    // Step 3: Contrato
    let step3: ProposalStageStep;
    if (isDeclined) {
        step3 = {
            stepNumber: 3,
            title: "Contrato",
            label: "3. Contrato",
            shortLabel: "Contr",
            state: "future",
            tooltip: "3. Contrato: Etapa interrompida por recusa da proposta",
        };
    } else if (hasContract || isSigned || isPaid) {
        step3 = {
            stepNumber: 3,
            title: "Contrato",
            label: "3. Contrato",
            shortLabel: "Contr",
            state: "completed",
            tooltip: "3. Contrato: Contrato gerado e vinculado (Concluída)",
        };
    } else if (isApproved) {
        step3 = {
            stepNumber: 3,
            title: "Contrato",
            label: "3. Contrato",
            shortLabel: "Contr",
            state: "current",
            colorVariant: "indigo",
            badgeText: "Atual",
            tooltip: "3. Contrato: Proposta aprovada, aguardando geração do contrato (Etapa Atual)",
        };
    } else {
        step3 = {
            stepNumber: 3,
            title: "Contrato",
            label: "3. Contrato",
            shortLabel: "Contr",
            state: "future",
            tooltip: "3. Contrato: Aguardando aprovação prévia da proposta",
        };
    }

    // Step 4: Assinatura
    let step4: ProposalStageStep;
    if (isDeclined) {
        step4 = {
            stepNumber: 4,
            title: "Assinatura",
            label: "4. Assinatura",
            shortLabel: "Assin",
            state: "future",
            tooltip: "4. Assinatura: Etapa interrompida por recusa da proposta",
        };
    } else if (isSigned || isPaid) {
        step4 = {
            stepNumber: 4,
            title: "Assinatura",
            label: "4. Assinado",
            shortLabel: "Assin",
            state: "completed",
            tooltip: "4. Assinatura: Contrato assinado digitalmente pelas partes (Concluída)",
        };
    } else if (hasContract) {
        step4 = {
            stepNumber: 4,
            title: "Assinatura",
            label: "4. Assinatura",
            shortLabel: "Assin",
            state: "current",
            colorVariant: "teal",
            badgeText: "Atual",
            tooltip: "4. Assinatura: Contrato gerado, aguardando assinatura (Etapa Atual)",
        };
    } else {
        step4 = {
            stepNumber: 4,
            title: "Assinatura",
            label: "4. Assinatura",
            shortLabel: "Assin",
            state: "future",
            tooltip: "4. Assinatura: Aguardando geração do contrato",
        };
    }

    // Step 5: Cobrança
    let step5: ProposalStageStep;
    if (isDeclined) {
        step5 = {
            stepNumber: 5,
            title: "Cobrança",
            label: "5. Cobrança",
            shortLabel: "Cobr",
            state: "future",
            tooltip: "5. Cobrança: Etapa interrompida por recusa da proposta",
        };
    } else if (isPaid) {
        step5 = {
            stepNumber: 5,
            title: "Cobrança",
            label: "5. Paga",
            shortLabel: "Paga",
            state: "current",
            colorVariant: "emerald",
            badgeText: "Concluída",
            tooltip: "5. Cobrança: Fatura paga com sucesso (Fluxo Comercial Concluído)",
        };
    } else if (isSigned) {
        step5 = {
            stepNumber: 5,
            title: "Cobrança",
            label: "5. Cobrança",
            shortLabel: "Cobr",
            state: "current",
            colorVariant: "blue",
            badgeText: "Atual",
            tooltip: pipeline.charge
                ? "5. Cobrança: Cobrança gerada, aguardando liquidação financeira (Etapa Atual)"
                : "5. Cobrança: Contrato assinado, aguardando emissão da fatura (Etapa Atual)",
        };
    } else {
        step5 = {
            stepNumber: 5,
            title: "Cobrança",
            label: "5. Cobrança",
            shortLabel: "Cobr",
            state: "future",
            tooltip: "5. Cobrança: Aguardando assinatura do contrato",
        };
    }

    return [step1, step2, step3, step4, step5];
};

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [charges, setCharges] = useState<BillingCharge[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [linkingId, setLinkingId] = useState<number | null>(null);
    const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [feedbackAlert, setFeedbackAlert] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

    // Filters & View State
    const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");
    const [searchQuery, setSearchQuery] = useState("");
    const [stageFilter, setStageFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "SIGNED" | "DECLINED">("ALL");

    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        else setRefreshing(true);

        try {
            const [proposalsData, contractsData, chargesData, clientsData] = await Promise.all([
                getProposals().catch(() => []),
                getContracts().catch(() => []),
                getBillingCharges().catch(() => []),
                getClients().catch(() => []),
            ]);

            setProposals(Array.isArray(proposalsData) ? proposalsData : []);
            setContracts(Array.isArray(contractsData) ? contractsData : []);
            setCharges(Array.isArray(chargesData) ? chargesData : []);
            setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (error) {
            console.error("Erro ao carregar dados comerciais:", error);
            setFeedbackAlert({
                type: "error",
                message: "Não foi possível carregar os dados comerciais da API.",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Clear alert after 6 seconds
    useEffect(() => {
        if (!feedbackAlert) return;
        const timer = setTimeout(() => setFeedbackAlert(null), 6000);
        return () => clearTimeout(timer);
    }, [feedbackAlert]);

    // Helpers to derive pipeline stage for each proposal
    const getProposalPipeline = useCallback(
        (proposal: Proposal) => {
            const contract = contracts.find((c) => c.proposalId === proposal.id);
            const charge = charges.find(
                (b) => b.proposalId === proposal.id || (contract && b.contractId === contract.id)
            );
            const client = clients.find(
                (cl) => cl.id === proposal.clientId || cl.id === proposal.client?.id
            );

            // Stage 1: Proposta (Proposal created & sent)
            const stage1 = { name: "Proposta", done: true, status: "created" };

            // Stage 2: Aprovação (Approval)
            const isApproved = proposal.status === "APPROVED";
            const isDeclined = proposal.status === "DECLINED";
            const isPending = proposal.status === "PENDING";
            const stage2 = {
                name: "Aprovação",
                done: isApproved,
                declined: isDeclined,
                pending: isPending,
                status: isApproved ? "approved" : isDeclined ? "declined" : "pending",
            };

            // Stage 3: Contrato (Contract generation)
            const hasContract = Boolean(contract);
            const stage3 = {
                name: "Contrato",
                done: hasContract,
                pending: isApproved && !hasContract,
                contract,
            };

            // Stage 4: Assinatura (Contract signature)
            const isSigned = Boolean(contract?.signedAt);
            const awaitingSignature = Boolean(contract && !contract.signedAt && contract.signatureToken);
            const stage4 = {
                name: "Assinatura",
                done: isSigned,
                pending: awaitingSignature,
                signatureToken: contract?.signatureToken,
                signedAt: contract?.signedAt,
            };

            // Stage 5: Cobrança (Billing)
            const isPaid = charge?.status === "PAID";
            const isChargePending = charge?.status === "PENDING" || charge?.status === "OPEN";
            const stage5 = {
                name: "Cobrança",
                done: isPaid,
                pending: isChargePending,
                charge,
            };

            // Overall classification for Kanban
            let kanbanStage: "proposta" | "aprovada" | "assinatura" | "concluida" | "recusada" = "proposta";
            if (isDeclined) {
                kanbanStage = "recusada";
            } else if (isSigned || isPaid) {
                kanbanStage = "concluida";
            } else if (hasContract || awaitingSignature) {
                kanbanStage = "assinatura";
            } else if (isApproved) {
                kanbanStage = "aprovada";
            } else {
                kanbanStage = "proposta";
            }

            return {
                contract,
                charge,
                client,
                stages: [stage1, stage2, stage3, stage4, stage5],
                kanbanStage,
                isApproved,
                isDeclined,
                isPending,
                isSigned,
                awaitingSignature,
                hasContract,
                isPaid,
            };
        },
        [contracts, charges, clients]
    );

    // Filtered proposals
    const filteredProposals = useMemo(() => {
        return proposals.filter((proposal) => {
            const clientName = (proposal.client?.name || proposal.clientName || "").toLowerCase();
            const clientEmail = (proposal.client?.email || proposal.clientEmail || "").toLowerCase();
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query || clientName.includes(query) || clientEmail.includes(query);

            if (!matchesQuery) return false;

            const pipeline = getProposalPipeline(proposal);

            if (stageFilter === "PENDING") return pipeline.isPending;
            if (stageFilter === "APPROVED") return pipeline.isApproved && !pipeline.isSigned;
            if (stageFilter === "SIGNED") return pipeline.isSigned;
            if (stageFilter === "DECLINED") return pipeline.isDeclined;

            return true;
        });
    }, [proposals, searchQuery, stageFilter, getProposalPipeline]);

    // Summary Metrics
    const metrics = useMemo(() => {
        const totalProposals = proposals.length;
        let pendingCount = 0;
        let approvedCount = 0;
        let signedContractsCount = 0;
        let convertedRevenue = 0;

        proposals.forEach((p) => {
            const pipeline = getProposalPipeline(p);
            if (pipeline.isPending) pendingCount += 1;
            if (pipeline.isApproved) {
                approvedCount += 1;
                convertedRevenue += Number(p.total || 0);
            }
            if (pipeline.isSigned) signedContractsCount += 1;
        });

        return {
            totalProposals,
            pendingCount,
            approvedCount,
            signedContractsCount,
            convertedRevenue,
        };
    }, [proposals, getProposalPipeline]);

    // Actions
    const handleCopyPublicLink = async (publicToken?: string | null) => {
        const path = getPublicProposalPath(publicToken);
        if (!path) return;
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const url = `${origin}${path}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedToken(publicToken!.trim());
            setTimeout(() => setCopiedToken(null), 2500);
        } catch {
            prompt("Copie o link abaixo:", url);
        }
    };

    const getWhatsAppUrl = (proposal: Proposal, clientPhone?: string) => {
        const path = getPublicProposalPath(proposal.publicToken);
        if (!path) return null;
        const origin = typeof window !== "undefined" ? window.location.origin : "https://econticomigo.com.br";
        const link = `${origin}${path}`;
        const name = proposal.client?.name || proposal.clientName || "Cliente";
        const message = `Olá, ${name}! Segue o link da sua proposta comercial personalizada da Conti Marketing Digital: ${link}\n\nFicamos à total disposição para tirar qualquer dúvida!`;

        const rawPhone = clientPhone || proposal.client?.phone || "";
        const digitsOnly = rawPhone.replace(/\D/g, "");
        const phoneWithCountry = digitsOnly ? (digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`) : "";

        if (phoneWithCountry.length >= 10) {
            return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
        }
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    const handleApprove = async (proposal: Proposal) => {
        if (!proposal.clientId && !proposal.client?.id) {
            setFeedbackAlert({
                type: "info",
                message: "Antes de aprovar, vincule um cliente a esta proposta pelo menu de seleção.",
            });
            return;
        }

        if (!confirm(`Deseja aprovar a proposta de ${proposal.client?.name || proposal.clientName}? O contrato será gerado automaticamente.`)) {
            return;
        }

        try {
            setActionInProgressId(proposal.id);
            const result = await approveProposal(proposal.id);

            setProposals((prev) =>
                prev.map((p) => (p.id === proposal.id ? { ...p, status: "APPROVED", approvedAt: new Date().toISOString() } : p))
            );

            if (result?.contract) {
                setContracts((prev) => {
                    const exists = prev.some((c) => c.id === result.contract.id);
                    return exists ? prev : [result.contract, ...prev];
                });
            }

            setFeedbackAlert({
                type: "success",
                message: "Proposta aprovada com sucesso! Contrato gerado para assinatura.",
            });
        } catch (error: any) {
            console.error("Erro ao aprovar proposta:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Erro ao aprovar proposta.",
            });
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleGenerateContract = async (proposalId: number) => {
        try {
            setActionInProgressId(proposalId);
            const result = await getOrCreateProposalContract(proposalId);
            if (result?.contract) {
                setContracts((prev) => {
                    const filtered = prev.filter((c) => c.id !== result.contract.id);
                    return [result.contract, ...filtered];
                });
                setFeedbackAlert({
                    type: "success",
                    message: "Contrato vinculado e pronto para assinatura.",
                });
            }
        } catch (error: any) {
            console.error("Erro ao obter/gerar contrato:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Erro ao obter contrato.",
            });
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleLinkClient = async (proposalId: number, clientId: string) => {
        try {
            setLinkingId(proposalId);
            const updatedProposal = await linkProposalClient(proposalId, clientId ? Number(clientId) : undefined);
            setProposals((prev) => prev.map((p) => (p.id === proposalId ? updatedProposal : p)));
            setFeedbackAlert({
                type: "success",
                message: "Vínculo de cliente atualizado.",
            });
        } catch (error: any) {
            console.error("Erro ao vincular cliente:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Erro ao vincular cliente à proposta.",
            });
        } finally {
            setLinkingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja apagar esta proposta?")) return;
        try {
            await deleteProposal(id);
            setProposals((prev) => prev.filter((p) => p.id !== id));
            setFeedbackAlert({
                type: "info",
                message: "Proposta removida com sucesso.",
            });
        } catch (error) {
            console.error("Erro ao apagar proposta:", error);
            setFeedbackAlert({
                type: "error",
                message: "Erro ao apagar proposta.",
            });
        }
    };

    return (
        <div className="pb-16 max-w-[1520px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header & Primary Action */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-200/90 pb-6">
                <div>
                    <span className="text-xs font-black tracking-[0.22em] uppercase text-blue-600">
                        Gestão Comercial &bull; Fase 2
                    </span>
                    <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight mt-1">
                        Pipeline de Propostas
                    </h1>
                    <p className="text-xs text-zinc-600 mt-1">
                        Acompanhe o fluxo comercial: Proposta &rarr; Aprovação &rarr; Contrato &rarr; Assinatura &rarr; Cobrança
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                        title="Atualizar dados"
                        aria-label="Atualizar dados"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin text-blue-600" : ""} />
                    </button>

                    <Link
                        href="/admin/proposals/new"
                        className="flex-1 md:flex-initial group flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                        Nova Proposta
                    </Link>
                </div>
            </div>

            {/* Notification Feedback Banner */}
            {feedbackAlert && (
                <div
                    role="alert"
                    className={`rounded-2xl border px-5 py-3.5 text-xs font-semibold flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
                        feedbackAlert.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : feedbackAlert.type === "error"
                            ? "bg-rose-50 border-rose-200 text-rose-900"
                            : "bg-blue-50 border-blue-200 text-blue-900"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {feedbackAlert.type === "success" ? (
                            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                        ) : feedbackAlert.type === "error" ? (
                            <AlertCircle size={16} className="text-rose-700 shrink-0" />
                        ) : (
                            <FileText size={16} className="text-blue-700 shrink-0" />
                        )}
                        <span>{feedbackAlert.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackAlert(null)}
                        className="text-zinc-600 hover:text-zinc-950 text-[11px] underline font-bold"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Commercial Pipeline KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-zinc-600">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-600">Total Propostas</span>
                        <Layers size={16} className="text-blue-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-zinc-950 tabular-nums mt-2">
                        {metrics.totalProposals}
                    </p>
                    <span className="text-[11px] text-zinc-500 font-medium">Criadas no sistema</span>
                </div>

                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-zinc-600">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-600">Aguardando Decisão</span>
                        <Clock size={16} className="text-amber-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-amber-800 tabular-nums mt-2">
                        {metrics.pendingCount}
                    </p>
                    <span className="text-[11px] text-zinc-500 font-medium">Pendentes de aprovação</span>
                </div>

                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-zinc-600">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-600">Propostas Aprovadas</span>
                        <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-800 tabular-nums mt-2">
                        {metrics.approvedCount}
                    </p>
                    <span className="text-[11px] text-zinc-500 font-medium">Aceitas pelo cliente/admin</span>
                </div>

                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between text-zinc-600">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-600">Contratos Assinados</span>
                        <FileSignature size={16} className="text-teal-600" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-teal-800 tabular-nums mt-2">
                        {metrics.signedContractsCount}
                    </p>
                    <span className="text-[11px] text-zinc-500 font-medium">Com validade jurídica</span>
                </div>

                <div className="col-span-2 lg:col-span-1 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
                    <div className="flex items-center justify-between text-blue-900">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-800">Volume Convertido</span>
                        <DollarSign size={16} className="text-blue-700" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-950 tabular-nums mt-2">
                        {formatMoney(metrics.convertedRevenue)}
                    </p>
                    <span className="text-[11px] text-blue-700 font-medium">Total em propostas fechadas</span>
                </div>
            </div>

            {/* Filter & View Switcher Bar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Search & Stage Filter Pills */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar cliente ou e-mail..."
                            className="w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                        />
                    </div>

                    {/* Stage Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200">
                        <button
                            type="button"
                            onClick={() => setStageFilter("ALL")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                stageFilter === "ALL"
                                    ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                            }`}
                        >
                            Todas ({proposals.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStageFilter("PENDING")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-amber-500 ${
                                stageFilter === "PENDING"
                                    ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-sm"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                            }`}
                        >
                            Pendentes ({metrics.pendingCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStageFilter("APPROVED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                stageFilter === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-sm"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                            }`}
                        >
                            Aprovadas ({metrics.approvedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStageFilter("SIGNED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-teal-500 ${
                                stageFilter === "SIGNED"
                                    ? "bg-teal-50 text-teal-900 border border-teal-200 shadow-sm"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                            }`}
                        >
                            Assinadas ({metrics.signedContractsCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStageFilter("DECLINED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-rose-500 ${
                                stageFilter === "DECLINED"
                                    ? "bg-rose-50 text-rose-900 border border-rose-200 shadow-sm"
                                    : "text-zinc-600 hover:text-zinc-900 hover:bg-white/60"
                            }`}
                        >
                            Recusadas
                        </button>
                    </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1.5 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200 self-end lg:self-auto">
                    <button
                        type="button"
                        onClick={() => setViewMode("pipeline")}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            viewMode === "pipeline"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
                        }`}
                    >
                        <Kanban size={14} />
                        Visão Pipeline
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            viewMode === "table"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
                        }`}
                    >
                        <Table size={14} />
                        Visão Tabela
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-4 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shadow-sm">
                        <Loader2 className="animate-spin text-blue-600" size={24} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        Carregando propostas comerciais...
                    </p>
                </div>
            ) : filteredProposals.length === 0 ? (
                <div className="py-24 bg-white rounded-2xl border border-zinc-200 flex flex-col items-center justify-center text-center shadow-sm p-8">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shadow-inner mb-4">
                        <FileText size={28} className="text-zinc-500" />
                    </div>
                    <h3 className="text-zinc-900 font-bold text-base">Nenhuma proposta encontrada</h3>
                    <p className="text-zinc-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                        {searchQuery
                            ? "Nenhum orçamento corresponde à sua pesquisa."
                            : "Crie um orçamento personalizado para iniciar seu pipeline comercial."}
                    </p>
                    <Link
                        href="/admin/proposals/new"
                        className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                        <Plus size={14} /> Criar Proposta
                    </Link>
                </div>
            ) : viewMode === "pipeline" ? (
                /* ========================================================================= */
                /* PIPELINE / KANBAN VIEW (Light & Accessible)                               */
                /* ========================================================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                    {/* Column 1: Proposta Enviada (Aguardando Aprovação) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-amber-300">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-amber-900">
                                    1. Aguardando Decisão
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-md tabular-nums">
                                {filteredProposals.filter((p) => getProposalPipeline(p).kanbanStage === "proposta").length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {filteredProposals
                                .filter((p) => getProposalPipeline(p).kanbanStage === "proposta")
                                .map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        pipeline={getProposalPipeline(proposal)}
                                        clients={clients}
                                        linkingId={linkingId}
                                        actionInProgressId={actionInProgressId}
                                        copiedToken={copiedToken}
                                        onCopyPublicLink={handleCopyPublicLink}
                                        onApprove={handleApprove}
                                        onGenerateContract={handleGenerateContract}
                                        onLinkClient={handleLinkClient}
                                        onDelete={handleDelete}
                                        getWhatsAppUrl={getWhatsAppUrl}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Column 2: Aprovada (Aguardando Contrato) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-blue-300">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-blue-900">
                                    2. Aprovada &bull; Gerar Contrato
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-blue-900 bg-blue-100/80 border border-blue-200 px-2 py-0.5 rounded-md tabular-nums">
                                {filteredProposals.filter((p) => getProposalPipeline(p).kanbanStage === "aprovada").length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {filteredProposals
                                .filter((p) => getProposalPipeline(p).kanbanStage === "aprovada")
                                .map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        pipeline={getProposalPipeline(proposal)}
                                        clients={clients}
                                        linkingId={linkingId}
                                        actionInProgressId={actionInProgressId}
                                        copiedToken={copiedToken}
                                        onCopyPublicLink={handleCopyPublicLink}
                                        onApprove={handleApprove}
                                        onGenerateContract={handleGenerateContract}
                                        onLinkClient={handleLinkClient}
                                        onDelete={handleDelete}
                                        getWhatsAppUrl={getWhatsAppUrl}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Column 3: Contrato / Aguardando Assinatura */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-indigo-300">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-indigo-900">
                                    3. Aguardando Assinatura
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-indigo-900 bg-indigo-100/80 border border-indigo-200 px-2 py-0.5 rounded-md tabular-nums">
                                {filteredProposals.filter((p) => getProposalPipeline(p).kanbanStage === "assinatura").length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {filteredProposals
                                .filter((p) => getProposalPipeline(p).kanbanStage === "assinatura")
                                .map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        pipeline={getProposalPipeline(proposal)}
                                        clients={clients}
                                        linkingId={linkingId}
                                        actionInProgressId={actionInProgressId}
                                        copiedToken={copiedToken}
                                        onCopyPublicLink={handleCopyPublicLink}
                                        onApprove={handleApprove}
                                        onGenerateContract={handleGenerateContract}
                                        onLinkClient={handleLinkClient}
                                        onDelete={handleDelete}
                                        getWhatsAppUrl={getWhatsAppUrl}
                                    />
                                ))}
                        </div>
                    </div>

                    {/* Column 4: Assinado & Cobrança / Concluídos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-300">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-900">
                                    4. Assinado & Cobrança
                                </h3>
                            </div>
                            <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-md tabular-nums">
                                {filteredProposals.filter((p) => getProposalPipeline(p).kanbanStage === "concluida").length}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {filteredProposals
                                .filter((p) => getProposalPipeline(p).kanbanStage === "concluida")
                                .map((proposal) => (
                                    <ProposalCard
                                        key={proposal.id}
                                        proposal={proposal}
                                        pipeline={getProposalPipeline(proposal)}
                                        clients={clients}
                                        linkingId={linkingId}
                                        actionInProgressId={actionInProgressId}
                                        copiedToken={copiedToken}
                                        onCopyPublicLink={handleCopyPublicLink}
                                        onApprove={handleApprove}
                                        onGenerateContract={handleGenerateContract}
                                        onLinkClient={handleLinkClient}
                                        onDelete={handleDelete}
                                        getWhatsAppUrl={getWhatsAppUrl}
                                    />
                                ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* TABLE VIEW (Light & Accessible)                                           */
                /* ========================================================================= */
                <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Cliente</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Tipo & Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Total</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Etapas (5)</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-zinc-800">
                                {filteredProposals.map((proposal) => {
                                    const pipeline = getProposalPipeline(proposal);
                                    const clientDisplayName = proposal.client?.name || proposal.clientName || "Sem Nome";
                                    const clientEmail = proposal.client?.email || proposal.clientEmail || "Sem e-mail";
                                    const publicPath = getPublicProposalPath(proposal.publicToken);
                                    const whatsappUrl = getWhatsAppUrl(proposal, proposal.client?.phone);

                                    return (
                                        <tr key={proposal.id} className="hover:bg-blue-50/20 transition-colors">
                                            {/* Client Info & Select */}
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-zinc-950 text-sm tracking-tight mb-1">
                                                    {clientDisplayName}
                                                </div>
                                                <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                                    <span>{clientEmail}</span>
                                                    {proposal.client ? (
                                                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            Vinculado
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                            Manual
                                                        </span>
                                                    )}
                                                </div>

                                                <select
                                                    value={proposal.clientId || proposal.client?.id || ""}
                                                    onChange={(e) => handleLinkClient(proposal.id, e.target.value)}
                                                    disabled={linkingId === proposal.id}
                                                    aria-label={`Vincular cliente à proposta de ${clientDisplayName}`}
                                                    className="mt-2.5 w-full max-w-[240px] rounded-lg border border-zinc-200 bg-zinc-50/70 hover:bg-white px-2.5 py-1.5 text-[11px] text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                                                >
                                                    <option value="">Vincular cliente do banco...</option>
                                                    {clients.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name} {c.email ? `(${c.email})` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Type & Date */}
                                            <td className="px-6 py-5">
                                                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                                                    {PROPOSAL_TYPE_NAMES[proposal.proposalType || "empresarial"] || proposal.proposalType || "Orçamento"}
                                                </span>
                                                <p className="text-xs text-zinc-500 mt-1.5 font-sans tabular-nums">
                                                    {formatDate(proposal.createdAt)}
                                                </p>
                                            </td>

                                            {/* Total */}
                                            <td className="px-6 py-5">
                                                <span className="font-bold text-zinc-950 text-base font-sans tabular-nums">
                                                    {formatMoney(proposal.total)}
                                                </span>
                                            </td>

                                            {/* Stepper Pipeline (5 steps with unequivocal current state) */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 flex-nowrap">
                                                    {getProposalStageSteps(pipeline).map((step, idx, arr) => {
                                                        if (step.state === "completed") {
                                                            return (
                                                                <React.Fragment key={step.stepNumber}>
                                                                    <span
                                                                        title={step.tooltip}
                                                                        className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/90 whitespace-nowrap transition-colors"
                                                                    >
                                                                        <Check size={11} className="text-emerald-600 stroke-[2.5]" />
                                                                        <span>{step.label}</span>
                                                                    </span>
                                                                    {idx < arr.length - 1 && (
                                                                        <ChevronRight size={12} className="text-zinc-300 shrink-0 select-none" aria-hidden="true" />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        }

                                                        if (step.state === "declined") {
                                                            return (
                                                                <React.Fragment key={step.stepNumber}>
                                                                    <span
                                                                        title={step.tooltip}
                                                                        className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[10px] font-black bg-rose-600 text-white border border-rose-700 shadow-xs ring-2 ring-rose-500/30 whitespace-nowrap"
                                                                    >
                                                                        <XCircle size={11} className="text-white shrink-0" />
                                                                        <span>{step.label}</span>
                                                                        <span className="text-[8px] font-black uppercase tracking-wider bg-white/20 px-1 py-0.5 rounded leading-none">
                                                                            Recusada
                                                                        </span>
                                                                    </span>
                                                                    {idx < arr.length - 1 && (
                                                                        <ChevronRight size={12} className="text-zinc-300 shrink-0 select-none" aria-hidden="true" />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        }

                                                        if (step.state === "current") {
                                                            const colorMap: Record<string, string> = {
                                                                amber: "bg-amber-500 text-white border-amber-600 ring-amber-400/35",
                                                                indigo: "bg-indigo-600 text-white border-indigo-700 ring-indigo-500/35",
                                                                teal: "bg-teal-600 text-white border-teal-700 ring-teal-500/35",
                                                                blue: "bg-blue-600 text-white border-blue-700 ring-blue-500/35",
                                                                emerald: "bg-emerald-600 text-white border-emerald-700 ring-emerald-500/35",
                                                                rose: "bg-rose-600 text-white border-rose-700 ring-rose-500/35",
                                                            };
                                                            const colorClass = colorMap[step.colorVariant || "blue"] || "bg-blue-600 text-white border-blue-700 ring-blue-500/35";

                                                            return (
                                                                <React.Fragment key={step.stepNumber}>
                                                                    <span
                                                                        title={step.tooltip}
                                                                        className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md text-[10px] font-black border shadow-xs ring-2 whitespace-nowrap ${colorClass}`}
                                                                    >
                                                                        {step.colorVariant === "emerald" ? (
                                                                            <Check size={11} className="text-white stroke-[2.5] shrink-0" />
                                                                        ) : (
                                                                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse shrink-0" />
                                                                        )}
                                                                        <span>{step.label}</span>
                                                                        {step.badgeText && (
                                                                            <span className="text-[8px] font-black uppercase tracking-wider bg-white/25 px-1 py-0.5 rounded leading-none">
                                                                                {step.badgeText}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                    {idx < arr.length - 1 && (
                                                                        <ChevronRight size={12} className="text-zinc-300 shrink-0 select-none" aria-hidden="true" />
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        }

                                                        // Future / upcoming step
                                                        return (
                                                            <React.Fragment key={step.stepNumber}>
                                                                <span
                                                                    title={step.tooltip}
                                                                    className="inline-flex items-center justify-center h-6 px-2 rounded-md text-[10px] font-medium bg-zinc-50/80 text-zinc-400 border border-zinc-200/70 border-dashed whitespace-nowrap"
                                                                >
                                                                    {step.label}
                                                                </span>
                                                                {idx < arr.length - 1 && (
                                                                    <ChevronRight size={12} className="text-zinc-300 shrink-0 select-none" aria-hidden="true" />
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Main Status Badge */}
                                            <td className="px-6 py-5">
                                                {pipeline.isApproved ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                        <CheckCircle2 size={12} /> Aprovada
                                                    </span>
                                                ) : pipeline.isDeclined ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                                                        <XCircle size={12} /> Recusada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                                        <Clock size={12} /> Pendente
                                                    </span>
                                                )}
                                            </td>

                                            {/* Unified Table Action Toolbar */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-1 p-1 bg-zinc-50 border border-zinc-200/90 rounded-xl w-fit ml-auto shadow-xs">
                                                    {/* Copy Public Link */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPublicLink(proposal.publicToken)}
                                                        disabled={!publicPath}
                                                        aria-label={publicPath ? "Copiar link da proposta" : PUBLIC_LINK_UNAVAILABLE}
                                                        title={publicPath ? "Copiar link da proposta" : PUBLIC_LINK_UNAVAILABLE}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-45 disabled:cursor-not-allowed"
                                                    >
                                                        {copiedToken === proposal.publicToken ? (
                                                            <Check size={14} className="text-emerald-700" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </button>

                                                    {/* Open Public Proposal */}
                                                    {publicPath ? <Link href={publicPath} target="_blank" aria-label="Abrir proposta pública em nova guia" title="Abrir proposta pública em nova guia" className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"><ExternalLink size={14} /></Link> : <button type="button" disabled aria-label={PUBLIC_LINK_UNAVAILABLE} title={PUBLIC_LINK_UNAVAILABLE} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 opacity-45 cursor-not-allowed"><ExternalLink size={14} /></button>}

                                                    {/* WhatsApp */}
                                                    {whatsappUrl ? <a
                                                        href={whatsappUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        aria-label="Enviar proposta pelo WhatsApp"
                                                        title="Enviar proposta pelo WhatsApp"
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 active:bg-emerald-100 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                    >
                                                        <MessageCircle size={14} />
                                                    </a> : <button type="button" disabled aria-label={PUBLIC_LINK_UNAVAILABLE} title={PUBLIC_LINK_UNAVAILABLE} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 opacity-45 cursor-not-allowed"><MessageCircle size={14} /></button>}

                                                    {/* Primary Action Button based on Stage */}
                                                    {pipeline.isPending ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleApprove(proposal)}
                                                            disabled={actionInProgressId === proposal.id}
                                                            aria-label="Aprovar proposta e gerar contrato"
                                                            title="Aprovar proposta e gerar contrato"
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 active:bg-blue-800 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                                                        >
                                                            {actionInProgressId === proposal.id ? (
                                                                <Loader2 size={14} className="animate-spin text-white" />
                                                            ) : (
                                                                <CheckCircle2 size={14} />
                                                            )}
                                                        </button>
                                                    ) : pipeline.isApproved && !pipeline.hasContract ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleGenerateContract(proposal.id)}
                                                            disabled={actionInProgressId === proposal.id}
                                                            aria-label="Gerar contrato vinculado"
                                                            title="Gerar contrato vinculado"
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 active:bg-indigo-800 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
                                                        >
                                                            {actionInProgressId === proposal.id ? (
                                                                <Loader2 size={14} className="animate-spin text-white" />
                                                            ) : (
                                                                <FileSignature size={14} />
                                                            )}
                                                        </button>
                                                    ) : pipeline.hasContract && pipeline.contract?.signatureToken ? (
                                                        <Link
                                                            href={`/assinar-contrato/${pipeline.contract.signatureToken}`}
                                                            target="_blank"
                                                            aria-label="Abrir tela de assinatura do contrato"
                                                            title="Abrir tela de assinatura do contrato"
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white border border-teal-600 active:bg-teal-800 transition-all focus-visible:ring-2 focus-visible:ring-teal-500"
                                                        >
                                                            <FileSignature size={14} />
                                                        </Link>
                                                    ) : null}

                                                    {/* Vertical Separator */}
                                                    <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" aria-hidden="true" />

                                                    {/* Edit */}
                                                    <Link
                                                        href={`/admin/proposals/new?edit=${proposal.id}`}
                                                        aria-label="Editar orçamento"
                                                        title="Editar orçamento"
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                                                    >
                                                        <Pencil size={14} />
                                                    </Link>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(proposal.id)}
                                                        disabled={actionInProgressId === proposal.id}
                                                        aria-label="Excluir proposta"
                                                        title={actionInProgressId === proposal.id ? "Aguarde a ação em andamento para excluir" : "Excluir proposta"}
                                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-600 active:border-rose-800 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 disabled:bg-rose-400 disabled:border-rose-400 disabled:opacity-75 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 size={14} className="text-white" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ========================================================================= */
/* KANBAN PROPOSAL CARD COMPONENT (Refined Toolbar & Hierarchy)              */
/* ========================================================================= */
interface ProposalCardProps {
    proposal: Proposal;
    pipeline: any;
    clients: Client[];
    linkingId: number | null;
    actionInProgressId: number | null;
    copiedToken: string | null;
    onCopyPublicLink: (token?: string | null) => void;
    onApprove: (proposal: Proposal) => void;
    onGenerateContract: (proposalId: number) => void;
    onLinkClient: (proposalId: number, clientId: string) => void;
    onDelete: (proposalId: number) => void;
    getWhatsAppUrl: (proposal: Proposal, phone?: string) => string | null;
}

function ProposalCard({
    proposal,
    pipeline,
    clients,
    linkingId,
    actionInProgressId,
    copiedToken,
    onCopyPublicLink,
    onApprove,
    onGenerateContract,
    onLinkClient,
    onDelete,
    getWhatsAppUrl,
}: ProposalCardProps) {
    const clientName = proposal.client?.name || proposal.clientName || "Sem Nome";
    const clientEmail = proposal.client?.email || proposal.clientEmail || "";
    const typeLabel = PROPOSAL_TYPE_NAMES[proposal.proposalType || "empresarial"] || proposal.proposalType || "Orçamento";
    const publicPath = getPublicProposalPath(proposal.publicToken);
    const whatsappUrl = getWhatsAppUrl(proposal, proposal.client?.phone);

    return (
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all space-y-4">
            {/* Top Row: Type & Total */}
            <div className="flex items-start justify-between gap-3">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {typeLabel}
                </span>
                <span className="text-lg font-bold text-zinc-950 font-sans tabular-nums">
                    {formatMoney(proposal.total)}
                </span>
            </div>

            {/* Client Info */}
            <div className="space-y-1">
                <h4 className="text-base font-bold text-zinc-900 tracking-tight leading-snug">
                    {clientName}
                </h4>
                <p className="text-xs text-zinc-500 truncate">
                    {clientEmail || "Sem e-mail cadastrado"}
                </p>
            </div>

            {/* Client Linking Dropdown */}
            <div>
                <select
                    value={proposal.clientId || proposal.client?.id || ""}
                    onChange={(e) => onLinkClient(proposal.id, e.target.value)}
                    disabled={linkingId === proposal.id}
                    aria-label={`Vincular cliente à proposta de ${clientName}`}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-white px-3 py-2 text-xs text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-50"
                >
                    <option value="">Vincular cliente...</option>
                    {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name} {c.email ? `(${c.email})` : ""}
                        </option>
                    ))}
                </select>
            </div>

            {/* Pipeline Stage Indicators (Mini 5-step dots) */}
            <div className="pt-2 border-t border-zinc-100 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                    <span>Etapas</span>
                    <span className="text-zinc-500 font-sans tabular-nums text-xs">{formatDate(proposal.createdAt)}</span>
                </div>

                <div className="grid grid-cols-5 gap-1 text-center">
                    {getProposalStageSteps(pipeline).map((step) => {
                        if (step.state === "completed") {
                            return (
                                <div
                                    key={step.stepNumber}
                                    title={step.tooltip}
                                    className="py-1 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center gap-0.5"
                                >
                                    <Check size={9} className="text-emerald-600 stroke-[2.5]" />
                                    <span>{step.shortLabel}</span>
                                </div>
                            );
                        }

                        if (step.state === "declined") {
                            return (
                                <div
                                    key={step.stepNumber}
                                    title={step.tooltip}
                                    className="py-1 rounded text-[9px] font-black uppercase bg-rose-600 text-white border border-rose-700 shadow-2xs ring-1 ring-rose-400"
                                >
                                    {step.shortLabel}
                                </div>
                            );
                        }

                        if (step.state === "current") {
                            const colorMap: Record<string, string> = {
                                amber: "bg-amber-500 text-white border-amber-600 ring-1 ring-amber-400",
                                indigo: "bg-indigo-600 text-white border-indigo-700 ring-1 ring-indigo-500",
                                teal: "bg-teal-600 text-white border-teal-700 ring-1 ring-teal-500",
                                blue: "bg-blue-600 text-white border-blue-700 ring-1 ring-blue-500",
                                emerald: "bg-emerald-600 text-white border-emerald-700 ring-1 ring-emerald-500",
                                rose: "bg-rose-600 text-white border-rose-700 ring-1 ring-rose-400",
                            };
                            const colorClass = colorMap[step.colorVariant || "blue"] || "bg-blue-600 text-white border-blue-700";

                            return (
                                <div
                                    key={step.stepNumber}
                                    title={step.tooltip}
                                    className={`py-1 rounded text-[9px] font-black uppercase border shadow-2xs ${colorClass}`}
                                >
                                    {step.shortLabel}
                                </div>
                            );
                        }

                        return (
                            <div
                                key={step.stepNumber}
                                title={step.tooltip}
                                className="py-1 rounded text-[9px] font-medium uppercase bg-zinc-50 text-zinc-400 border border-zinc-200/70 border-dashed"
                            >
                                {step.shortLabel}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Smart Actions & Toolbar */}
            <div className="pt-3 border-t border-zinc-100 space-y-2.5">
                {/* Primary Action Button or Status Badge */}
                {pipeline.isPending ? (
                    <button
                        type="button"
                        onClick={() => onApprove(proposal)}
                        disabled={actionInProgressId === proposal.id}
                        aria-label="Aprovar proposta e gerar contrato"
                        title="Aprovar proposta e gerar contrato"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {actionInProgressId === proposal.id ? (
                            <Loader2 size={14} className="animate-spin text-white" />
                        ) : (
                            <CheckCircle2 size={14} />
                        )}
                        Aprovar Proposta
                    </button>
                ) : pipeline.isApproved && !pipeline.hasContract ? (
                    <button
                        type="button"
                        onClick={() => onGenerateContract(proposal.id)}
                        disabled={actionInProgressId === proposal.id}
                        aria-label="Gerar contrato da proposta"
                        title="Gerar contrato da proposta"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {actionInProgressId === proposal.id ? (
                            <Loader2 size={14} className="animate-spin text-white" />
                        ) : (
                            <FileSignature size={14} />
                        )}
                        Gerar Contrato
                    </button>
                ) : pipeline.awaitingSignature && pipeline.contract?.signatureToken ? (
                    <Link
                        href={`/assinar-contrato/${pipeline.contract.signatureToken}`}
                        target="_blank"
                        aria-label="Abrir tela de assinatura do contrato"
                        title="Abrir tela de assinatura do contrato"
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white py-2.5 text-xs font-bold uppercase tracking-wider transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
                    >
                        <FileSignature size={14} />
                        Abrir Assinatura
                        <ArrowRight size={13} />
                    </Link>
                ) : pipeline.isSigned ? (
                    <div className="w-full text-center py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-700" />
                        Contrato Assinado
                    </div>
                ) : pipeline.isDeclined ? (
                    <div className="w-full text-center py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5">
                        <XCircle size={14} className="text-rose-700" />
                        Proposta Recusada
                    </div>
                ) : null}

                {/* Compact Unified Secondary Actions Toolbar */}
                <div className="flex items-center justify-between gap-1 p-1 bg-zinc-50 border border-zinc-200/90 rounded-xl shadow-xs">
                    {/* Utilitárias: Copiar link, Abrir proposta, WhatsApp */}
                    <div className="flex items-center gap-1">
                        {/* Copy Public Link */}
                        <button
                            type="button"
                            onClick={() => onCopyPublicLink(proposal.publicToken)}
                            disabled={!publicPath}
                            aria-label={publicPath ? "Copiar link público da proposta" : PUBLIC_LINK_UNAVAILABLE}
                            title={publicPath ? "Copiar link público da proposta" : PUBLIC_LINK_UNAVAILABLE}
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                            {copiedToken === proposal.publicToken ? (
                                <Check size={14} className="text-emerald-700" />
                            ) : (
                                <Copy size={14} />
                            )}
                        </button>

                        {/* Open Public Proposal */}
                        {publicPath ? <Link href={publicPath} target="_blank" aria-label="Abrir proposta pública em nova guia" title="Abrir proposta pública em nova guia" className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"><ExternalLink size={14} /></Link> : <button type="button" disabled aria-label={PUBLIC_LINK_UNAVAILABLE} title={PUBLIC_LINK_UNAVAILABLE} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 opacity-45 cursor-not-allowed"><ExternalLink size={14} /></button>}

                        {/* WhatsApp (wa.me) */}
                        {whatsappUrl ? <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Enviar link da proposta pelo WhatsApp"
                            title="Enviar link da proposta pelo WhatsApp"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-emerald-200 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-800 active:bg-emerald-100 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <MessageCircle size={14} />
                        </a> : <button type="button" disabled aria-label={PUBLIC_LINK_UNAVAILABLE} title={PUBLIC_LINK_UNAVAILABLE} className="h-8 w-8 flex items-center justify-center rounded-lg text-zinc-400 opacity-45 cursor-not-allowed"><MessageCircle size={14} /></button>}
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-4 w-[1px] bg-zinc-200 mx-0.5" aria-hidden="true" />

                    {/* Ações de Edição e Destrutiva */}
                    <div className="flex items-center gap-1">
                        {/* Edit */}
                        <Link
                            href={`/admin/proposals/new?edit=${proposal.id}`}
                            aria-label="Editar orçamento da proposta"
                            title="Editar orçamento da proposta"
                            className="h-8 w-8 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-white text-zinc-600 hover:text-zinc-900 active:bg-zinc-100 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                            <Pencil size={14} />
                        </Link>

                        {/* Delete */}
                        <button
                            type="button"
                            onClick={() => onDelete(proposal.id)}
                            disabled={actionInProgressId === proposal.id}
                            aria-label="Excluir proposta comercial"
                            title={actionInProgressId === proposal.id ? "Aguarde a ação em andamento para excluir" : "Excluir proposta comercial"}
                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-600 active:border-rose-800 transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 disabled:bg-rose-400 disabled:border-rose-400 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
