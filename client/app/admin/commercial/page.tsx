"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientAvatar from "@/components/ClientAvatar";
import {
    AlertCircle,
    ArrowUpRight,
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    DollarSign,
    Download,
    ExternalLink,
    FileCheck2,
    FileSignature,
    FileText,
    Loader2,
    Lock,
    Pencil,
    Plus,
    RefreshCw,
    ScrollText,
    Search,
    ShieldCheck,
    Trash2,
    X,
} from "lucide-react";
import {
    approveProposal,
    deleteContract,
    deleteProposal,
    downloadContractPdfById,
    downloadProposalPdf,
    getContracts,
    getClients,
    getOrCreateProposalContract,
    getProposals,
    updatePendingContract,
    updateProposalPaymentDay,
} from "@/lib/api";

interface Proposal {
    id: number;
    clientId?: number | null;
    clientName?: string | null;
    clientEmail?: string | null;
    selectedServices?: any;
    total?: number | string | null;
    status?: string | null;
    proposalType?: string | null;
    paymentDay?: number | null;
    publicToken?: string | null;
    acceptedAt?: string | null;
    declinedAt?: string | null;
    approvedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    client?: {
        id?: number;
        name?: string;
        email?: string;
        phone?: string;
        document?: string;
        photoUrl?: string | null;
    } | null;
}

interface Contract {
    id: number;
    clientId?: number | null;
    proposalId?: number | null;
    clientName?: string | null;
    scope?: string | null;
    additionalScope?: string | null;
    observation?: string | null;
    monthlyValue?: number | string | null;
    durationMonths?: number | string | null;
    paymentDay?: number | string | null;
    status?: string | null;
    signatureToken?: string | null;
    signedAt?: string | null;
    signedName?: string | null;
    signedDocument?: string | null;
    contractDate?: string | null;
    createdAt?: string | null;
    client?: {
        id?: number;
        name?: string;
        email?: string;
        phone?: string;
        document?: string;
        photoUrl?: string | null;
    } | null;
}

interface Client {
    id: number;
    name: string;
    email?: string | null;
    photoUrl?: string | null;
}

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
    empresarial: "Empresarial",
    casamento: "Casamento",
    "15anos": "15 Anos",
    aniversario: "Aniversário",
    cha_revelacao: "Chá Revelação",
    cha_fralda: "Chá de Fraldas",
};

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

const formatCpfCnpj = (value?: string | null) => {
    if (!value) return "";
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length === 11) {
        return digits
            .replace(/^(\d{3})(\d)/, "$1.$2")
            .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
    }
    if (digits.length === 14) {
        return digits
            .replace(/^(\d{2})(\d)/, "$1.$2")
            .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4")
            .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
    }
    return value;
};

const normalizeText = (value: unknown) =>
    String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

const getClientDisplayName = (proposal: Proposal) => {
    const name = proposal.client?.name || proposal.clientName;
    return name && name.trim() ? name.trim() : "Cliente não informado";
};

const getProposalTypeDisplay = (proposal: Proposal) => {
    if (proposal.proposalType && PROPOSAL_TYPE_LABELS[proposal.proposalType]) {
        return PROPOSAL_TYPE_LABELS[proposal.proposalType];
    }
    if (proposal.proposalType) {
        return proposal.proposalType.charAt(0).toUpperCase() + proposal.proposalType.slice(1);
    }
    return "Comercial";
};

type WorkspaceTab = "proposals" | "contracts";
type ProposalFilterStatus = "ALL" | "PENDING" | "APPROVED" | "DECLINED";
type ContractFilterStatus = "ALL" | "PENDING" | "SIGNED";

const PAYMENT_DAY_PRESETS = [5, 10, 15, 20, 25, 30];

