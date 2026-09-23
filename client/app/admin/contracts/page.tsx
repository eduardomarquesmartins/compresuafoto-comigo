"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
    Copy,
    Download,
    FileText,
    Loader2,
    Mail,
    Signature,
    Trash2,
    Edit3,
    CheckCircle2,
    Clock,
    Search,
    X,
    FileSpreadsheet,
    FileSignature,
    FileCheck,
    Info,
    Building2,
    Calendar,
    DollarSign
} from "lucide-react";
import {
    createContract,
    deleteContract,
    downloadContractPdf,
    downloadPublicContractPdf,
    getClients,
    getContracts,
    getProposal,
    getProposals,
    sendContractSignatureLink,
    downloadContractPdfById,
    updatePendingContract
} from "@/lib/api";

interface ProposalServiceItem {
    id?: string;
    name?: string;
    category?: string;
    price?: number;
    quantity?: number;
    description?: string;
}

const initialForm = {
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientDocument: "",
    clientAddress: "",
    clientCityState: "",
    signerName: "",
    signerDocument: "",
    planName: "Gestão de Redes Sociais",
    weeklyPosts: "2",
    includesPaidTraffic: "true",
    includesAudiovisual: "false",
    proposalType: "empresarial",
    proposalServices: "",
    scope: "",
    observation: "",
    monthlyValue: "1000",
    durationMonths: "6",
    paymentDay: "25",
    contractDate: ""
};

const moneyToNumber = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatCpfCnpj = (value: string) => {
    const digits = onlyDigits(value).slice(0, 14);

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

const filenameFromClient = (clientName: string) => {
    const slug = clientName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

    return `contrato_${slug || "cliente"}.pdf`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error) {
            return response.data.error;
        }
    }
    return fallback;
};

const yesNo = (value: string) => value === "true" ? "sim" : "não";

const isLikelySocialHandle = (value: string) => value.trim().startsWith("@");

const getContractClientName = (...values: Array<string | undefined | null>) => {
    const value = values.find((item) => item && !isLikelySocialHandle(item));
    return value || "";
};

const normalizeText = (value: unknown) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const getProposalServiceText = (service: any) => normalizeText([
    service?.name,
    service?.category,
    service?.description
].filter(Boolean).join(" "));

const getContractFieldsFromProposalServices = (services: any[]) => {
    const selectedServices = Array.isArray(services) ? services : [];
    const primaryPlan = selectedServices.find((service) => {
        const text = getProposalServiceText(service);
        return text.includes("social media") || text.includes("pacote");
    });
    const postsService = selectedServices.find((service) => /\d+\s+postage/.test(getProposalServiceText(service)));
    const postsMatch = postsService
        ? getProposalServiceText(postsService).match(/(\d+)\s+postage/)
        : null;
    const includesPaidTraffic = selectedServices.some((service) => {
        const text = getProposalServiceText(service);
        return text.includes("meta ads") || text.includes("trafego") || text.includes("anuncio");
    });
    const includesAudiovisual = selectedServices.some((service) => {
        const text = getProposalServiceText(service);
        return text.includes("audiovisual") || text.includes("fotografia") || text.includes("fotos") || text.includes("video");
    });

    return {
        planName: primaryPlan?.name || selectedServices[0]?.name || "",
        weeklyPosts: postsMatch?.[1] || "0",
        includesPaidTraffic: includesPaidTraffic ? "true" : "false",
        includesAudiovisual: includesAudiovisual ? "true" : "false"
    };
};

const formatProposalServicesForContract = (services: any[]) => {
    const selectedServices = Array.isArray(services) ? services : [];

    return selectedServices
        .map((service) => {
            const quantity = Number(service?.quantity);
            const quantityLabel = Number.isFinite(quantity) && quantity > 1 ? `${Math.floor(quantity)}x ` : "";
            const price = Number(service?.price) || 0;
            const priceText = price.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            const category = service?.category ? ` (${service.category})` : "";
            const description = service?.description ? ` - ${service.description}` : "";

            return `- ${quantityLabel}${service?.name || "Serviço"}${category}: R$ ${priceText}${description}`;
        })
        .join("\n");
};

