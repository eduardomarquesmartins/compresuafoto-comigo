"use client";

import { useEffect, useState } from "react";
import { Copy, Download, Eye, FileText, Loader2, Mail, Signature } from "lucide-react";
import { createContract, downloadContractPdf, downloadPublicContractPdf, getClients, getContracts, getProposal, sendContractSignatureLink } from "@/lib/api";

const initialForm = {
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientDocument: "",
    clientAddress: "",
    clientCityState: "",
    signerName: "",
    signerDocument: "",
    scope: "gestão de redes sociais, incluindo planejamento, criação de conteúdo, publicações, acompanhamento estratégico e serviços de marketing digital conforme proposta aprovada",
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

export default function AdminContractsPage() {
    const [form, setForm] = useState(initialForm);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sendingEmailLink, setSendingEmailLink] = useState(false);
    const [copyingLink, setCopyingLink] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [contracts, setContracts] = useState<any[]>([]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        setForm((prev) => ({
            ...prev,
            contractDate: prev.contractDate || new Date().toLocaleDateString("pt-BR")
        }));

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

        loadClients();
        loadContracts();

        const params = new URLSearchParams(window.location.search);
        const proposalId = params.get("proposalId");
        if (!proposalId) return;

        const loadProposalData = async () => {
            try {
                setLoading(true);
                setErrorMessage(null);

                const proposal = await getProposal(proposalId);
                if (!proposal) return;

                const services = proposal.selectedServices || [];
                const servicesList = services
                    .map((service: any) => `**- ${service.name} (${service.category}): R$ ${Number(service.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**${service.description ? ` - ${service.description}` : ""}`)
                    .join("\n");

                const scopeText = `prestação de serviços de marketing digital e produção de conteúdo, compreendendo os seguintes itens da proposta comercial aprovada:\n\n${servicesList}`;
                const formattedTotal = typeof proposal.total === "number"
                    ? proposal.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                    : String(proposal.total || "");

                setForm((prev) => ({
                    ...prev,
                    clientId: proposal.clientId ? String(proposal.clientId) : proposal.client?.id ? String(proposal.client.id) : prev.clientId,
                    clientName: proposal.clientName || proposal.client?.name || prev.clientName,
                    clientEmail: proposal.client?.email || proposal.clientEmail || prev.clientEmail,
                    clientDocument: proposal.client?.document || prev.clientDocument,
                    clientAddress: proposal.client?.address || prev.clientAddress,
                    clientCityState: proposal.client?.cityState || prev.clientCityState,
                    monthlyValue: formattedTotal,
                    scope: scopeText
                }));
            } catch (error) {
                console.warn("Erro ao carregar dados da proposta:", error);
                setErrorMessage("Não consegui carregar os dados da proposta.");
            } finally {
                setLoading(false);
            }
        };

        loadProposalData();
    }, []);

    const updateField = (field: keyof typeof initialForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const updateDocument = (value: string) => {
        updateField("clientDocument", formatCpfCnpj(value));
    };

    const handleClientSelect = (clientId: string) => {
        const client = clients.find((item) => String(item.id) === clientId);
        setForm((prev) => ({
            ...prev,
            clientId,
            clientName: client?.name || prev.clientName,
            clientEmail: client?.email || prev.clientEmail,
            clientDocument: client?.document ? formatCpfCnpj(client.document) : prev.clientDocument,
            clientAddress: client?.address || prev.clientAddress,
            clientCityState: client?.cityState || prev.clientCityState
        }));
    };

    const selectedClient = clients.find((client) => String(client.id) === form.clientId);
    const resolvedClientEmail = (form.clientEmail || selectedClient?.email || "").trim();

    const getSignaturePayload = (delivery: "email" | "copy") => ({
        clientId: form.clientId ? Number(form.clientId) : undefined,
        clientName: form.clientName.trim(),
        clientEmail: resolvedClientEmail || undefined,
        clientDocument: form.clientDocument.trim() || undefined,
        clientAddress: form.clientAddress.trim() || undefined,
        clientCityState: form.clientCityState.trim() || undefined,
        signerName: form.signerName.trim() || undefined,
        signerDocument: form.signerDocument.trim() || undefined,
        scope: form.scope,
        monthlyValue: moneyToNumber(form.monthlyValue),
        durationMonths: form.durationMonths,
        paymentDay: form.paymentDay,
        contractDate: form.contractDate,
        delivery
    });

    const handleGenerate = async () => {
        setErrorMessage(null);

        if (!form.clientName.trim() || !form.clientDocument.trim()) {
            setErrorMessage("Informe o nome/razão social e o CPF ou CNPJ do contratante.");
            return;
        }

        try {
            setLoading(true);
            const blob = await downloadContractPdf({
                ...form,
                signerName: "",
                signerDocument: "",
                monthlyValue: moneyToNumber(form.monthlyValue)
            });

            if (form.clientId) {
                await createContract({
                    clientId: Number(form.clientId),
                    scope: form.scope,
                    monthlyValue: moneyToNumber(form.monthlyValue),
                    durationMonths: form.durationMonths,
                    paymentDay: form.paymentDay,
                    contractDate: form.contractDate
                });
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
        } catch (error) {
            const status = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;

            if (status === 404) {
                setErrorMessage("Não encontrei o endpoint de geração do contrato. Confirme se o backend local está rodando na porta 3002.");
            } else {
                setErrorMessage("Houve um erro ao gerar o contrato.");
            }

            console.warn("Erro ao gerar contrato:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateSignatureLinkRequest = (delivery: "email" | "copy") => {
        setErrorMessage(null);

        if (!form.clientName.trim()) {
            setErrorMessage("Informe o nome do contratante para gerar o link de assinatura.");
            return false;
        }

        if (delivery === "email" && !resolvedClientEmail) {
            setErrorMessage("Preencha um e-mail do contratante para enviar o link de assinatura.");
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
            alert(result?.message || `Link enviado com sucesso para ${resolvedClientEmail}.`);
            console.log("Link de assinatura:", result?.signLink);
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
            alert("Link de assinatura copiado.");
        } catch (error) {
            console.warn("Erro ao copiar link de assinatura:", error);
            setErrorMessage(getErrorMessage(error, "Houve um erro ao copiar o link de assinatura."));
        } finally {
            setCopyingLink(false);
        }
    };

    const handleOpenPublicContract = (token: string) => {
        window.open(`/assinar-contrato/${token}`, "_blank", "noopener,noreferrer");
    };

    const handleDownloadSignedPdf = async (token: string) => {
        try {
            const blob = await downloadPublicContractPdf(token);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `contrato_assinado.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.warn("Erro ao baixar contrato assinado:", error);
            setErrorMessage("Não consegui baixar o contrato assinado.");
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-20">
            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <span className="text-xs font-medium uppercase tracking-widest text-blue-500">Documentos</span>
                    <h1 className="mt-2 text-4xl font-light tracking-tight text-white">Gerador de Contratos</h1>
                </div>
            </header>

            {errorMessage && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {errorMessage}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <section className="space-y-8 rounded-2xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                <FileText size={20} />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Dados do Contratante</h2>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Cliente vinculado</span>
                                <select value={form.clientId} onChange={(e) => handleClientSelect(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35">
                                    <option value="">Sem vínculo / preencher manualmente</option>
                                    {clients.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.email ? `- ${client.email}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nome / Razão Social</span>
                                <input value={form.clientName} onChange={(e) => updateField("clientName", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Empresa" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">CPF / CNPJ</span>
                                <input value={form.clientDocument} onChange={(e) => updateDocument(e.target.value)} inputMode="numeric" className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="000.000.000-00 ou 00.000.000/0001-00" />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">E-mail</span>
                                <input value={form.clientEmail} onChange={(e) => updateField("clientEmail", e.target.value)} type="email" className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="cliente@empresa.com" />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Endereço</span>
                                <input value={form.clientAddress} onChange={(e) => updateField("clientAddress", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Rua, número, sala, bairro" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Cidade / UF</span>
                                <input value={form.clientCityState} onChange={(e) => updateField("clientCityState", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Porto Alegre/RS" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Data do Contrato</span>
                                <input value={form.contractDate} onChange={(e) => updateField("contractDate", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="03/06/2026" />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-white">Escopo e Pagamento</h2>
                        <label className="block space-y-2">
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Escopo dos Serviços</span>
                            <textarea value={form.scope} onChange={(e) => updateField("scope", e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" />
                        </label>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Valor Mensal</span>
                                <input value={form.monthlyValue} onChange={(e) => updateField("monthlyValue", e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="1000,00" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Vigência (meses)</span>
                                <input value={form.durationMonths} onChange={(e) => updateField("durationMonths", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="6" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dia de Pagamento</span>
                                <input value={form.paymentDay} onChange={(e) => updateField("paymentDay", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="25" />
                            </label>
                        </div>
                    </div>
                </section>

                <aside className="sticky top-6 h-fit space-y-5 rounded-2xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Contrato</p>
                        <h2 className="mt-1 text-xl font-semibold text-white">{form.clientName || "Novo contrato"}</h2>
                    </div>
                    <div className="space-y-3 text-sm text-slate-400">
                        <p><span className="text-slate-500">Documento:</span> {form.clientDocument || "-"}</p>
                        <p><span className="text-slate-500">Cliente:</span> {form.clientId ? "Vinculado" : "Sem vínculo"}</p>
                        <p><span className="text-slate-500">E-mail:</span> {resolvedClientEmail || "-"}</p>
                        <p><span className="text-slate-500">Valor:</span> R$ {form.monthlyValue || "0"}</p>
                        <p><span className="text-slate-500">Vigência:</span> {form.durationMonths || "0"} meses</p>
                        <p><span className="text-slate-500">Pagamento:</span> todo dia {form.paymentDay || "-"}</p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                        <span key={loading ? "loading" : "idle"} className="inline-flex items-center gap-3">
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                            {loading ? "Gerando..." : "Gerar Contrato"}
                        </span>
                    </button>
                    <button
                        onClick={handleSendSignatureLinkEmail}
                        disabled={loading || sendingEmailLink || copyingLink}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 font-bold text-white transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                        <span key={sendingEmailLink ? "sending-email" : "idle-email"} className="inline-flex items-center gap-3">
                            {sendingEmailLink ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                            {sendingEmailLink ? "Enviando e-mail..." : "Enviar link por e-mail"}
                        </span>
                    </button>
                    <button
                        onClick={handleCopySignatureLink}
                        disabled={loading || sendingEmailLink || copyingLink}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 font-bold text-white transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                        <span key={copyingLink ? "copying-link" : "idle-copy"} className="inline-flex items-center gap-3">
                            {copyingLink ? <Loader2 size={20} className="animate-spin" /> : <Copy size={20} />}
                            {copyingLink ? "Copiando link..." : "Copiar link de assinatura"}
                        </span>
                    </button>
                </aside>
            </div>

            <section className="rounded-2xl border border-white/10 bg-[#161826] p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        <Signature size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Contratos</p>
                        <h2 className="text-lg font-semibold text-white">Assinados e pendentes</h2>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full text-left">
                        <thead className="bg-black/30">
                            <tr className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                            {contracts.length === 0 ? (
                                <tr>
                                    <td className="px-4 py-4" colSpan={3}>Nenhum contrato encontrado.</td>
                                </tr>
                            ) : contracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-white/[0.02]">
                                    <td className="px-4 py-4">
                                        <div className="font-medium text-white">{contract.client?.name || "-"}</div>
                                        <div className="text-xs text-slate-500">{contract.client?.email || "-"}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${contract.signedAt ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                                            {contract.signedAt ? "Assinado" : "Pendente"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {contract.signatureToken && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPublicContract(contract.signatureToken)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-slate-200 hover:border-blue-500/40 hover:bg-blue-500/10"
                                                >
                                                    <Eye size={14} />
                                                    Ver
                                                </button>
                                            )}
                                            {contract.signedAt && contract.signatureToken && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownloadSignedPdf(contract.signatureToken)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-emerald-200 hover:border-emerald-400/40 hover:bg-emerald-500/15"
                                                >
                                                    <Download size={14} />
                                                    PDF assinado
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
