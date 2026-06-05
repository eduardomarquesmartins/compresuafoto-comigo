"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    FileSpreadsheet,
    Loader2,
    Upload,
    Wallet,
    ShieldAlert,
    ClipboardCheck,
    Users
} from "lucide-react";
import { importExcel } from "@/lib/api";

type ImportResult = {
    message?: string;
    summary?: {
        clients?: number;
        contracts?: number;
        incomesAndExpenses?: number;
        debts?: number;
        mentoriaDemands?: number;
    };
};

const summaryItems = [
    { key: "clients", label: "Clientes", icon: Users },
    { key: "contracts", label: "Contratos", icon: FileSpreadsheet },
    { key: "incomesAndExpenses", label: "Lançamentos", icon: Wallet },
    { key: "debts", label: "Dívidas", icon: ShieldAlert },
    { key: "mentoriaDemands", label: "Demandas", icon: ClipboardCheck }
] as const;

const importedFinanceHref = "/admin/finance?month=5&year=2026";

export default function AdminImportsPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);

    const handleImport = async () => {
        if (!selectedFile) {
            setError("Selecione uma planilha Excel antes de importar.");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);
            const response = await importExcel(selectedFile);
            setResult(response);
        } catch (importError: any) {
            console.error("Erro ao importar planilha:", importError);
            setError(importError.response?.data?.error || "Não foi possível importar a planilha.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="admin-page-stack pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="admin-card p-5 md:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className="admin-kicker">Importação</span>
                        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-none tracking-[-0.055em] text-white md:text-6xl">
                            Importar histórico da planilha.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                            Use esta área somente para trazer dados antigos ou migrar uma planilha oficial. Depois disso, o fluxo normal continua pelo próprio sistema.
                        </p>
                    </div>

                    <Link href={importedFinanceHref} className="admin-secondary-button">
                        Ir para financeiro
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="admin-card p-5 md:p-6">
                    <div className="mb-7 flex items-center gap-3">
                        <div className="admin-metric-icon text-[#9ecbff]">
                            <FileSpreadsheet size={18} />
                        </div>
                        <div>
                            <span className="admin-kicker">Arquivo Excel</span>
                            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-white">Enviar planilha</h2>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(event) => {
                            setError(null);
                            setResult(null);
                            setSelectedFile(event.target.files?.[0] || null);
                        }}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex min-h-[170px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/25 px-6 py-8 text-center transition hover:border-blue-400/40 hover:bg-blue-500/5"
                    >
                        <Upload className="mb-4 text-[#9ecbff]" size={28} />
                        <strong className="text-base text-white">{selectedFile ? selectedFile.name : "Selecionar planilha"}</strong>
                        <span className="mt-2 text-sm text-slate-500">Formatos aceitos: .xlsx e .xls</span>
                    </button>

                    {error && (
                        <div className="mt-5 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={loading || !selectedFile}
                            className="admin-primary-button disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                            {loading ? "Importando..." : "Importar dados"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedFile(null);
                                setResult(null);
                                setError(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="admin-secondary-button"
                        >
                            Limpar seleção
                        </button>
                    </div>
                </section>

                <aside className="admin-card p-5 md:p-6">
                    <div className="admin-warning-icon">
                        <AlertTriangle size={18} />
                    </div>
                    <h2 className="mt-6 text-2xl font-semibold tracking-[-0.045em] text-white">Quando usar</h2>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                        <p>Use para importar dados que já estão em planilhas, sem cadastrar tudo manualmente.</p>
                        <p>Depois da importação, receitas, despesas, dívidas e demandas devem ser atualizadas pelas telas do sistema.</p>
                        <p>Os lançamentos financeiros dessa planilha entram em maio de 2026.</p>
                        <p className="text-amber-100">A importação atual limpa e substitui algumas áreas históricas, então use com atenção.</p>
                    </div>
                </aside>
            </div>

            {result && (
                <section className="admin-card p-5 md:p-6">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="admin-metric-icon text-emerald-300">
                            <CheckCircle2 size={18} />
                        </div>
                        <div>
                            <span className="admin-kicker">Resultado</span>
                            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-white">{result.message || "Importação concluída"}</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {summaryItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <article key={item.key} className="rounded-lg border border-white/10 bg-black/25 p-4">
                                    <Icon className="text-[#9ecbff]" size={18} />
                                    <p className="mt-5 admin-metric-label">{item.label}</p>
                                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{result.summary?.[item.key] || 0}</p>
                                </article>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Link href={importedFinanceHref} className="admin-primary-button">
                            Ver financeiro importado
                            <ArrowRight size={16} />
                        </Link>
                        <Link href="/admin/control" className="admin-secondary-button">
                            Ver controle
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>
            )}
        </div>
    );
}