export default function AdminContractsPage() {
    const [form, setForm] = useState(initialForm);
    const [clients, setClients] = useState<any[]>([]);
    const [proposals, setProposals] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
    const [proposalData, setProposalData] = useState<any | null>(null);
    const [editingContractId, setEditingContractId] = useState<number | null>(null);
    const [creationMode, setCreationMode] = useState<"proposal" | "custom">("proposal");

    const [loading, setLoading] = useState(false);
    const [sendingEmailLink, setSendingEmailLink] = useState(false);
    const [copyingLink, setCopyingLink] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter and search state for contracts table
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "signed">("all");

    const loadClients = async () => {
        try {
            const data = await getClients();
            setClients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn("Erro ao carregar clientes:", error);
        }
    };

    const loadContracts = async () => {
        try {
            const data = await getContracts();
            setContracts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn("Erro ao carregar contratos:", error);
        }
    };

    const loadProposals = async () => {
        try {
            const data = await getProposals();
            setProposals(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn("Erro ao carregar propostas:", error);
        }
    };

    useEffect(() => {
        if (typeof window === "undefined") return;

        setForm((prev) => ({
            ...prev,
            contractDate: prev.contractDate || new Date().toLocaleDateString("pt-BR")
        }));

        loadClients();
        loadContracts();
        loadProposals();

        const params = new URLSearchParams(window.location.search);
        const proposalIdParam = params.get("proposalId");
        if (proposalIdParam) {
            handleSelectProposal(proposalIdParam);
        }
    }, []);

    const handleSelectProposal = async (proposalId: string) => {
        if (!proposalId) {
            setSelectedProposalId(null);
            setProposalData(null);
            return;
        }

        try {
            setLoading(true);
            setErrorMessage(null);

            const proposal = await getProposal(proposalId);
            if (!proposal) {
                setErrorMessage("Proposta não encontrada.");
                return;
            }

            setSelectedProposalId(String(proposalId));
            setProposalData(proposal);
            setCreationMode("proposal");

            const contractFields = getContractFieldsFromProposalServices(proposal.selectedServices);
            const formattedServices = formatProposalServicesForContract(proposal.selectedServices);
            const formattedTotal = typeof proposal.total === "number"
                ? proposal.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                : String(proposal.total || "0,00");

            setForm((prev) => ({
                ...prev,
                clientId: proposal.clientId ? String(proposal.clientId) : proposal.client?.id ? String(proposal.client.id) : "",
                clientName: getContractClientName(proposal.client?.name, proposal.clientName, prev.clientName),
                clientEmail: proposal.client?.email || proposal.clientEmail || prev.clientEmail,
                clientDocument: proposal.client?.document ? formatCpfCnpj(proposal.client.document) : prev.clientDocument,
                clientAddress: proposal.client?.address || prev.clientAddress,
                clientCityState: proposal.client?.cityState || prev.clientCityState,
                signerName: proposal.client?.signerName || prev.signerName,
                signerDocument: proposal.client?.signerDocument ? formatCpfCnpj(proposal.client.signerDocument) : prev.signerDocument,
                planName: contractFields.planName || prev.planName,
                weeklyPosts: contractFields.weeklyPosts || prev.weeklyPosts,
                includesPaidTraffic: contractFields.includesPaidTraffic,
                includesAudiovisual: contractFields.includesAudiovisual,
                proposalType: proposal.proposalType || "empresarial",
                proposalServices: formattedServices,
                monthlyValue: formattedTotal,
                durationMonths: "6",
                paymentDay: prev.paymentDay || "25",
                observation: ""
            }));
        } catch (error) {
            console.warn("Erro ao carregar dados da proposta:", error);
            setErrorMessage("Não consegui carregar os dados da proposta.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearProposalLink = () => {
        setSelectedProposalId(null);
        setProposalData(null);
        setCreationMode("custom");
    };

    const handleEditPendingContract = async (contract: any) => {
        setErrorMessage(null);
        setEditingContractId(contract.id);

        if (contract.proposalId) {
            await handleSelectProposal(String(contract.proposalId));
        } else {
            setSelectedProposalId(null);
            setProposalData(null);
            setCreationMode("custom");
        }

        const formattedMonthlyValue = typeof contract.monthlyValue === "number"
            ? contract.monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
            : String(contract.monthlyValue || "0,00");

        setForm({
            clientId: contract.clientId ? String(contract.clientId) : "",
            clientName: contract.client?.name || contract.clientName || "",
            clientEmail: contract.client?.email || "",
            clientDocument: contract.client?.document ? formatCpfCnpj(contract.client.document) : "",
            clientAddress: contract.client?.address || "",
            clientCityState: contract.client?.cityState || "",
            signerName: contract.signedName || contract.client?.signerName || "",
            signerDocument: contract.signedDocument ? formatCpfCnpj(contract.signedDocument) : (contract.client?.signerDocument ? formatCpfCnpj(contract.client.signerDocument) : ""),
            planName: "Gestão de Redes Sociais",
            weeklyPosts: "2",
            includesPaidTraffic: "true",
            includesAudiovisual: "false",
            proposalType: "empresarial",
            proposalServices: "",
            scope: contract.scope || "",
            observation: contract.observation || contract.additionalScope || "",
            monthlyValue: formattedMonthlyValue,
            durationMonths: String(contract.durationMonths || "6"),
            paymentDay: String(contract.paymentDay || "25"),
            contractDate: contract.contractDate || new Date().toLocaleDateString("pt-BR")
        });

        // Scroll to form smoothly
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const handleCancelEdit = () => {
        setEditingContractId(null);
        setSelectedProposalId(null);
        setProposalData(null);
        setCreationMode("proposal");
        setForm({
            ...initialForm,
            contractDate: new Date().toLocaleDateString("pt-BR")
        });
    };

    const updateField = (field: keyof typeof initialForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const updateDocument = (value: string) => {
        updateField("clientDocument", formatCpfCnpj(value));
    };

    const updateSignerDocument = (value: string) => {
        updateField("signerDocument", formatCpfCnpj(value));
    };

    const handleClientSelect = (clientId: string) => {
        const client = clients.find((item) => String(item.id) === clientId);
        setForm((prev) => ({
            ...prev,
            clientId,
            clientName: getContractClientName(client?.name) || prev.clientName,
            clientEmail: client?.email || prev.clientEmail,
            clientDocument: client?.document ? formatCpfCnpj(client.document) : prev.clientDocument,
            clientAddress: client?.address || prev.clientAddress,
            clientCityState: client?.cityState || prev.clientCityState,
            signerName: client?.signerName || prev.signerName,
            signerDocument: client?.signerDocument ? formatCpfCnpj(client.signerDocument) : prev.signerDocument
        }));
    };

    const isProposalLinked = Boolean(selectedProposalId);

    const selectedClient = clients.find((client) => String(client.id) === form.clientId);
    const resolvedClientEmail = (form.clientEmail || selectedClient?.email || "").trim();

    const resolvedScope = isProposalLinked
        ? [
            `Tipo de proposta: ${form.proposalType || "empresarial"}.`,
            form.proposalServices.trim() ? `Serviços contratados:\n${form.proposalServices.trim()}` : "",
            form.observation.trim() ? `Observações adicionais: ${form.observation.trim()}` : ""
        ].filter(Boolean).join("\n\n")
        : [
            `Tipo de proposta: ${form.proposalType || "empresarial"}.`,
            `Plano contratado: ${form.planName || "não informado"}.`,
            `Quantidade de postagens: ${form.weeklyPosts || "0"} postagens semanais para Instagram/Facebook.`,
            `Gestão de tráfego pago (Meta Ads): ${yesNo(form.includesPaidTraffic)}.`,
            `Audiovisual incluso no plano: ${yesNo(form.includesAudiovisual)}.`,
            form.proposalServices.trim() ? `Serviços contratados:\n${form.proposalServices.trim()}` : "",
            form.scope.trim() ? `Observações adicionais: ${form.scope.trim()}` : ""
        ].filter(Boolean).join("\n");

    const getSignaturePayload = (delivery: "email" | "copy") => ({
        proposalId: selectedProposalId ? Number(selectedProposalId) : undefined,
        clientId: form.clientId ? Number(form.clientId) : undefined,
        clientName: form.clientName.trim(),
        clientEmail: resolvedClientEmail || undefined,
        clientDocument: form.clientDocument.trim() || undefined,
        clientAddress: form.clientAddress.trim() || undefined,
        clientCityState: form.clientCityState.trim() || undefined,
        signerName: form.signerName.trim() || undefined,
        signerDocument: form.signerDocument.trim() || undefined,
        scope: isProposalLinked ? undefined : resolvedScope,
        monthlyValue: isProposalLinked ? undefined : moneyToNumber(form.monthlyValue),
        durationMonths: isProposalLinked ? undefined : form.durationMonths,
        paymentDay: form.paymentDay,
        observation: form.observation.trim() || undefined,
        contractDate: form.contractDate,
        delivery
    });

    const handleGenerate = async () => {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!editingContractId && !form.clientName.trim()) {
            setErrorMessage("Informe o nome/razão social do contratante.");
            return;
        }

        if (!editingContractId && !selectedProposalId && !form.clientDocument.trim()) {
            setErrorMessage("Informe o CPF ou CNPJ do contratante.");
            return;
        }

        try {
            setLoading(true);
            const blob = await downloadContractPdf({
                ...form,
                scope: resolvedScope,
                signerName: form.signerName.trim(),
                signerDocument: form.signerDocument.trim(),
                monthlyValue: moneyToNumber(form.monthlyValue)
            });

            if (editingContractId) {
                const updatedContract = await updatePendingContract(editingContractId, {
                    observation: form.observation.trim() || null,
                    paymentDay: form.paymentDay
                });
                setContracts((prev) => prev.map((contract) => contract.id === editingContractId ? updatedContract : contract));
            } else if (form.clientId || selectedProposalId) {
                await createContract({
                    clientId: form.clientId ? Number(form.clientId) : undefined,
                    proposalId: selectedProposalId ? Number(selectedProposalId) : undefined,
                    scope: isProposalLinked ? undefined : resolvedScope,
                    observation: form.observation.trim() || undefined,
                    monthlyValue: isProposalLinked ? undefined : moneyToNumber(form.monthlyValue),
                    durationMonths: isProposalLinked ? undefined : form.durationMonths,
                    paymentDay: form.paymentDay,
                    contractDate: form.contractDate
                });
                await loadContracts();
            }

            const pdfBlob = new Blob([blob], { type: "application/pdf" });
            const url = window.URL.createObjectURL(pdfBlob);
            const filename = filenameFromClient(form.clientName);
            const link = document.createElement("a");

            link.href = url;
            link.download = filename;
            link.style.display = "none";
            document.body.appendChild(link);

            await new Promise((resolve) => setTimeout(resolve, 100));
            link.click();

            setTimeout(() => {
                link.remove();
                window.URL.revokeObjectURL(url);
            }, 1000);

            setSuccessMessage("PDF do contrato gerado e baixado com sucesso.");
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            const status = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;

            if (status === 404) {
                setErrorMessage("Não encontrei o endpoint de geração do contrato. Confirme se o backend local está rodando na porta 3002.");
            } else {
                setErrorMessage(getErrorMessage(error, "Houve um erro ao gerar o contrato."));
            }

            console.warn("Erro ao gerar contrato:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateSignatureLinkRequest = (delivery: "email" | "copy") => {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (!form.clientName.trim()) {
            setErrorMessage("Informe o nome do contratante para gerar o link de assinatura.");
            return false;
        }

        if (delivery === "email" && !resolvedClientEmail) {
            setErrorMessage("Preencha o e-mail do contratante para enviar o link de assinatura.");
            return false;
        }

        return true;
    };

    const handleSendSignatureLinkEmail = async () => {
        if (!validateSignatureLinkRequest("email")) return;

        try {
            setSendingEmailLink(true);
            const result = await sendContractSignatureLink(getSignaturePayload("email"));

            setErrorMessage(null);
            setSuccessMessage(result?.message || `Link de assinatura enviado com sucesso para ${resolvedClientEmail}.`);
            await loadContracts();
            setTimeout(() => setSuccessMessage(null), 6000);
        } catch (error) {
            console.warn("Erro ao enviar link de assinatura:", error);
            setErrorMessage(getErrorMessage(error, "Houve um erro ao enviar o link por e-mail."));
        } finally {
            setSendingEmailLink(false);
        }
    };

    const handleCopySignatureLink = async () => {
        if (!validateSignatureLinkRequest("copy")) return;

        try {
            setCopyingLink(true);
            const result = await sendContractSignatureLink(getSignaturePayload("copy"));

            if (!result?.signLink) {
                setErrorMessage("Não consegui gerar o link de assinatura.");
                return;
            }

            await navigator.clipboard.writeText(result.signLink);
            setSuccessMessage("Link de assinatura gerado e copiado para a área de transferência.");
            await loadContracts();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            console.warn("Erro ao copiar link de assinatura:", error);
            setErrorMessage(getErrorMessage(error, "Houve um erro ao copiar o link de assinatura."));
        } finally {
            setCopyingLink(false);
        }
    };

    const handleCopyTokenLink = async (token: string) => {
        try {
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://econticomigo.com.br";
            const link = `${baseUrl}/assinar-contrato/${token}`;
            await navigator.clipboard.writeText(link);
            setSuccessMessage("Link de assinatura copiado para a área de transferência.");
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (error) {
            console.warn("Erro ao copiar link:", error);
            setErrorMessage("Não consegui copiar o link.");
        }
    };

    const handleDownloadPdf = async (token: string, signed: boolean) => {
        try {
            const blob = await downloadPublicContractPdf(token);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = signed ? `contrato_assinado.pdf` : `contrato.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn("Erro ao baixar contrato:", error);
            setErrorMessage("Não consegui baixar o contrato.");
        }
    };

    const handleDownloadPdfById = async (id: number) => {
        try {
            const blob = await downloadContractPdfById(id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `contrato.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn("Erro ao baixar contrato:", error);
            setErrorMessage("Não consegui baixar o contrato.");
        }
    };

    const handleDeleteContract = async (id: number) => {
        if (!window.confirm("Tem certeza que deseja apagar este contrato?")) return;
        try {
            await deleteContract(id);
            setContracts((prev) => prev.filter((c) => c.id !== id));
            if (editingContractId === id) {
                handleCancelEdit();
            }
            setSuccessMessage("Contrato apagado com sucesso.");
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (error) {
            console.warn("Erro ao apagar contrato:", error);
            setErrorMessage(getErrorMessage(error, "Não consegui apagar o contrato."));
        }
    };

    // Parsed proposal services list for nice display
    const parsedProposalServices = useMemo<ProposalServiceItem[]>(() => {
        if (!proposalData?.selectedServices) return [];
        if (Array.isArray(proposalData.selectedServices)) return proposalData.selectedServices;
        try {
            const parsed = JSON.parse(proposalData.selectedServices);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [proposalData]);

    // Filtered contracts list
    const filteredContracts = useMemo(() => {
        return contracts.filter((c) => {
            const matchesSearch =
                (c.client?.name && normalizeText(c.client.name).includes(normalizeText(searchQuery))) ||
                (c.clientName && normalizeText(c.clientName).includes(normalizeText(searchQuery))) ||
                (c.client?.email && normalizeText(c.client.email).includes(normalizeText(searchQuery))) ||
                (c.client?.document && c.client.document.includes(searchQuery));

            if (!matchesSearch) return false;

            if (statusFilter === "pending") return !c.signedAt;
            if (statusFilter === "signed") return Boolean(c.signedAt);
            return true;
        });
    }, [contracts, searchQuery, statusFilter]);

    const pendingCount = contracts.filter((c) => !c.signedAt).length;
    const signedCount = contracts.filter((c) => Boolean(c.signedAt)).length;

    // Available approved & active proposals for selection
    const approvedProposals = useMemo(() => {
        return proposals.filter((p) => p.status === "APPROVED");
    }, [proposals]);

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-24 text-slate-200">
            {/* Page Header */}
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-white/5 pb-6">
                <div>
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-blue-500">
                        Gestão Jurídica & Comercial
                    </span>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <Signature className="w-8 h-8 text-blue-500" />
                        Contratos e Assinaturas
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                        Gere contratos vinculados a propostas aprovadas ou crie contratos avulsos. Os dados comerciais aprovados são consolidados automaticamente.
                    </p>
                </div>
            </header>

            {/* Success Toast / Notification */}
            {successMessage && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-bold text-emerald-300 flex items-center gap-3 shadow-lg shadow-emerald-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm font-bold text-amber-300 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <Info size={20} className="text-amber-400 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-amber-400 hover:text-white"
                        aria-label="Fechar mensagem de erro"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Edit Mode Banner */}
            {editingContractId && (
                <div className="p-6 rounded-3xl border border-blue-500/40 bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-blue-500/10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                            <Edit3 size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-widest text-blue-400">
                                    Modo de Edição
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-1.5">
                                    <Clock size={10} /> Pendente de Assinatura
                                </span>
                            </div>
                            <h2 className="text-lg font-bold text-white mt-1">
                                Editando Contrato #{editingContractId} — {form.clientName || "Cliente"}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Você pode ajustar os dados cadastrais, dia de pagamento e observações. As alterações serão refletidas no link e no PDF.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-2"
                    >
                        <X size={14} />
                        Cancelar Edição
                    </button>
                </div>
            )}

            {/* Mode / Proposal Selector (When creating new contract or unlinked) */}
            {!editingContractId && (
                <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                <FileSpreadsheet size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                                    Origem dos Dados Comerciais
                                </h2>
                                <p className="text-xs text-slate-400">
                                    Escolha se este contrato parte de uma proposta comercial ou é um contrato avulso.
                                </p>
                            </div>
                        </div>

                        {/* Mode Toggle Buttons */}
                        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                            <button
                                type="button"
                                onClick={() => {
                                    setCreationMode("proposal");
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${creationMode === "proposal"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                A partir de Proposta
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleClearProposalLink();
                                    setCreationMode("custom");
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${creationMode === "custom" && !isProposalLinked
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                <FileText size={14} />
                                Contrato Avulso
                            </button>
                        </div>
                    </div>

                    {/* Proposal Picker */}
                    {creationMode === "proposal" && (
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1 flex items-center justify-between">
                                <span>Selecionar Proposta Comercial</span>
                                <span className="text-[10px] text-blue-400 font-semibold lowercase tracking-normal">
                                    (propostas aprovadas ou em andamento)
                                </span>
                            </label>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select
                                    value={selectedProposalId || ""}
                                    onChange={(e) => handleSelectProposal(e.target.value)}
                                    className="flex-1 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all outline-none text-sm"
                                >
                                    <option value="">Selecione uma proposta comercial...</option>
                                    {approvedProposals.map((proposal) => {
                                        const formattedPrice = typeof proposal.total === "number"
                                            ? proposal.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                            : String(proposal.total || "");
                                        const statusLabel = proposal.status === "APPROVED" ? "Aprovada" : proposal.status === "PENDING" ? "Pendente" : proposal.status;
                                        return (
                                            <option key={proposal.id} value={proposal.id}>
                                                {proposal.clientName || proposal.client?.name || "Cliente"} (R$ {formattedPrice}) [{statusLabel}]
                                            </option>
                                        );
                                    })}
                                </select>
                                {isProposalLinked && (
                                    <button
                                        type="button"
                                        onClick={handleClearProposalLink}
                                        className="px-5 py-3 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-2"
                                    >
                                        <X size={14} />
                                        Desvincular
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 px-1">
                                Ao selecionar uma proposta, os serviços e valores aprovados são fixados automaticamente no contrato.
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* Read-Only Proposal Commercial Summary (Rendered when proposal is linked) */}
            {isProposalLinked && (
                <section className="bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-900 border-2 border-blue-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-500/20 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                <FileCheck size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase tracking-widest text-white">
                                    Resumo Comercial da Proposta
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Fonte dos dados comerciais: os itens e valores abaixo são imutáveis e consolidados pela proposta.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-wider">
                                Somente Leitura
                            </span>
                        </div>
                    </div>

                    {/* Commercial Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
                                <DollarSign size={12} className="text-blue-400" /> Valor Comercial Total
                            </span>
                            <p className="text-2xl font-black text-white tracking-tight">
                                R$ {form.monthlyValue || "0,00"}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">Conforme proposta aprovada</span>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
                                <Calendar size={12} className="text-blue-400" /> Vigência Padrão
                            </span>
                            <p className="text-2xl font-black text-white tracking-tight">
                                6 meses
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">Período comercial acordado</span>
                        </div>

                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-1.5">
                                <Building2 size={12} className="text-blue-400" /> Tipo de Proposta
                            </span>
                            <p className="text-xl font-bold text-white capitalize tracking-tight truncate">
                                {form.proposalType || "Empresarial"}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">Segmentação comercial</span>
                        </div>
                    </div>

                    {/* Detailed Services Breakdown */}
                    {parsedProposalServices.length > 0 ? (
                        <div className="space-y-3 pt-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block ml-1">
                                Serviços Inclusos no Pacote ({parsedProposalServices.length})
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {parsedProposalServices.map((service, idx) => {
                                    const qty = service.quantity && Number(service.quantity) > 1 ? `${service.quantity}x ` : "";
                                    const price = typeof service.price === "number"
                                        ? service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                        : String(service.price || "");
                                    return (
                                        <div
                                            key={service.id || idx}
                                            className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-start justify-between gap-3"
                                        >
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-white truncate">
                                                            {qty}{service.name || "Serviço"}
                                                        </span>
                                                        {service.category && (
                                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                                                {service.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {service.description && (
                                                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                            {service.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {price && (
                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-bold text-blue-400 tabular-nums tracking-normal">
                                                            R$ {price}
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : form.proposalServices ? (
                        <div className="space-y-2 pt-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block ml-1">
                                Serviços Contratados
                            </span>
                            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 text-xs text-slate-300 tabular-nums tracking-normal whitespace-pre-line leading-relaxed">
                                {form.proposalServices}
                            </div>
                        </div>
                    ) : null}
                </section>
            )}

            {/* Main Form + Sticky Sidebar Grid */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
                {/* Contract Form Inputs */}
                <section className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl">
                    {/* Section 1: Dados do Contratante */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <FileText size={18} />
                                </div>
                                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                                    Dados do Contratante
                                </h2>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                                Informações cadastrais
                            </span>
                        </div>

                        {/* Client Selector (Only when creating avulso without proposal) */}
                        {(!isProposalLinked || !form.clientId) && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400 tracking-widest ml-1">
                                    {isProposalLinked ? "Vincular cliente à proposta *" : "Cliente Cadastrado (Opcional)"}
                                </label>
                                <select
                                    value={form.clientId}
                                    onChange={(e) => handleClientSelect(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                >
                                    <option value="">{isProposalLinked ? "Selecione o cliente que aprovou a proposta" : "Sem vínculo / preencher dados manualmente"}</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.email ? `- ${client.email}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Nome / Razão Social do Contratante *
                                </span>
                                <input
                                    value={form.clientName}
                                    onChange={(e) => updateField("clientName", e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="Ex: Empresa Conti Marketing Ltda ou Maria Silva"
                                />
                                {isLikelySocialHandle(form.clientName) && (
                                    <p className="text-xs font-medium text-amber-400 ml-1">
                                        Este campo parece um @ de rede social. Para contratos com validade jurídica, informe a razão social ou nome completo.
                                    </p>
                                )}
                            </label>

                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    CPF ou CNPJ *
                                </span>
                                <input
                                    value={form.clientDocument}
                                    onChange={(e) => updateDocument(e.target.value)}
                                    inputMode="numeric"
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm tabular-nums tracking-normal"
                                    placeholder="00.000.000/0001-00 ou 000.000.000-00"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    E-mail para Assinatura *
                                </span>
                                <input
                                    value={form.clientEmail}
                                    onChange={(e) => updateField("clientEmail", e.target.value)}
                                    type="email"
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="cliente@empresa.com"
                                />
                            </label>

                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Endereço Completo
                                </span>
                                <input
                                    value={form.clientAddress}
                                    onChange={(e) => updateField("clientAddress", e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="Rua, número, complemento, bairro"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Cidade / UF
                                </span>
                                <input
                                    value={form.clientCityState}
                                    onChange={(e) => updateField("clientCityState", e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="Porto Alegre/RS"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Data do Contrato
                                </span>
                                <input
                                    value={form.contractDate}
                                    onChange={(e) => updateField("contractDate", e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="DD/MM/AAAA"
                                />
                            </label>

                            {/* Signer details if representative */}
                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Nome do Representante / Assinante (opcional)
                                </span>
                                <input
                                    value={form.signerName}
                                    onChange={(e) => updateField("signerName", e.target.value)}
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="Ex: Nome do Sócio / Representante Legal"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    CPF do Representante (opcional)
                                </span>
                                <input
                                    value={form.signerDocument}
                                    onChange={(e) => updateSignerDocument(e.target.value)}
                                    inputMode="numeric"
                                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm tabular-nums tracking-normal"
                                    placeholder="000.000.000-00"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Section 2: Condições do Contrato */}
                    {isProposalLinked ? (
                        /* PROPOSAL LINKED MODE: Only Observação Adicional and Dia de Pagamento */
                        <div className="space-y-6 border-t border-slate-800 pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                                        Condições de Pagamento e Observações
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        Defina o vencimento mensal e qualquer observação contratual adicional.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="space-y-2 md:col-span-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Dia de Vencimento / Pagamento no Contrato *
                                    </span>
                                    <select
                                        value={form.paymentDay}
                                        onChange={(e) => updateField("paymentDay", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    >
                                        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                                            <option key={day} value={day}>
                                                Todo dia {day} de cada mês
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 ml-1">
                                        Este dia de vencimento constará expressamente na cláusula de remuneração do contrato.
                                    </p>
                                </label>

                                <label className="block space-y-2 md:col-span-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Observações Adicionais do Contrato (opcional)
                                    </span>
                                    <textarea
                                        value={form.observation}
                                        onChange={(e) => updateField("observation", e.target.value)}
                                        rows={4}
                                        className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm leading-relaxed"
                                        placeholder="Ex: Cláusulas específicas, datas de início acordadas, condições de entrega personalizadas..."
                                    />
                                </label>
                            </div>
                        </div>
                    ) : (
                        /* CUSTOM AVULSO MODE: Full editable commercial fields */
                        <div className="space-y-6 border-t border-slate-800 pt-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <FileText size={18} />
                                </div>
                                <h2 className="text-lg font-bold uppercase tracking-widest text-white">
                                    Escopo e Condições Comerciais (Avulso)
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Plano Contratado
                                    </span>
                                    <input
                                        value={form.planName}
                                        onChange={(e) => updateField("planName", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                        placeholder="Gestão de Redes Sociais"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Postagens Semanais
                                    </span>
                                    <input
                                        value={form.weeklyPosts}
                                        onChange={(e) => updateField("weeklyPosts", e.target.value)}
                                        inputMode="numeric"
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm tabular-nums tracking-normal"
                                        placeholder="2"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Tráfego Pago Meta Ads
                                    </span>
                                    <select
                                        value={form.includesPaidTraffic}
                                        onChange={(e) => updateField("includesPaidTraffic", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    >
                                        <option value="true">Incluído no contrato</option>
                                        <option value="false">Não incluído</option>
                                    </select>
                                </label>

                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Audiovisual
                                    </span>
                                    <select
                                        value={form.includesAudiovisual}
                                        onChange={(e) => updateField("includesAudiovisual", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    >
                                        <option value="false">Não incluído</option>
                                        <option value="true">Incluído no plano</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block space-y-2">
                                <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Observações Adicionais / Escopo Detalhado
                                </span>
                                <textarea
                                    value={form.scope}
                                    onChange={(e) => updateField("scope", e.target.value)}
                                    rows={4}
                                    className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    placeholder="Descrição detalhada das entregas e rotinas acordadas..."
                                />
                            </label>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Valor Mensal (R$) *
                                    </span>
                                    <input
                                        value={form.monthlyValue}
                                        onChange={(e) => updateField("monthlyValue", e.target.value)}
                                        inputMode="decimal"
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm tabular-nums tracking-normal"
                                        placeholder="1000,00"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Vigência (meses) *
                                    </span>
                                    <input
                                        value={form.durationMonths}
                                        onChange={(e) => updateField("durationMonths", e.target.value)}
                                        inputMode="numeric"
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm tabular-nums tracking-normal"
                                        placeholder="6"
                                    />
                                </label>

                                <label className="space-y-2">
                                    <span className="ml-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        Dia de Pagamento *
                                    </span>
                                    <select
                                        value={form.paymentDay}
                                        onChange={(e) => updateField("paymentDay", e.target.value)}
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35 text-sm"
                                    >
                                        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                                            <option key={day} value={day}>
                                                Todo dia {day}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}
                </section>

                {/* Sticky Action Sidebar */}
                <aside className="sticky top-6 h-fit space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-7 shadow-2xl">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                            {isProposalLinked ? "Contrato Vinculado" : "Contrato Avulso"}
                        </span>
                        <h2 className="mt-1 text-xl font-black text-white truncate">
                            {form.clientName || "Novo Contrato"}
                        </h2>
                    </div>

                    <div className="space-y-3 text-xs text-slate-300 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-500">Documento:</span>
                            <span className="tabular-nums tracking-normal text-white">{form.clientDocument || "-"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-500">E-mail:</span>
                            <span className="text-white truncate max-w-[160px]">{resolvedClientEmail || "-"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-500">Valor Mensal:</span>
                            <span className="font-bold text-white tabular-nums tracking-normal">R$ {form.monthlyValue || "0,00"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                            <span className="text-slate-500">Vigência:</span>
                            <span className="font-bold text-white tabular-nums tracking-normal">{form.durationMonths || "6"} meses</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-slate-500">Pagamento:</span>
                            <span className="font-bold text-white tabular-nums tracking-normal">Todo dia {form.paymentDay || "25"}</span>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2">
                        {/* Primary: Download PDF */}
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading || sendingEmailLink || copyingLink}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] text-white transition-all hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-blue-600/25"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Gerando...</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    <span>Gerar e Baixar PDF</span>
                                </>
                            )}
                        </button>

                        {/* Secondary: Send Email */}
                        <button
                            type="button"
                            onClick={handleSendSignatureLinkEmail}
                            disabled={loading || sendingEmailLink || copyingLink}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-blue-300 transition-all hover:bg-blue-500/20 active:scale-[0.99] disabled:opacity-50"
                        >
                            {sendingEmailLink ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Enviando e-mail...</span>
                                </>
                            ) : (
                                <>
                                    <Mail size={18} className="text-blue-400" />
                                    <span>Enviar Link por E-mail</span>
                                </>
                            )}
                        </button>

                        {/* Tertiary: Copy Link */}
                        <button
                            type="button"
                            onClick={handleCopySignatureLink}
                            disabled={loading || sendingEmailLink || copyingLink}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 px-5 py-3.5 text-xs font-black uppercase tracking-[0.15em] text-slate-200 transition-all hover:bg-slate-800 hover:border-slate-600 active:scale-[0.99] disabled:opacity-50"
                        >
                            {copyingLink ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Copiando...</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={18} className="text-slate-400" />
                                    <span>Copiar Link de Assinatura</span>
                                </>
                            )}
                        </button>
                    </div>
                </aside>
            </div>

            {/* Section 3: Contracts List Table */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                            <FileSignature size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                Acompanhamento
                            </span>
                            <h2 className="text-xl font-black tracking-tight text-white">
                                Contratos Emitidos & Assinaturas
                            </h2>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                            <button
                                type="button"
                                onClick={() => setStatusFilter("all")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === "all"
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Todos ({contracts.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("pending")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === "pending"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Pendentes ({pendingCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("signed")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${statusFilter === "signed"
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "text-slate-400 hover:text-white"
                                    }`}
                            >
                                Assinados ({signedCount})
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome do cliente, e-mail ou documento..."
                        className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[920px]">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            <tr>
                                <th className="px-5 py-4 whitespace-nowrap">Contrato / Contratante</th>
                                <th className="px-5 py-4 whitespace-nowrap">Condições Comerciais</th>
                                <th className="px-5 py-4 whitespace-nowrap">Status</th>
                                <th className="px-5 py-4 text-right whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 text-sm">
                            {filteredContracts.length === 0 ? (
                                <tr>
                                    <td className="px-5 py-8 text-center text-slate-500 text-xs uppercase tracking-wider" colSpan={4}>
                                        Nenhum contrato encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredContracts.map((contract) => {
                                    const isSigned = Boolean(contract.signedAt);
                                    const clientDisplayName = contract.client?.name || contract.clientName || "Cliente";
                                    const clientEmailDisplay = contract.client?.email || "";
                                    const clientDocDisplay = contract.client?.document ? formatCpfCnpj(contract.client.document) : "";
                                    const monthlyFormatted = typeof contract.monthlyValue === "number"
                                        ? contract.monthlyValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                        : String(contract.monthlyValue || "0,00");

                                    return (
                                        <tr key={contract.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    <span className="font-bold text-white text-base">
                                                        {clientDisplayName}
                                                    </span>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                        {clientEmailDisplay && <span>{clientEmailDisplay}</span>}
                                                        {clientDocDisplay && (
                                                            <span className="font-medium text-slate-300 tabular-nums tracking-normal">{clientDocDisplay}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-white text-base tabular-nums tracking-normal">
                                                        R$ {monthlyFormatted}
                                                    </div>
                                                    <div className="text-xs text-slate-400 tabular-nums tracking-normal">
                                                        Dia {contract.paymentDay || "25"} • {contract.durationMonths || "6"} meses
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {isSigned ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                        <CheckCircle2 size={12} />
                                                        Assinado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                                        <Clock size={12} />
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end">
                                                    <div className="grid grid-cols-[94px_128px_140px_32px] items-center gap-2">
                                                        {/* Fixed Slot 1: Editar */}
                                                        <div>
                                                            {!isSigned ? (
                                                                contract.proposalId ? (
                                                                    <Link
                                                                        href={`/admin/proposals/new?edit=${contract.proposalId}`}
                                                                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 text-xs font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/25 hover:border-blue-500/60 transition-all shadow-sm shrink-0 whitespace-nowrap"
                                                                        title="Editar"
                                                                        aria-label="Editar"
                                                                    >
                                                                        <Edit3 size={13} className="shrink-0" />
                                                                        Editar
                                                                    </Link>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleEditPendingContract(contract)}
                                                                        className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 text-xs font-bold uppercase tracking-wider text-blue-300 hover:bg-blue-500/25 hover:border-blue-500/60 transition-all shadow-sm shrink-0 whitespace-nowrap"
                                                                        title="Editar"
                                                                        aria-label="Editar"
                                                                    >
                                                                        <Edit3 size={13} className="shrink-0" />
                                                                        Editar
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <div className="h-8 w-full invisible pointer-events-none" aria-hidden="true" />
                                                            )}
                                                        </div>

                                                        {/* Fixed Slot 2: Copiar Link */}
                                                        <div>
                                                            {!isSigned && contract.signatureToken ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyTokenLink(contract.signatureToken)}
                                                                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/60 px-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-slate-600 hover:bg-slate-800 transition-all shrink-0 whitespace-nowrap"
                                                                    title="Copiar link direto para o cliente assinar"
                                                                >
                                                                    <Copy size={13} className="shrink-0" />
                                                                    Copiar Link
                                                                </button>
                                                            ) : (
                                                                <div className="h-8 w-full invisible pointer-events-none" aria-hidden="true" />
                                                            )}
                                                        </div>

                                                        {/* Fixed Slot 3: PDF / PDF Assinado */}
                                                        <div>
                                                            {isSigned && contract.signatureToken ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadPdf(contract.signatureToken, true)}
                                                                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold uppercase tracking-wider text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all shrink-0 whitespace-nowrap"
                                                                    title="Baixar PDF assinado com assinaturas digitais"
                                                                >
                                                                    <Download size={13} className="shrink-0" />
                                                                    PDF Assinado
                                                                </button>
                                                            ) : contract.signatureToken && !isSigned ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadPdf(contract.signatureToken, false)}
                                                                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/40 px-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-all shrink-0 whitespace-nowrap"
                                                                    title="Baixar minuta em PDF"
                                                                >
                                                                    <Download size={13} className="shrink-0" />
                                                                    PDF
                                                                </button>
                                                            ) : !contract.signatureToken && !isSigned ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadPdfById(contract.id)}
                                                                    className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/40 px-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-all shrink-0 whitespace-nowrap"
                                                                    title="Baixar minuta em PDF"
                                                                >
                                                                    <Download size={13} className="shrink-0" />
                                                                    PDF
                                                                </button>
                                                            ) : (
                                                                <div className="h-8 w-full invisible pointer-events-none" aria-hidden="true" />
                                                            )}
                                                        </div>

                                                        {/* Fixed Slot 4: Excluir */}
                                                        <div>
                                                            {!contract.proposalId ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteContract(contract.id)}
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:border-red-500/40 hover:bg-red-500/20 transition-all shrink-0"
                                                                    title="Apagar contrato avulso"
                                                                    aria-label="Apagar contrato avulso"
                                                                >
                                                                    <Trash2 size={13} className="shrink-0" />
                                                                </button>
                                                            ) : (
                                                                <div className="h-8 w-8 invisible pointer-events-none" aria-hidden="true" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