export default function CommercialHubPage() {
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Active Tab & Filters
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("proposals");
    const [searchQuery, setSearchQuery] = useState("");
    const [proposalFilter, setProposalFilter] = useState<ProposalFilterStatus>("ALL");
    const [contractFilter, setContractFilter] = useState<ContractFilterStatus>("ALL");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);

    // Action In-Progress States
    const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);
    const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);
    const [downloadingProposalId, setDownloadingProposalId] = useState<number | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Feedback Toast / Alert
    const [feedbackAlert, setFeedbackAlert] = useState<{
        type: "success" | "error" | "info";
        message: string;
    } | null>(null);

    const [proposalNeedingClient, setProposalNeedingClient] = useState<Proposal | null>(null);
    const [selectedContractClientId, setSelectedContractClientId] = useState("");

    // Contract Edit Modal State
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [editingProposalPayment, setEditingProposalPayment] = useState<Proposal | null>(null);
    const [editPaymentDay, setEditPaymentDay] = useState<number>(25);
    const [editObservation, setEditObservation] = useState<string>("");
    const [editAdditionalScope, setEditAdditionalScope] = useState<string>("");
    const [savingContract, setSavingContract] = useState(false);
    const [savingProposalPayment, setSavingProposalPayment] = useState(false);

    // Confirmation Modal for Deletions
    const [deleteModal, setDeleteModal] = useState<{
        type: "proposal" | "contract";
        id: number;
        title: string;
        description?: string;
    } | null>(null);
    const [deletingItem, setDeletingItem] = useState(false);

    // Reset pagination when changing filters or tab
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, proposalFilter, contractFilter, itemsPerPage]);

    // Clear feedback alert after 4 seconds
    useEffect(() => {
        if (!feedbackAlert) return;
        const timer = setTimeout(() => {
            setFeedbackAlert(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [feedbackAlert]);

    // Data Loading
    const loadData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            let hadLoadError = false;
            const [proposalsRes, contractsRes, clientsRes] = await Promise.all([
                getProposals().catch((err) => {
                    console.warn("Falha ao carregar propostas:", err);
                    hadLoadError = true;
                    return [];
                }),
                getContracts().catch((err) => {
                    console.warn("Falha ao carregar contratos:", err);
                    hadLoadError = true;
                    return [];
                }),
                getClients().catch((err) => {
                    console.warn("Falha ao carregar clientes:", err);
                    hadLoadError = true;
                    return [];
                }),
            ]);

            setProposals(Array.isArray(proposalsRes) ? proposalsRes : []);
            setContracts(Array.isArray(contractsRes) ? contractsRes : []);
            setClients(Array.isArray(clientsRes) ? clientsRes : []);
            if (hadLoadError) {
                setFeedbackAlert({
                    type: "error",
                    message: "Parte dos dados comerciais não carregou. Confira a conexão e tente atualizar.",
                });
            }
        } catch (error) {
            console.error("Erro ao sincronizar Comercial:", error);
            setFeedbackAlert({
                type: "error",
                message: "Não foi possível sincronizar os dados comerciais com o servidor.",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const refreshOnReturn = () => {
            if (document.visibilityState === "visible") loadData(true);
        };
        document.addEventListener("visibilitychange", refreshOnReturn);
        return () => document.removeEventListener("visibilitychange", refreshOnReturn);
    }, [loadData]);

    // Match proposal to contract
    const getMatchedContract = useCallback(
        (proposal: Proposal): Contract | undefined => {
            return (
                contracts.find((c) => c.proposalId === proposal.id) ||
                (proposal.clientId ? contracts.find((c) => c.clientId === proposal.clientId) : undefined)
            );
        },
        [contracts]
    );

    // Summary Metrics
    const metrics = useMemo(() => {
        const isProposalSigned = (proposal: Proposal) =>
            contracts.some(
                (contract) => Number(contract.proposalId) === Number(proposal.id) && Boolean(contract.signedAt)
            );
        const activeProposals = proposals.filter((proposal) => !isProposalSigned(proposal));
        const totalProposals = activeProposals.length;
        let pendingApprovalCount = 0;
        let approvedProposalsCount = 0;
        let declinedProposalsCount = 0;
        let convertedRevenue = 0;

        proposals.forEach((p) => {
            const isSigned = isProposalSigned(p);
            const isApproved =
                p.status === "APPROVED" ||
                Boolean(p.approvedAt) ||
                Boolean(p.acceptedAt) ||
                isSigned;

            const isPending =
                p.status === "PENDING" || (!p.status && !p.approvedAt && !p.acceptedAt && !p.declinedAt);

            if (isPending) {
                pendingApprovalCount += 1;
            }

            if (p.status === "DECLINED" || Boolean(p.declinedAt)) {
                declinedProposalsCount += 1;
            }

            if (isApproved) {
                if (!isSigned) approvedProposalsCount += 1;
                const value = typeof p.total === "number" ? p.total : Number(p.total || 0);
                if (Number.isFinite(value) && value > 0) {
                    convertedRevenue += value;
                }
            }
        });

        const pendingContractsCount = contracts.filter((c) => !c.signedAt).length;
        const signedContractsCount = contracts.filter((c) => Boolean(c.signedAt)).length;

        return {
            totalProposals,
            pendingApprovalCount,
            approvedProposalsCount,
            declinedProposalsCount,
            pendingContractsCount,
            signedContractsCount,
            convertedRevenue,
        };
    }, [proposals, contracts]);

    // Filtered Proposals
    const filteredProposals = useMemo(() => {
        const query = normalizeText(searchQuery);

        return proposals.filter((proposal) => {
            const signedContract = contracts.find(
                (contract) => Number(contract.proposalId) === Number(proposal.id) && Boolean(contract.signedAt)
            );
            if (signedContract) return false;

            const clientName = normalizeText(proposal.client?.name || proposal.clientName);
            const clientEmail = normalizeText(proposal.client?.email || proposal.clientEmail);
            const clientDoc = normalizeText(proposal.client?.document);
            const proposalType = normalizeText(proposal.proposalType);

            const matchesQuery =
                !query ||
                clientName.includes(query) ||
                clientEmail.includes(query) ||
                clientDoc.includes(query) ||
                proposalType.includes(query);

            if (!matchesQuery) return false;

            const matchedContract = getMatchedContract(proposal);
            const isSigned = Boolean(matchedContract?.signedAt);
            const isApproved =
                proposal.status === "APPROVED" ||
                Boolean(proposal.approvedAt) ||
                Boolean(proposal.acceptedAt) ||
                isSigned;
            const isDeclined = proposal.status === "DECLINED" || Boolean(proposal.declinedAt);
            const isPending =
                !isApproved && !isDeclined && (proposal.status === "PENDING" || !proposal.status);

            if (proposalFilter === "PENDING") return isPending;
            if (proposalFilter === "APPROVED") return isApproved && !isSigned;
            if (proposalFilter === "DECLINED") return isDeclined;

            return true;
        });
    }, [proposals, contracts, searchQuery, proposalFilter, getMatchedContract]);

    // Filtered Contracts
    const filteredContracts = useMemo(() => {
        const query = normalizeText(searchQuery);

        return contracts.filter((contract) => {
            const clientName = normalizeText(contract.client?.name || contract.clientName);
            const clientEmail = normalizeText(contract.client?.email);
            const clientDoc = normalizeText(contract.client?.document);
            const scope = normalizeText(contract.scope);
            const signedName = normalizeText(contract.signedName);

            const matchesQuery =
                !query ||
                clientName.includes(query) ||
                clientEmail.includes(query) ||
                clientDoc.includes(query) ||
                scope.includes(query) ||
                signedName.includes(query);

            if (!matchesQuery) return false;

            const isSigned = Boolean(contract.signedAt);
            if (contractFilter === "PENDING") return !isSigned;
            if (contractFilter === "SIGNED") return isSigned;

            return true;
        });
    }, [contracts, searchQuery, contractFilter]);

    // Paginated datasets
    const paginatedProposals = useMemo(() => {
        if (itemsPerPage === 0) return filteredProposals;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProposals.slice(start, start + itemsPerPage);
    }, [filteredProposals, currentPage, itemsPerPage]);

    const paginatedContracts = useMemo(() => {
        if (itemsPerPage === 0) return filteredContracts;
        const start = (currentPage - 1) * itemsPerPage;
        return filteredContracts.slice(start, start + itemsPerPage);
    }, [filteredContracts, currentPage, itemsPerPage]);

    const totalPages = itemsPerPage === 0
        ? 1
        : Math.ceil(
            (activeTab === "proposals" ? filteredProposals.length : filteredContracts.length) / itemsPerPage
        ) || 1;

    // Copy to clipboard helper
    const handleCopy = async (text: string, label: string) => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                textarea.remove();
            }
            setCopiedToken(text);
            setTimeout(() => setCopiedToken(null), 2200);
            setFeedbackAlert({
                type: "success",
                message: `${label} copiado com sucesso.`,
            });
        } catch {
            setFeedbackAlert({
                type: "error",
                message: "Não foi possível copiar o link.",
            });
        }
    };

    // Approve Proposal & Prepare Signature
    const handleApproveProposal = async (proposal: Proposal) => {
        try {
            setActionInProgressId(proposal.id);
            const result = await approveProposal(proposal.id);
            const updatedProposal = result?.proposal;

            setProposals((prev) =>
                prev.map((p) =>
                    p.id === proposal.id
                        ? {
                              ...p,
                              ...(updatedProposal || {}),
                              status: "APPROVED",
                              approvedAt:
                                  updatedProposal?.approvedAt ||
                                  p.approvedAt ||
                                  new Date().toISOString(),
                          }
                        : p
                )
            );

            if (result?.contract) {
                setContracts((prev) => {
                    const filtered = prev.filter((c) => c.id !== result.contract.id);
                    return [result.contract, ...filtered];
                });
                setFeedbackAlert({
                    type: "success",
                    message: "Proposta aprovada e link de assinatura pronto.",
                });
            } else {
                setFeedbackAlert({
                    type: "info",
                    message: "Proposta aprovada. Vincule um cliente para preparar a assinatura.",
                });
                await loadData(true);
            }
        } catch (error: any) {
            console.error("Erro ao aprovar proposta:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Não foi possível aprovar a proposta.",
            });
        } finally {
            setActionInProgressId(null);
        }
    };

    // Quick Generate / Link Contract
    const handleGenerateContract = async (proposalId: number, selectedClientId?: number) => {
        const proposal = proposals.find((item) => item.id === proposalId);
        const clientId = selectedClientId || proposal?.clientId || proposal?.client?.id;

        if (!clientId) {
            if (proposal) {
                const email = proposal.client?.email || proposal.clientEmail;
                const matchingClient = email
                    ? clients.find((client) => client.email?.trim().toLowerCase() === email.trim().toLowerCase())
                    : undefined;
                setSelectedContractClientId(matchingClient ? String(matchingClient.id) : "");
                setProposalNeedingClient(proposal);
            }
            return;
        }

        try {
            setActionInProgressId(proposalId);
            const result = await getOrCreateProposalContract(proposalId, { clientId });
            if (result?.contract) {
                setContracts((prev) => {
                    const filtered = prev.filter((c) => c.id !== result.contract.id);
                    return [result.contract, ...filtered];
                });
                setProposals((prev) => prev.map((item) => item.id === proposalId
                    ? {
                        ...item,
                        clientId: result.contract.clientId,
                        clientName: result.contract.client?.name || item.clientName,
                        clientEmail: result.contract.client?.email || item.clientEmail,
                        client: result.contract.client || item.client,
                    }
                    : item));
                setProposalNeedingClient(null);
                setFeedbackAlert({
                    type: "success",
                    message: "Contrato gerado e pronto para assinatura digital.",
                });
            } else {
                await loadData(true);
            }
        } catch (error: any) {
            console.error("Erro ao gerar contrato:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Não foi possível gerar o contrato.",
            });
        } finally {
            setActionInProgressId(null);
        }
    };

    const handleConfirmGenerateContract = () => {
        if (!proposalNeedingClient || !selectedContractClientId) return;
        void handleGenerateContract(proposalNeedingClient.id, Number(selectedContractClientId));
    };

    // Download Contract PDF
    const handleDownloadContractPdf = async (contractId: number, clientName?: string | null) => {
        try {
            setDownloadingContractId(contractId);
            const blob = await downloadContractPdfById(contractId);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `contrato_${(clientName || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
            setFeedbackAlert({
                type: "success",
                message: "Download do contrato iniciado.",
            });
        } catch (err) {
            console.error("Erro ao baixar PDF do contrato:", err);
            setFeedbackAlert({
                type: "error",
                message: "Não foi possível baixar o PDF do contrato.",
            });
        } finally {
            setDownloadingContractId(null);
        }
    };

    // Download Proposal PDF
    const handleDownloadProposalPdf = async (proposal: Proposal, fallbackClientName?: string | null) => {
        try {
            setDownloadingProposalId(proposal.id);
            const clientName =
                proposal.client?.name ||
                proposal.clientName ||
                fallbackClientName ||
                "Cliente";

            const services = (() => {
                if (!proposal.selectedServices) return [];
                if (Array.isArray(proposal.selectedServices)) return proposal.selectedServices;
                if (typeof proposal.selectedServices === "string") {
                    try {
                        const parsed = JSON.parse(proposal.selectedServices);
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                }
                return [];
            })();

            const total =
                typeof proposal.total === "number"
                    ? proposal.total
                    : Number(proposal.total) || 0;

            const proposalType = proposal.proposalType || "empresarial";

            const blob = await downloadProposalPdf({
                clientName,
                selectedServices: services,
                total,
                proposalType,
            });

            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `proposta_${clientName.replace(/\s+/g, "_").toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);

            setFeedbackAlert({
                type: "success",
                message: "Download da proposta iniciado.",
            });
        } catch (err) {
            console.error("Erro ao baixar PDF da proposta:", err);
            setFeedbackAlert({
                type: "error",
                message: "Não foi possível baixar o PDF da proposta.",
            });
        } finally {
            setDownloadingProposalId(null);
        }
    };

    // Open Contract Edit Modal (Payment Day & Notes)
    const handleOpenEditContract = (contract: Contract) => {
        setEditingContract(contract);
        setEditPaymentDay(Number(contract.paymentDay) || 25);
        setEditObservation(contract.observation || "");
        setEditAdditionalScope(contract.additionalScope || "");
    };

    const handleOpenEditProposalPayment = (proposal: Proposal) => {
        setEditingProposalPayment(proposal);
        setEditPaymentDay(Number(proposal.paymentDay) || 25);
    };

    const handleSaveProposalPayment = async () => {
        if (!editingProposalPayment) return;
        if (!Number.isInteger(editPaymentDay) || editPaymentDay < 1 || editPaymentDay > 31) {
            setFeedbackAlert({ type: "error", message: "O dia de vencimento deve estar entre 1 e 31." });
            return;
        }
        try {
            setSavingProposalPayment(true);
            const result = await updateProposalPaymentDay(editingProposalPayment.id, editPaymentDay);
            setProposals((prev) => prev.map((proposal) => proposal.id === editingProposalPayment.id
                ? { ...proposal, paymentDay: result.proposal.paymentDay }
                : proposal));
            if (result.contract) {
                setContracts((prev) => prev.map((contract) => contract.id === result.contract.id
                    ? { ...contract, ...result.contract }
                    : contract));
            }
            setEditingProposalPayment(null);
            setFeedbackAlert({ type: "success", message: "Dia de pagamento da proposta atualizado." });
        } catch (error) {
            const apiError = error as { response?: { data?: { error?: string } } };
            setFeedbackAlert({
                type: "error",
                message: apiError.response?.data?.error || "Não foi possível alterar o dia de pagamento.",
            });
        } finally {
            setSavingProposalPayment(false);
        }
    };

    // Save Contract Changes
    const handleSaveContract = async () => {
        if (!editingContract) return;

        if (editPaymentDay < 1 || editPaymentDay > 31) {
            setFeedbackAlert({
                type: "error",
                message: "O dia de vencimento deve estar entre 1 e 31.",
            });
            return;
        }

        try {
            setSavingContract(true);
            const updated = await updatePendingContract(editingContract.id, {
                paymentDay: editPaymentDay,
                observation: editObservation.trim() || null,
                additionalScope: editAdditionalScope.trim() || null,
            });

            setContracts((prev) =>
                prev.map((c) => (c.id === editingContract.id ? { ...c, ...updated } : c))
            );

            setFeedbackAlert({
                type: "success",
                message: "Dados do contrato atualizados com sucesso.",
            });
            setEditingContract(null);
        } catch (error: any) {
            console.error("Erro ao salvar contrato:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Erro ao atualizar dados do contrato.",
            });
        } finally {
            setSavingContract(false);
        }
    };

    // Confirm Delete Action
    const handleExecuteDelete = async () => {
        if (!deleteModal) return;

        try {
            setDeletingItem(true);
            if (deleteModal.type === "proposal") {
                await deleteProposal(deleteModal.id);
                setProposals((prev) => prev.filter((p) => p.id !== deleteModal.id));
                setFeedbackAlert({
                    type: "success",
                    message: "Proposta excluída com sucesso.",
                });
            } else {
                await deleteContract(deleteModal.id);
                setContracts((prev) => prev.filter((c) => c.id !== deleteModal.id));
                setFeedbackAlert({
                    type: "success",
                    message: "Contrato excluído com sucesso.",
                });
            }
            setDeleteModal(null);
        } catch (error: any) {
            console.error("Erro ao excluir item:", error);
            setFeedbackAlert({
                type: "error",
                message: error?.response?.data?.error || "Erro ao processar exclusão.",
            });
        } finally {
            setDeletingItem(false);
        }
    };

    return (
        <div className="admin-page-stack commercial-hub space-y-6 pb-16">
            <style jsx global>{`
                .admin-shell .commercial-hub .commercial-signature-link,
                .admin-shell .commercial-hub .commercial-signature-link * {
                    color: #ffffff !important;
                }

                .admin-shell .commercial-hub button[class*="bg-[#0044ff]"],
                .admin-shell .commercial-hub button[class*="bg-[#0044ff]"] *,
                .admin-shell .commercial-hub a[class*="bg-[#0044ff]"],
                .admin-shell .commercial-hub a[class*="bg-[#0044ff]"] *,
                .admin-shell .commercial-hub button[class*="bg-[#0758d8]"],
                .admin-shell .commercial-hub button[class*="bg-[#0758d8]"] *,
                .admin-shell .commercial-hub a[class*="bg-[#0758d8]"],
                .admin-shell .commercial-hub a[class*="bg-[#0758d8]"] *,
                .admin-shell .commercial-hub button[class*="bg-blue-"],
                .admin-shell .commercial-hub button[class*="bg-blue-"] *,
                .admin-shell .commercial-hub a[class*="bg-blue-"],
                .admin-shell .commercial-hub a[class*="bg-blue-"] * {
                    color: #ffffff !important;
                }

                .admin-shell .commercial-hub button:disabled[class*="bg-[#0044ff]"],
                .admin-shell .commercial-hub button:disabled[class*="bg-[#0044ff]"] *,
                .admin-shell .commercial-hub button:disabled[class*="bg-[#0758d8]"],
                .admin-shell .commercial-hub button:disabled[class*="bg-[#0758d8]"] *,
                .admin-shell .commercial-hub button:disabled[class*="bg-blue-"],
                .admin-shell .commercial-hub button:disabled[class*="bg-blue-"] * {
                    color: #71717a !important;
                }

                .admin-shell .commercial-hub .commercial-delete-action,
                .admin-shell .commercial-hub .commercial-delete-action * {
                    color: #a51d35 !important;
                }
            `}</style>
            {}
            <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0758d8]">Relacionamento e receita</p>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">Central Comercial</h1>
                        <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                            Acompanhe oportunidades, valores e assinaturas em um único fluxo.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => loadData(true)}
                            disabled={refreshing || loading}
                            className="inline-flex h-9.5 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950 active:scale-[0.98] transition-all disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            title="Atualizar dados"
                            aria-label="Atualizar dados"
                        >
                            <RefreshCw
                                size={15}
                                className={refreshing ? "animate-spin text-[#0044ff]" : "text-zinc-700"}
                            />
                            <span className="hidden sm:inline">Atualizar</span>
                        </button>

                        <Link
                            href="/admin/proposals/new"
                            className="inline-flex h-9.5 items-center justify-center gap-2 rounded-xl bg-[#0044ff] px-4 text-sm font-semibold text-white shadow-2xs hover:bg-[#0039d6] active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0044ff]/40"
                        >
                            <Plus size={16} strokeWidth={2.5} />
                            <span>Criar proposta</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Live Feedback Toast Notification */}
            {feedbackAlert && (
                <div
                    role="alert"
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xs transition-all ${
                        feedbackAlert.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : feedbackAlert.type === "error"
                            ? "border-rose-200 bg-rose-50 text-rose-900"
                            : "border-blue-200 bg-blue-50 text-blue-900"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {feedbackAlert.type === "success" && (
                            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                        )}
                        {feedbackAlert.type === "error" && (
                            <AlertCircle size={18} className="shrink-0 text-rose-600" />
                        )}
                        {feedbackAlert.type === "info" && (
                            <FileText size={18} className="shrink-0 text-blue-600" />
                        )}
                        <span>{feedbackAlert.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackAlert(null)}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-black/5 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
                        title="Fechar notificação"
                        aria-label="Fechar notificação"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Consolidated Workspace Panel */}
            <section className="rounded-3xl border border-zinc-200 bg-white/70 p-4 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-zinc-950">Registros e próximos passos</h2>
                        <p className="mt-0.5 text-sm text-zinc-500">Filtre a operação por etapa e encontre cada cliente com rapidez.</p>
                    </div>
                    <p className="text-xs font-medium text-zinc-500" aria-live="polite">
                        {activeTab === "proposals"
                            ? `${filteredProposals.length} ${filteredProposals.length === 1 ? "proposta" : "propostas"}`
                            : `${filteredContracts.length} ${filteredContracts.length === 1 ? "contrato" : "contratos"}`}
                    </p>
                </div>
                {/* Unified Control Bar */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                    {/* Top Row: Segmented Switcher & Search */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4">
                        {/* One workspace with two focused work modes */}
                        <div className="inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-zinc-200 bg-[#f4f3f0] p-1" role="tablist" aria-label="Modo de trabalho comercial">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "proposals"}
                                onClick={() => setActiveTab("proposals")}
                                className={`group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    activeTab === "proposals"
                                        ? "bg-white text-zinc-950 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900"
                                }`}
                            >
                                <FileText size={16} className={activeTab === "proposals" ? "text-[#0758d8]" : "text-zinc-400 group-hover:text-zinc-600"} />
                                <span>Oportunidades</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                                        activeTab === "proposals"
                                            ? "bg-[#edf4ff] text-[#0758d8]"
                                            : "bg-white/70 text-zinc-500"
                                    }`}
                                >
                                    {metrics.totalProposals}
                                </span>
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === "contracts"}
                                onClick={() => setActiveTab("contracts")}
                                className={`group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                    activeTab === "contracts"
                                        ? "bg-white text-zinc-950 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-900"
                                }`}
                            >
                                <ScrollText size={16} className={activeTab === "contracts" ? "text-[#0758d8]" : "text-zinc-400 group-hover:text-zinc-600"} />
                                <span>Formalização</span>
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${
                                        activeTab === "contracts"
                                            ? "bg-[#edf4ff] text-[#0758d8]"
                                            : "bg-white/70 text-zinc-500"
                                    }`}
                                >
                                    {contracts.length}
                                </span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72 md:w-80">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                            <input
                                type="text"
                                aria-label={activeTab === "proposals" ? "Buscar propostas" : "Buscar contratos"}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={
                                    activeTab === "proposals"
                                        ? "Buscar cliente, documento..."
                                        : "Buscar contratante, escopo..."
                                }
                                className="h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all focus:border-[#0044ff] focus:ring-2 focus:ring-[#0044ff]/10 shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 p-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
                                    title="Limpar busca"
                                    aria-label="Limpar busca"
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Bottom Row: Filter Chips & Page Size */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {activeTab === "proposals" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setProposalFilter("ALL")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            proposalFilter === "ALL"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Todas ({metrics.totalProposals})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProposalFilter("PENDING")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            proposalFilter === "PENDING"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Pendentes ({metrics.pendingApprovalCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProposalFilter("APPROVED")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            proposalFilter === "APPROVED"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Aprovadas ({metrics.approvedProposalsCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setProposalFilter("DECLINED")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            proposalFilter === "DECLINED"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Recusadas ({metrics.declinedProposalsCount})
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setContractFilter("ALL")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            contractFilter === "ALL"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Todos ({contracts.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setContractFilter("PENDING")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            contractFilter === "PENDING"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Aguardando Assinatura ({metrics.pendingContractsCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setContractFilter("SIGNED")}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                            contractFilter === "SIGNED"
                                                ? "bg-zinc-900 text-white shadow-2xs border border-zinc-900"
                                                : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950"
                                        }`}
                                    >
                                        Assinados ({metrics.signedContractsCount})
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Page Size Selector */}
                        <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                            <span className="text-xs sm:text-sm text-zinc-400">Exibir:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="h-8.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-800 shadow-2xs outline-none focus:border-[#0044ff] focus:ring-1 focus:ring-[#0044ff]"
                            >
                                <option value={10}>10 por página</option>
                                <option value={20}>20 por página</option>
                                <option value={50}>50 por página</option>
                                <option value={0}>Todos</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Workspace Cards Section */}
                {loading ? (
                    <div className="flex h-64 flex-col items-center justify-center gap-3">
                        <Loader2 size={24} className="animate-spin text-[#0044ff]" />
                        <p className="text-sm font-medium text-zinc-400">
                            Carregando dados comerciais...
                        </p>
                    </div>
                ) : activeTab === "proposals" ? (
                    /* Proposals View */
                    filteredProposals.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-zinc-300 bg-white py-16 text-center shadow-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-2xs">
                                <FileText size={22} />
                            </div>
                            <h3 className="mt-3 text-base font-semibold text-zinc-900">
                                Nenhuma proposta encontrada
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500 max-w-sm mx-auto">
                                {searchQuery || proposalFilter !== "ALL"
                                    ? "Nenhum orçamento corresponde aos filtros selecionados."
                                    : "Cadastre novas propostas para iniciar o ciclo comercial."}
                            </p>
                            <div className="mt-4">
                                {searchQuery || proposalFilter !== "ALL" ? (
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(""); setProposalFilter("ALL"); }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                    >
                                        Limpar busca e filtros
                                    </button>
                                ) : (
                                    <Link
                                        href="/admin/proposals/new"
                                        className="inline-flex items-center gap-2 rounded-xl bg-[#0044ff] px-4 py-2 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-[#0039d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0044ff]/40"
                                    >
                                        <Plus size={16} />
                                        Criar proposta
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                            {paginatedProposals.map((proposal) => {
                                const clientName = getClientDisplayName(proposal);
                                const clientEmail = proposal.client?.email || proposal.clientEmail;
                                const matchedContract = getMatchedContract(proposal);
                                const isSigned = Boolean(matchedContract?.signedAt);
                                const isApproved = proposal.status === "APPROVED" || Boolean(proposal.approvedAt) || Boolean(proposal.acceptedAt) || isSigned;
                                const isDeclined = proposal.status === "DECLINED" || Boolean(proposal.declinedAt);
                                const isPending = !isApproved && !isDeclined && (proposal.status === "PENDING" || !proposal.status);
                                const isProcessing = actionInProgressId === proposal.id;
                                const isDownloadingProposal = downloadingProposalId === proposal.id;
                                const hasSignatureToken = Boolean(matchedContract?.signatureToken);
                                const paymentDay = matchedContract ? Number(matchedContract.paymentDay) || 25 : Number(proposal.paymentDay) || null;

                                return (
                                    <article key={proposal.id} className="group grid gap-4 px-4 py-4 transition-colors hover:bg-[#fbfaf7] sm:px-5 lg:grid-cols-[minmax(240px,1.5fr)_minmax(150px,.8fr)_minmax(190px,1fr)] lg:items-center lg:gap-6">
                                        <div className="min-w-0">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <ClientAvatar name={clientName} photoUrl={proposal.client?.photoUrl} size="sm" />
                                                <h3 className="truncate text-base font-semibold tracking-tight text-zinc-950" title={clientName}>{clientName}</h3>
                                                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isSigned ? "bg-emerald-50 text-emerald-800" : isDeclined ? "bg-rose-50 text-rose-700" : isApproved ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"}`}>
                                                    {isSigned ? "Assinada" : isDeclined ? "Recusada" : isApproved ? "Aprovada" : "Aguardando"}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-zinc-500" title={clientEmail || undefined}>{clientEmail || getProposalTypeDisplay(proposal)}</p>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 lg:block">
                                            <div>
                                                <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-950">{formatMoney(proposal.total)}</p>
                                                <p className="mt-0.5 text-xs text-zinc-500">{getProposalTypeDisplay(proposal)} <span className="px-1 text-zinc-300">·</span> {paymentDay ? `Vence dia ${paymentDay}` : formatDate(proposal.createdAt)}</p>
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 items-center gap-2 lg:justify-end">
                                            {isPending ? (
                                                <button type="button" onClick={() => handleApproveProposal(proposal)} disabled={isProcessing} className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0758d8] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#064bb8] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758d8] lg:flex-none">
                                                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <FileSignature size={15} />}
                                                    <span className="truncate">Preparar assinatura</span>
                                                </button>
                                            ) : isApproved && !matchedContract ? (
                                                <button type="button" onClick={() => handleGenerateContract(proposal.id)} disabled={isProcessing} className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0758d8] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#064bb8] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758d8] lg:flex-none">
                                                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <FileSignature size={15} />}
                                                    <span className="truncate">Gerar contrato</span>
                                                </button>
                                            ) : hasSignatureToken ? (
                                                <a href={`/assinar-contrato/${matchedContract?.signatureToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0758d8] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#064bb8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758d8] lg:flex-none">
                                                    <FileSignature size={15} /><span>Assinatura</span><ArrowUpRight size={14} />
                                                </a>
                                            ) : proposal.publicToken ? (
                                                <a href={`/proposta/${proposal.publicToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 lg:flex-none">
                                                    <FileText size={15} /><span>Ver proposta</span><ExternalLink size={13} />
                                                </a>
                                            ) : (
                                                <span className="flex-1 text-right text-sm text-zinc-400 lg:flex-none">Sem ação pendente</span>
                                            )}

                                            <details className="relative shrink-0">
                                                <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400">Mais</summary>
                                                <div className="absolute right-0 top-12 z-20 grid w-52 gap-1 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl">
                                                    <button type="button" onClick={() => handleDownloadProposalPdf(proposal, clientName)} disabled={isDownloadingProposal} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:text-zinc-400">
                                                        {isDownloadingProposal ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Baixar PDF
                                                    </button>
                                                    {(hasSignatureToken || proposal.publicToken) && <button type="button" onClick={() => handleCopy(`${window.location.origin}${hasSignatureToken ? `/assinar-contrato/${matchedContract?.signatureToken}` : `/proposta/${proposal.publicToken}`}`, hasSignatureToken ? "Link de assinatura" : "Link da proposta")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50">
                                                        {copiedToken?.includes(hasSignatureToken ? matchedContract?.signatureToken || "" : proposal.publicToken || "") ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} Copiar link
                                                    </button>}
                                                    <Link href={`/admin/proposals/new?edit=${proposal.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"><Pencil size={14} /> Editar oportunidade</Link>
                                                    <button type="button" disabled={isDeclined || isSigned} onClick={() => matchedContract ? handleOpenEditContract(matchedContract) : handleOpenEditProposalPayment(proposal)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"><Calendar size={14} /> Ajustar vencimento</button>
                                                    <button type="button" onClick={() => setDeleteModal({ type: "proposal", id: proposal.id, title: `Proposta de ${clientName}` })} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"><Trash2 size={14} /> Excluir oportunidade</button>
                                                </div>
                                            </details>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                    )
                ) : (
                    /* Contracts View */
                    filteredContracts.length === 0 ? (
                        <div className="mt-6 rounded-2xl border border-zinc-300 bg-white py-16 text-center shadow-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-400 shadow-2xs">
                                <ScrollText size={22} />
                            </div>
                            <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                                Nenhum contrato encontrado
                            </h3>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">
                                {searchQuery || contractFilter !== "ALL"
                                    ? "Nenhum contrato corresponde aos filtros selecionados."
                                    : "Gere contratos a partir das propostas aprovadas para gerenciar minutas e assinaturas."}
                            </p>
                            {(searchQuery || contractFilter !== "ALL") && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(""); setContractFilter("ALL"); }}
                                    className="mt-4 inline-flex items-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-2xs transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                >
                                    Limpar busca e filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {paginatedContracts.map((contract) => {
                                const clientName =
                                    contract.client?.name ||
                                    contract.clientName ||
                                    "Contratante não informado";
                                const isSigned = Boolean(contract.signedAt);
                                const hasToken = Boolean(contract.signatureToken);
                                const canSign = hasToken && !isSigned;
                                const isDownloadingContract = downloadingContractId === contract.id;
                                const linkedProposal =
                                    contract.proposalId != null
                                        ? proposals.find((p) => Number(p.id) === Number(contract.proposalId)) || null
                                        : null;
                                const isDownloadingProposal = linkedProposal
                                    ? downloadingProposalId === linkedProposal.id
                                    : false;

                                return (
                                    <div
                                        key={contract.id}
                                        className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md sm:p-5 min-w-0 max-w-full overflow-hidden"
                                    >
                                        {/* Card Top & Information */}
                                        <div className="space-y-4">
                                            {/* Header: Client & Status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <h3
                                                        className="font-bold text-zinc-950 text-sm sm:text-base truncate"
                                                        title={clientName}
                                                    >
                                                        {clientName}
                                                    </h3>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                                                        {contract.client?.email && (
                                                            <span className="truncate max-w-[170px]" title={contract.client.email}>
                                                                {contract.client.email}
                                                            </span>
                                                        )}
                                                        {contract.client?.document && (
                                                            <span className="font-mono text-[11px] text-zinc-400">
                                                                {formatCpfCnpj(contract.client.document)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Single Status Badge (Pendente / Concluído) */}
                                                <div className="shrink-0">
                                                    {isSigned ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                                            <CheckCircle2 size={12} /> Concluído
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                                                            <Clock size={12} /> Pendente
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Scope & Contract details directly on card */}
                                            <div className="pt-3.5 border-t border-zinc-200 space-y-2.5">
                                                <div>
                                                    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Escopo do contrato</span>
                                                    <p
                                                        className="text-xs font-medium leading-5 text-zinc-700"
                                                        title={contract.scope || "Prestação de Serviços Especializados"}
                                                        style={{
                                                            display: "-webkit-box",
                                                            WebkitBoxOrient: "vertical",
                                                            WebkitLineClamp: 2,
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {contract.scope || "Prestação de Serviços Especializados"}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                                        Vigência: <span className="font-medium text-zinc-700">{contract.durationMonths || 6} meses</span>
                                                        {contract.contractDate ? ` · Início: ${contract.contractDate}` : ` · ${formatDate(contract.createdAt)}`}
                                                    </p>
                                                </div>

                                                <div className="flex items-baseline justify-between gap-2 pt-2.5 border-t border-zinc-200">
                                                    <div>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                                                            Mensalidade
                                                        </span>
                                                        <span className="text-lg font-bold text-zinc-950 tabular-nums">
                                                            {formatMoney(contract.monthlyValue)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-800 border border-zinc-300 shadow-2xs">
                                                            <Calendar size={12} className="text-[#0044ff]" />
                                                            Dia {contract.paymentDay || 25}
                                                        </span>
                                                    </div>
                                                </div>

                                                {isSigned && (
                                                    <div className="pt-2.5 border-t border-zinc-200 text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
                                                        <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
                                                        <span className="truncate">
                                                            Assinado {contract.signedName ? `por ${contract.signedName}` : ""} em {formatDate(contract.signedAt)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Actions Footer */}
                                        <div className="mt-4 pt-3 border-t border-zinc-200 w-full min-w-0 max-w-full flex flex-col gap-2">
                                            {/* Workflow actions */}
                                            <div className={`grid w-full min-w-0 gap-1.5 ${canSign || linkedProposal ? "grid-cols-2" : "grid-cols-1"}`}>
                                                {canSign && (
                                                    <a
                                                        href={`/assinar-contrato/${contract.signatureToken}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="commercial-signature-link inline-flex h-8 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-[#0758d8] hover:bg-[#064bb8] text-white border border-[#0758d8] px-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0758d8] whitespace-nowrap"
                                                        title="Abrir tela de assinatura digital"
                                                        aria-label="Abrir assinatura digital"
                                                    >
                                                        <FileSignature size={13} className="shrink-0" />
                                                        <span className="min-w-0 truncate">Abrir assinatura</span>
                                                        <ArrowUpRight size={12} className="shrink-0" />
                                                    </a>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadContractPdf(contract.id, clientName)}
                                                    disabled={isDownloadingContract}
                                                    className="inline-flex h-8 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400 px-2 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors cursor-pointer disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 whitespace-nowrap"
                                                    title="Baixar PDF do contrato"
                                                    aria-label="Baixar PDF do contrato"
                                                >
                                                    {isDownloadingContract ? (
                                                        <Loader2 size={13} className="animate-spin text-zinc-400 shrink-0" />
                                                    ) : (
                                                        <Download size={13} className="text-zinc-700 shrink-0" />
                                                    )}
                                                    <span className="min-w-0 truncate">PDF Contrato</span>
                                                </button>

                                                {linkedProposal && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadProposalPdf(linkedProposal, clientName)}
                                                        disabled={isDownloadingProposal}
                                                        className={`${canSign ? "col-span-2 w-1/2 min-w-[8rem] justify-self-center" : "w-full"} inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors hover:bg-zinc-50 hover:border-zinc-400 cursor-pointer disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 whitespace-nowrap`}
                                                        title="Baixar PDF da proposta vinculada"
                                                        aria-label="Baixar proposta PDF"
                                                    >
                                                        {isDownloadingProposal ? (
                                                            <Loader2 size={13} className="animate-spin text-zinc-400 shrink-0" />
                                                        ) : (
                                                            <Download size={13} className="text-zinc-700 shrink-0" />
                                                        )}
                                                        <span className="min-w-0 truncate">PDF Proposta</span>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Tool actions */}
                                            <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5">
                                                {hasToken && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleCopy(
                                                                `${window.location.origin}/assinar-contrato/${contract.signatureToken}`,
                                                                "Link de assinatura"
                                                            )
                                                        }
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-400 hover:text-zinc-950 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 shrink-0"
                                                        title="Copiar link de assinatura"
                                                        aria-label="Copiar link de assinatura"
                                                    >
                                                        {copiedToken?.includes(contract.signatureToken || "") ? (
                                                            <Check size={14} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                                                        ) : (
                                                            <Copy size={14} className="text-zinc-700 shrink-0" strokeWidth={2} />
                                                        )}
                                                    </button>
                                                )}

                                                {linkedProposal && (
                                                    <Link
                                                        href={`/admin/proposals/new?edit=${linkedProposal.id}`}
                                                        className="inline-flex h-8 w-auto justify-self-start items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400 px-2.5 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 whitespace-nowrap"
                                                        title="Editar dados da proposta vinculada"
                                                        aria-label="Editar proposta"
                                                    >
                                                        <Pencil size={12} className="text-zinc-700 shrink-0" aria-hidden="true" />
                                                        <span className="text-zinc-800 font-semibold">Editar proposta</span>
                                                    </Link>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditContract(contract)}
                                                    className="inline-flex h-8 w-auto items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400 px-2.5 text-xs font-semibold text-zinc-800 shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 whitespace-nowrap"
                                                    title={
                                                        isSigned
                                                            ? "Visualizar detalhes do contrato"
                                                            : "Editar vencimento e termos"
                                                    }
                                                    aria-label={
                                                        isSigned
                                                            ? "Visualizar detalhes do contrato"
                                                            : "Editar vencimento e termos do contrato"
                                                    }
                                                >
                                                    <Pencil size={12} className="text-zinc-700 shrink-0" aria-hidden="true" />
                                                    <span className="text-zinc-800 font-semibold">{isSigned ? "Detalhes" : "Ajustar"}</span>
                                                </button>

                                                {!linkedProposal && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteModal({
                                                                type: "contract",
                                                                id: contract.id,
                                                                title: `Contrato de ${clientName}`,
                                                                description: "Cobranças existentes serão mantidas, mas ficarão sem vínculo com este contrato. O registro da assinatura digital será removido, se existir.",
                                                            })
                                                        }
                                                        className="commercial-delete-action inline-flex h-8 w-auto items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-xs font-semibold text-rose-700 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 whitespace-nowrap"
                                                        title="Excluir contrato"
                                                        aria-label="Excluir contrato"
                                                    >
                                                        <Trash2 size={13} className="shrink-0" aria-hidden="true" />
                                                        <span className="font-semibold">Excluir contrato</span>
                                                    </button>
                                                )}

                                            </div>

                                            {/* Destructive actions stay together, apart from editing and downloads. */}
                                            {linkedProposal && <div className="grid w-full min-w-0 grid-cols-2 gap-1.5">
                                                {linkedProposal && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDeleteModal({
                                                                type: "proposal",
                                                                id: linkedProposal.id,
                                                                title: `Proposta de ${clientName}`,
                                                                description: "A proposta sairá da lista comercial; o contrato vinculado será mantido.",
                                                            })
                                                        }
                                                        className="commercial-delete-action inline-flex h-8 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 whitespace-nowrap"
                                                        title="Excluir a proposta vinculada; manter o contrato"
                                                        aria-label="Excluir proposta vinculada"
                                                    >
                                                        <Trash2 size={13} className="shrink-0" aria-hidden="true" />
                                                        <span className="min-w-0 truncate font-semibold">Excluir proposta</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteModal({
                                                            type: "contract",
                                                            id: contract.id,
                                                            title: `Contrato de ${clientName}`,
                                                            description: [
                                                                linkedProposal ? "A proposta vinculada será mantida." : null,
                                                                "Cobranças existentes serão mantidas, mas ficarão sem vínculo com este contrato.",
                                                                isSigned ? "O registro da assinatura digital também será removido." : null,
                                                            ].filter(Boolean).join(" "),
                                                        })
                                                    }
                                                    className={`commercial-delete-action inline-flex h-8 ${linkedProposal ? "w-full min-w-0 px-2" : "w-auto px-4"} items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-rose-200 bg-white text-xs font-semibold text-rose-700 shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 whitespace-nowrap`}
                                                    title="Excluir contrato"
                                                    aria-label="Excluir contrato"
                                                >
                                                    <Trash2 size={13} className="shrink-0" aria-hidden="true" />
                                                    <span className="min-w-0 truncate font-semibold">Excluir contrato</span>
                                                </button>
                                            </div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}

                {/* Workspace Pagination */}
                {!loading && (activeTab === "proposals" ? filteredProposals.length > 0 : filteredContracts.length > 0) && (
                    <div className="mt-6 rounded-2xl border border-zinc-300 bg-white p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs font-normal text-zinc-500">
                            Mostrando{" "}
                            <span className="font-semibold text-zinc-900">
                                {Math.min(
                                    (currentPage - 1) * itemsPerPage + 1,
                                    activeTab === "proposals" ? filteredProposals.length : filteredContracts.length
                                )}
                            </span>{" "}
                            a{" "}
                            <span className="font-semibold text-zinc-900">
                                {Math.min(
                                    itemsPerPage === 0
                                        ? activeTab === "proposals" ? filteredProposals.length : filteredContracts.length
                                        : currentPage * itemsPerPage,
                                    activeTab === "proposals" ? filteredProposals.length : filteredContracts.length
                                )}
                            </span>{" "}
                            de{" "}
                            <span className="font-semibold text-zinc-900">
                                {activeTab === "proposals" ? filteredProposals.length : filteredContracts.length}
                            </span>{" "}
                            registros
                        </span>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950 disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                    title="Página anterior"
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeft size={15} />
                                </button>

                                <span className="px-2 text-xs font-semibold text-zinc-700">
                                    {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-950 disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                    title="Próxima página"
                                    aria-label="Próxima página"
                                >
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Modal: selecionar cliente antes de gerar contrato */}
            {proposalNeedingClient && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="contract-client-title"
                >
                    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
                            <div>
                                <h3 id="contract-client-title" className="text-lg font-bold text-zinc-950">
                                    Selecionar cliente
                                </h3>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Vincule um cliente cadastrado para preparar a assinatura de {proposalNeedingClient.client?.name || proposalNeedingClient.clientName || "esta proposta"}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setProposalNeedingClient(null)}
                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                aria-label="Fechar seleção de cliente"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {clients.length > 0 ? (
                            <div className="mt-5">
                                <label htmlFor="contract-client-select" className="block text-sm font-semibold text-zinc-700">
                                    Cliente
                                </label>
                                <select
                                    id="contract-client-select"
                                    value={selectedContractClientId}
                                    onChange={(event) => setSelectedContractClientId(event.target.value)}
                                    className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-[#0044ff] focus:ring-2 focus:ring-[#0044ff]/10"
                                >
                                    <option value="">Selecione um cliente...</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}{client.email ? ` (${client.email})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                Cadastre um cliente antes de preparar a assinatura. <Link href="/admin/clients" className="font-semibold underline">Cadastrar cliente</Link>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setProposalNeedingClient(null)}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                            >
                                Cancelar
                            </button>
                            {clients.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleConfirmGenerateContract}
                                    disabled={!selectedContractClientId || actionInProgressId === proposalNeedingClient.id}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#0044ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0039d6] disabled:cursor-not-allowed disabled:bg-zinc-300"
                                >
                                    {actionInProgressId === proposalNeedingClient.id && <Loader2 size={15} className="animate-spin" />}
                                    Preparar assinatura
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Data de Pagamento / Termos do Contrato */}
            {editingProposalPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0044ff]">Proposta #{editingProposalPayment.id}</span>
                                <h3 className="mt-0.5 text-lg font-bold text-zinc-950">{getClientDisplayName(editingProposalPayment)}</h3>
                                <p className="text-xs text-zinc-500">O dia escolhido será usado ao gerar o contrato.</p>
                            </div>
                            <button type="button" onClick={() => setEditingProposalPayment(null)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100" aria-label="Fechar modal"><X size={18} /></button>
                        </div>
                        <label className="mt-5 block text-xs font-semibold text-zinc-700" htmlFor="proposal-payment-day">Dia de pagamento (1 a 31)</label>
                        <input
                            id="proposal-payment-day"
                            type="number"
                            min={1}
                            max={31}
                            value={editPaymentDay}
                            onChange={(event) => setEditPaymentDay(Number(event.target.value))}
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-[#0044ff]"
                        />
                        <div className="mt-6 flex justify-end gap-2 border-t border-zinc-100 pt-4">
                            <button type="button" onClick={() => setEditingProposalPayment(null)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700">Cancelar</button>
                            <button type="button" onClick={handleSaveProposalPayment} disabled={savingProposalPayment} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0044ff] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                                {savingProposalPayment ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />}
                                {savingProposalPayment ? "Salvando..." : "Salvar pagamento"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editingContract && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
                            <div>
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0044ff]">
                                    Contrato #{editingContract.id}
                                </span>
                                <h3 className="mt-0.5 text-lg font-bold text-zinc-950">
                                    {editingContract.client?.name || editingContract.clientName || "Contratante"}
                                </h3>
                                <p className="text-xs text-zinc-500 font-normal">
                                    Ajuste o dia de vencimento e observações da minuta.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingContract(null)}
                                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                                title="Fechar modal"
                                aria-label="Fechar modal"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            {/* Locked state warning if already signed */}
                            {Boolean(editingContract.signedAt) ? (
                                <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                                    <Lock size={16} className="shrink-0 text-amber-700" />
                                    <span>
                                        Este contrato já foi assinado digitalmente e possui validade jurídica. Os termos estão bloqueados para alteração.
                                    </span>
                                </div>
                            ) : null}

                            {/* Dia de Vencimento */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700">
                                    Dia de Vencimento
                                </label>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    {PAYMENT_DAY_PRESETS.map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            disabled={Boolean(editingContract.signedAt)}
                                            onClick={() => setEditPaymentDay(day)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                                                editPaymentDay === day
                                                    ? "bg-[#0044ff] text-white shadow-2xs border border-[#0044ff]"
                                                    : "border border-zinc-200 bg-white text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
                                            } disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed`}
                                        >
                                            Dia {day}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs text-zinc-500 font-medium">Outro dia (1 a 31):</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={31}
                                        disabled={Boolean(editingContract.signedAt)}
                                        value={editPaymentDay}
                                        onChange={(e) => setEditPaymentDay(Number(e.target.value))}
                                        className="w-20 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 outline-none focus:border-[#0044ff]"
                                    />
                                </div>
                            </div>

                            {/* Observações Adicionais */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700">
                                    Observações Adicionais no Contrato
                                </label>
                                <textarea
                                    disabled={Boolean(editingContract.signedAt)}
                                    value={editObservation}
                                    onChange={(e) => setEditObservation(e.target.value)}
                                    placeholder="Ex: Pagamento via PIX com desconto até o vencimento..."
                                    rows={2}
                                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#0044ff]"
                                />
                            </div>

                            {/* Escopo Adicional */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700">
                                    Escopo Adicional / Observações de Entregas
                                </label>
                                <textarea
                                    disabled={Boolean(editingContract.signedAt)}
                                    value={editAdditionalScope}
                                    onChange={(e) => setEditAdditionalScope(e.target.value)}
                                    placeholder="Ex: Incluso 1 sessão fotográfica extra no 3º mês..."
                                    rows={2}
                                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#0044ff]"
                                />
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-4">
                            <button
                                type="button"
                                onClick={() => setEditingContract(null)}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            >
                                Fechar
                            </button>

                            {!Boolean(editingContract.signedAt) && (
                                <button
                                    type="button"
                                    onClick={handleSaveContract}
                                    disabled={savingContract}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0044ff] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#0039d6] disabled:bg-zinc-100 disabled:border disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0044ff]/40"
                                >
                                    {savingContract ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin text-zinc-400" />
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck2 size={14} />
                                            <span>Salvar alterações</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Exclusão de Registro */}
            {deleteModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
                                <Trash2 size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-zinc-950">
                                    Confirmar exclusão
                                </h3>
                                <p className="text-xs text-zinc-500 font-normal">
                                    {deleteModal.description ||
                                        (deleteModal.type === "proposal"
                                            ? "A proposta sairá da lista. O contrato vinculado será mantido."
                                            : "Esta ação não pode ser desfeita.")}
                                </p>
                            </div>
                        </div>

                        <p className="mt-4 text-xs text-zinc-700 leading-relaxed">
                            {deleteModal.type === "proposal"
                                ? "Tem certeza de que deseja remover da lista comercial"
                                : "Tem certeza de que deseja excluir permanentemente"}{" "}
                            <span className="font-bold text-zinc-900">{deleteModal.title}</span>?
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeleteModal(null)}
                                disabled={deletingItem}
                                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 disabled:bg-zinc-100 disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={handleExecuteDelete}
                                disabled={deletingItem}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 disabled:bg-zinc-100 disabled:border disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            >
                                {deletingItem ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin text-zinc-400" />
                                        <span>Excluindo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={14} />
                                        <span>Excluir</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
