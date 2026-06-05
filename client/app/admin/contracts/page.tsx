"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { downloadContractPdf, getProposal } from "@/lib/api";

const initialForm = {
    clientName: "",
    clientDocument: "",
    clientAddress: "",
    clientCityState: "",
    signerName: "",
    signerDocument: "",
    scope: "gestão de redes sociais, incluindo planejamento, criação de conteúdo, publicações, acompanhamento estratégico e serviços de marketing digital conforme proposta aprovada",
    monthlyValue: "1000",
    durationMonths: "6",
    paymentDay: "25",
    contractDate: new Date().toLocaleDateString("pt-BR")
};

const moneyToNumber = (value: string) => {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
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

export default function AdminContractsPage() {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;

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
                    .map((s: any) => `- ${s.name} (${s.category}): R$ ${Number(s.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${s.description ? ` - ${s.description}` : ""}`)
                    .join("\n");

                const scopeText = `prestação de serviços de marketing digital e produção de conteúdo, compreendendo os seguintes itens da proposta comercial aprovada:\n\n${servicesList}`;
                const formattedTotal = typeof proposal.total === "number"
                    ? proposal.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                    : String(proposal.total || "");

                setForm(prev => ({
                    ...prev,
                    clientName: proposal.clientName || "",
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
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        setErrorMessage(null);

        if (!form.clientName.trim() || !form.clientDocument.trim()) {
            setErrorMessage("Informe o nome/razao social e o CNPJ do contratante.");
            return;
        }

        try {
            setLoading(true);
            const blob = await downloadContractPdf({
                ...form,
                monthlyValue: moneyToNumber(form.monthlyValue)
            });

            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = filenameFromClient(form.clientName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
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
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nome / Razao Social</span>
                                <input value={form.clientName} onChange={e => updateField("clientName", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Empresa" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">CNPJ</span>
                                <input value={form.clientDocument} onChange={e => updateField("clientDocument", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="00.000.000/0001-00" />
                            </label>
                            <label className="space-y-2 md:col-span-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Endereco</span>
                                <input value={form.clientAddress} onChange={e => updateField("clientAddress", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Rua, numero, sala, bairro" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Cidade / UF</span>
                                <input value={form.clientCityState} onChange={e => updateField("clientCityState", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Porto Alegre/RS" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Data do Contrato</span>
                                <input value={form.contractDate} onChange={e => updateField("contractDate", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="03/06/2026" />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-white">Escopo e Pagamento</h2>
                        <label className="block space-y-2">
                            <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Escopo dos Servicos</span>
                            <textarea value={form.scope} onChange={e => updateField("scope", e.target.value)} rows={5} className="w-full resize-none rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" />
                        </label>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Valor Mensal</span>
                                <input value={form.monthlyValue} onChange={e => updateField("monthlyValue", e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="1000,00" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Vigência (meses)</span>
                                <input value={form.durationMonths} onChange={e => updateField("durationMonths", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="6" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dia de Pagamento</span>
                                <input value={form.paymentDay} onChange={e => updateField("paymentDay", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="25" />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-white">Representante do Cliente</h2>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nome do Representante</span>
                                <input value={form.signerName} onChange={e => updateField("signerName", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="Nome completo" />
                            </label>
                            <label className="space-y-2">
                                <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">CPF do Representante</span>
                                <input value={form.signerDocument} onChange={e => updateField("signerDocument", e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35" placeholder="000.000.000-00" />
                            </label>
                        </div>
                    </div>
                </section>

                <aside className="h-fit space-y-5 rounded-2xl border border-white/10 bg-[#161826] p-6 shadow-2xl sticky top-6">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Contrato</p>
                        <h2 className="mt-1 text-xl font-semibold text-white">{form.clientName || "Novo contrato"}</h2>
                    </div>
                    <div className="space-y-3 text-sm text-slate-400">
                        <p><span className="text-slate-500">CNPJ:</span> {form.clientDocument || "-"}</p>
                        <p><span className="text-slate-500">Valor:</span> R$ {form.monthlyValue || "0"}</p>
                        <p><span className="text-slate-500">Vigência:</span> {form.durationMonths || "0"} meses</p>
                        <p><span className="text-slate-500">Pagamento:</span> todo dia {form.paymentDay || "-"}</p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                        {loading ? "Gerando..." : "Gerar Contrato"}
                    </button>
                </aside>
            </div>
        </div>
    );
}
