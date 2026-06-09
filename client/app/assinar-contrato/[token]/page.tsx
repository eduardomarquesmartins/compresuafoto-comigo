"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, PenLine } from "lucide-react";
import { downloadPublicContractPdf, getPublicContract, signPublicContract } from "@/lib/api";
import { useParams } from "next/navigation";

const money = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SignContractPage() {
    const params = useParams<{ token: string }>();
    const token = typeof params?.token === "string" ? params.token : Array.isArray(params?.token) ? params.token[0] : "";

    const [contract, setContract] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signed, setSigned] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [signerDocument, setSignerDocument] = useState("");
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (!token) return;

        const loadContract = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getPublicContract(token);
                setContract(data);
                setSignerName(data.signedName || data.client?.signerName || "");
                setSignerDocument(data.signedDocument || data.client?.signerDocument || "");
                setSigned(Boolean(data.signedAt));
            } catch (err) {
                console.warn("Erro ao carregar contrato público:", err);
                setError("Não consegui carregar esse contrato.");
            } finally {
                setLoading(false);
            }
        };

        loadContract();
    }, [token]);

    const handleSign = async () => {
        if (!signerName.trim() || !signerDocument.trim()) {
            setError("Preencha o nome e o documento do assinante.");
            return;
        }

        if (!accepted) {
            setError("Você precisa aceitar os termos antes de assinar.");
            return;
        }

        try {
            setSigning(true);
            setError(null);
            const result = await signPublicContract(token, {
                signerName,
                signerDocument
            });
            setContract((prev: any) => prev ? { ...prev, signedAt: result?.contract?.signedAt, signedName: signerName, signedDocument: signerDocument, status: "ACTIVE" } : prev);
            setSigned(true);
        } catch (err) {
            console.warn("Erro ao assinar contrato:", err);
            setError("Houve um erro ao registrar sua assinatura.");
        } finally {
            setSigning(false);
        }
    };

    const handleDownload = async () => {
        try {
            const blob = await downloadPublicContractPdf(token);
            const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `contrato_${String(contract?.client?.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.warn("Erro ao baixar PDF do contrato:", err);
            setError("Não consegui baixar o PDF do contrato.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0d14] text-white">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <Loader2 className="animate-spin text-blue-500" size={20} />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">Carregando contrato</span>
                </div>
            </div>
        );
    }

    if (error && !contract) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0b0d14] p-6 text-white">
                <div className="max-w-xl rounded-3xl border border-white/10 bg-[#161826] p-8 text-center">
                    <p className="text-xl font-bold">Contrato indisponível</p>
                    <p className="mt-3 text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0d14] text-white">
            <div className="mx-auto max-w-5xl px-4 py-10">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Assinatura digital</p>
                        <h1 className="mt-2 text-4xl font-light tracking-tight">Contrato para assinatura</h1>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:border-blue-500/40 hover:bg-blue-500/10"
                    >
                        <Download size={16} />
                        Baixar PDF
                    </button>
                </div>

                {error && (
                    <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-3xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Resumo</p>
                                <h2 className="text-xl font-semibold text-white">{contract?.client?.name || "Cliente"}</h2>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-slate-300">
                            <p><span className="text-slate-500">Documento:</span> {contract?.client?.document || "-"}</p>
                            <p><span className="text-slate-500">Valor mensal:</span> R$ {money(Number(contract?.monthlyValue || 0))}</p>
                            <p><span className="text-slate-500">Vigência:</span> {contract?.durationMonths || "-"} meses</p>
                            <p><span className="text-slate-500">Pagamento:</span> todo dia {contract?.paymentDay || "-"}</p>
                            <p className="leading-relaxed"><span className="text-slate-500">Escopo:</span> {contract?.scope || "-"}</p>
                        </div>

                        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
                            Leia o contrato no PDF, confira os dados e conclua a assinatura abaixo.
                        </div>
                    </section>

                    <aside className="rounded-3xl border border-white/10 bg-[#161826] p-6 shadow-2xl">
                        {signed ? (
                            <div className="space-y-4 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                    <CheckCircle2 size={28} />
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-white">Contrato assinado</p>
                                    <p className="mt-2 text-sm text-slate-400">Sua assinatura foi registrada com sucesso.</p>
                                </div>
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-blue-500"
                                >
                                    <Download size={16} />
                                    Baixar versão final
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                        <PenLine size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Assinatura</p>
                                        <h2 className="text-xl font-semibold text-white">Confirmar documento</h2>
                                    </div>
                                </div>

                                <label className="block space-y-2">
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Nome do assinante</span>
                                    <input
                                        value={signerName}
                                        onChange={e => setSignerName(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
                                        placeholder="Nome completo"
                                    />
                                </label>

                                <label className="block space-y-2">
                                    <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">CPF / CNPJ</span>
                                    <input
                                        value={signerDocument}
                                        onChange={e => setSignerDocument(e.target.value)}
                                        className="w-full rounded-xl border border-white/10 bg-[#0f111a] px-4 py-3 text-white outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
                                        placeholder="Documento do assinante"
                                    />
                                </label>

                                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={accepted}
                                        onChange={e => setAccepted(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-blue-500 focus:ring-blue-500/20"
                                    />
                                    <span>Li o contrato e confirmo que estou autorizado a assiná-lo digitalmente.</span>
                                </label>

                                <button
                                    onClick={handleSign}
                                    disabled={signing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500"
                                >
                                    {signing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    {signing ? "Assinando..." : "Assinar contrato"}
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}
