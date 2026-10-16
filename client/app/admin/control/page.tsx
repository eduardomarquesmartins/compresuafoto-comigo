"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    CheckCircle2,
    ClipboardCheck,
    ListChecks,
    Loader2,
    ShieldAlert,
    TrendingDown,
    TrendingUp,
    Wallet
} from "lucide-react";
import { getDebts, getDemands, getFinancials, getFinancialStats } from "@/lib/api";

type FinancialStats = {
    incomes: number;
    expenses: number;
    balance: number;
    forecast: number;
};

type FinancialRecord = {
    id: number;
    type: "INCOME" | "EXPENSE";
    description: string;
    amount: number;
    status: string;
    date: string;
    category?: string;
};

type Debt = {
    id: number;
    priority?: string;
    credor: string;
    holder?: string;
    originalAmount: number;
    bestOffer: number;
    status?: string;
    type?: string;
    obs?: string;
    isCnpj?: boolean;
};

type Demand = {
    id: number;
    area?: string;
    action: string;
    deadline?: string;
    responsible?: string;
    status?: string;
    type?: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const normalizeStatus = (value?: string) => String(value || "").trim().toLowerCase();
const isPaidLike = (value?: string) => {
    const status = normalizeStatus(value);
    return status.includes("pago") || status.includes("quitado") || status.includes("concluído") || status.includes("concluido") || status.includes("realizada");
};

const isAttentionDebt = (debt: Debt) => {
    const text = `${debt.priority || ""} ${debt.status || ""} ${debt.obs || ""}`.toLowerCase();
    return !isPaidLike(debt.status) && (text.includes("🔴") || text.includes("urgente") || text.includes("processo") || text.includes("negociar"));
};

const isDoneDemand = (demand: Demand) => isPaidLike(demand.status);
const isUrgentDemand = (demand: Demand) => normalizeStatus(demand.status).includes("urgente");

const currentMonth = String(new Date().getMonth() + 1);
const currentYear = String(new Date().getFullYear());

export default function AdminControlPage() {
    const [stats, setStats] = useState<FinancialStats>({ incomes: 0, expenses: 0, balance: 0, forecast: 0 });
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [demands, setDemands] = useState<Demand[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadControl = async () => {
            try {
                setLoading(true);
                setError(null);

                const [statsData, recordsData, debtsData, demandsData] = await Promise.all([
                    getFinancialStats({ month: currentMonth, year: currentYear }),
                    getFinancials({ month: currentMonth, year: currentYear }),
                    getDebts(),
                    getDemands()
                ]);

                if (!isMounted) return;

                setStats({
                    incomes: Number(statsData?.incomes || 0),
                    expenses: Number(statsData?.expenses || 0),
                    balance: Number(statsData?.balance || 0),
                    forecast: Number(statsData?.forecast || 0)
                });
                setRecords(Array.isArray(recordsData) ? recordsData : []);
                setDebts(Array.isArray(debtsData) ? debtsData : []);
                setDemands(Array.isArray(demandsData) ? demandsData : []);
            } catch (loadError) {
                console.error("Erro ao carregar central de controle:", loadError);
                if (isMounted) setError("Não foi possível carregar todos os dados de controle agora.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadControl();

        return () => {
            isMounted = false;
        };
    }, []);

    const control = useMemo(() => {
        const pendingIncomes = records.filter((record) => record.type === "INCOME" && !isPaidLike(record.status));
        const pendingExpenses = records.filter((record) => record.type === "EXPENSE" && !isPaidLike(record.status));
        const openDebts = debts.filter((debt) => !isPaidLike(debt.status));
        const attentionDebts = debts.filter(isAttentionDebt);
        const activeDemands = demands.filter((demand) => !isDoneDemand(demand));
        const urgentDemands = demands.filter(isUrgentDemand);
        const completedDemands = demands.length - activeDemands.length;
        const totalDebtOriginal = debts.reduce((total, debt) => total + Number(debt.originalAmount || 0), 0);
        const totalDebtOffer = debts.reduce((total, debt) => total + Number(debt.bestOffer || debt.originalAmount || 0), 0);
        const pendingIncomeValue = pendingIncomes.reduce((total, record) => total + Number(record.amount || 0), 0);
        const pendingExpenseValue = pendingExpenses.reduce((total, record) => total + Number(record.amount || 0), 0);

        return {
            pendingIncomes,
            pendingExpenses,
            openDebts,
            attentionDebts,
            activeDemands,
            urgentDemands,
            completedDemands,
            totalDebtOriginal,
            totalDebtOffer,
            pendingIncomeValue,
            pendingExpenseValue
        };
    }, [debts, demands, records]);

    const alerts = useMemo(() => {
        const items: Array<{ title: string; detail: string; href: string; tone: "red" | "amber" | "blue" | "green" }> = [];

        if (stats.balance < 0) {
            items.push({
                title: "Saldo do mês negativo",
                detail: `${currency.format(Math.abs(stats.balance))} abaixo do equilíbrio.`,
                href: "/admin/finance",
                tone: "red"
            });
        }

        if (control.pendingIncomes.length > 0) {
            items.push({
                title: "Receitas pendentes",
                detail: `${control.pendingIncomes.length} lançamento(s), ${currency.format(control.pendingIncomeValue)} em aberto.`,
                href: "/admin/finance",
                tone: "amber"
            });
        }

        if (control.attentionDebts.length > 0) {
            items.push({
                title: "Dívidas pedindo atenção",
                detail: `${control.attentionDebts.length} item(ns) em negociação, urgência ou processo.`,
                href: "/admin/debts",
                tone: "red"
            });
        }

        if (control.urgentDemands.length > 0) {
            items.push({
                title: "Demandas urgentes",
                detail: `${control.urgentDemands.length} demanda(s) marcadas como urgente.`,
                href: "/admin/demands",
                tone: "amber"
            });
        }

        if (items.length === 0) {
            items.push({
                title: "Operação sem alertas críticos",
                detail: "Financeiro, demandas e dívidas não têm sinal vermelho no momento.",
                href: "/admin/control",
                tone: "green"
            });
        }

        return items.slice(0, 4);
    }, [control, stats.balance]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0a72ef]" />
                    <p className="text-sm text-zinc-500">Carregando visão geral…</p>
                </div>
            </div>
        );
    }

    const metricCards = [
        {
            label: "Entradas do mês",
            value: currency.format(stats.incomes),
            note: `${control.pendingIncomes.length} lançamento(s) pendentes`,
            icon: TrendingUp,
            tone: "emerald",
        },
        {
            label: "Saídas do mês",
            value: currency.format(stats.expenses),
            note: `${control.pendingExpenses.length} lançamento(s) pendentes`,
            icon: TrendingDown,
            tone: "rose",
        },
        {
            label: "Saldo realizado",
            value: currency.format(stats.balance),
            note: `Previsão: ${currency.format(stats.forecast)}`,
            icon: Wallet,
            tone: stats.balance >= 0 ? "blue" : "amber",
        },
        {
            label: "Demandas ativas",
            value: String(control.activeDemands.length),
            note: `${control.completedDemands} concluída(s)`,
            icon: ListChecks,
            tone: "violet",
        },
    ] as const;

    return (
        <div className="admin-page-stack space-y-6 pb-12 animate-in fade-in duration-500">
            {error && (
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-amber-950">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                        <div>
                            <p className="text-sm font-semibold">Dados parciais</p>
                            <p className="mt-1 text-sm text-amber-800">{error}</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => window.location.reload()} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100">
                        Tentar novamente
                    </button>
                </div>
            )}

            <section className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_2px_10px_rgba(30,41,59,0.035)] sm:p-7 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0758d8]">Painel administrativo</span>
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 sm:text-[34px]">Visão geral</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Financeiro, rotina da equipe e pontos que precisam da sua atenção.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/admin/finance" className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                        <Banknote size={16} /> Financeiro
                    </Link>
                    <Link href="/admin/demands" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0758d8] px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#064bb8]">
                        <ClipboardCheck size={16} /> Abrir demandas
                    </Link>
                </div>
            </section>

            <section aria-label="Indicadores do mês" className="admin-metric-grid grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                {metricCards.map((metric) => {
                    const Icon = metric.icon;
                    const toneClasses = {
                        emerald: "bg-emerald-50 text-emerald-700",
                        rose: "bg-rose-50 text-rose-700",
                        blue: "bg-blue-50 text-blue-700",
                        amber: "bg-amber-50 text-amber-700",
                        violet: "bg-violet-50 text-violet-700",
                    }[metric.tone];
                    const cardToneClasses = {
                        emerald: "border-zinc-300 bg-white hover:border-zinc-400",
                        rose: "border-zinc-300 bg-white hover:border-zinc-400",
                        blue: "border-zinc-300 bg-white hover:border-zinc-400",
                        amber: "border-zinc-300 bg-white hover:border-zinc-400",
                        violet: "border-zinc-300 bg-white hover:border-zinc-400",
                    }[metric.tone];
                    return (
                        <article key={metric.label} className={`min-w-0 rounded-2xl border-2 p-4 shadow-[0_6px_18px_rgba(30,41,59,0.09)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(30,41,59,0.14)] sm:p-5 ${cardToneClasses}`}>
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}><Icon size={17} /></span>
                            </div>
                            <p className="mt-5 truncate text-[26px] font-semibold tracking-[-0.045em] text-zinc-950">{metric.value}</p>
                            <p className="mt-1.5 truncate text-xs text-zinc-500">{metric.note}</p>
                        </article>
                    );
                })}
            </section>

            <section className="admin-dashboard-panels grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_10px_rgba(30,41,59,0.035)]">
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Rotina</p>
                            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Demandas em andamento</h2>
                        </div>
                        <Link href="/admin/demands" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#0758d8] transition hover:bg-blue-50">
                            Ver todas <ArrowRight size={14} />
                        </Link>
                    </div>

                    {control.activeDemands.length > 0 ? (
                        <div className="divide-y divide-zinc-100">
                            {control.activeDemands.slice(0, 6).map((demand) => (
                                <Link key={demand.id} href="/admin/demands" className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 transition hover:bg-zinc-50 sm:px-6 sm:grid-cols-[minmax(0,1fr)_minmax(110px,0.55fr)_auto]">
                                    <span className="min-w-0">
                                        <strong className="block truncate text-sm font-semibold text-zinc-800 group-hover:text-[#0758d8]">{demand.action}</strong>
                                        <small className="mt-1 block truncate text-xs text-zinc-500">{demand.area || "Sem área"} · {demand.responsible || "Sem responsável"}</small>
                                    </span>
                                    <span className="hidden min-w-0 truncate text-xs text-zinc-500 sm:block">{demand.deadline || "Sem prazo"}</span>
                                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${isUrgentDemand(demand) ? "border-amber-200 bg-amber-50 text-amber-800" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                                        {demand.status || "Pendente"}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="px-6 py-12 text-center">
                            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={21} /></span>
                            <p className="mt-3 text-sm font-semibold text-zinc-800">Tudo em dia</p>
                            <p className="mt-1 text-xs text-zinc-500">Não há demandas abertas no momento.</p>
                        </div>
                    )}
                    {control.activeDemands.length > 6 && (
                        <Link href="/admin/demands" className="block border-t border-zinc-100 px-6 py-3 text-center text-xs font-semibold text-zinc-500 transition hover:bg-zinc-50 hover:text-[#0758d8]">
                            + {control.activeDemands.length - 6} demandas
                        </Link>
                    )}
                </div>

                <aside className="min-w-0 rounded-2xl border border-zinc-200 bg-white shadow-[0_2px_10px_rgba(30,41,59,0.035)]">
                    <div className="border-b border-zinc-100 px-5 py-4 sm:px-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Acompanhar</p>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">Pontos de atenção</h2>
                    </div>
                    <div className="divide-y divide-zinc-100 px-5 sm:px-6">
                        {alerts.map((alert) => {
                            const accent = alert.tone === "red" ? "bg-rose-50 text-rose-700" : alert.tone === "amber" ? "bg-amber-50 text-amber-700" : alert.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";
                            return (
                                <Link key={alert.title} href={alert.href} className="flex items-center gap-3 py-4 transition hover:translate-x-0.5">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent}`}><AlertTriangle size={16} /></span>
                                    <span className="min-w-0 flex-1">
                                        <strong className="block truncate text-sm font-semibold text-zinc-800">{alert.title}</strong>
                                        <small className="mt-1 block text-xs leading-5 text-zinc-500">{alert.detail}</small>
                                    </span>
                                    <ArrowRight size={15} className="shrink-0 text-zinc-400" />
                                </Link>
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 p-4 sm:p-5">
                        <Link href="/admin/debts" className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                            <ShieldAlert size={15} className="text-zinc-500" /> Dívidas
                        </Link>
                        <Link href="/admin/finance" className="flex items-center gap-2 rounded-xl border border-zinc-200 p-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                            <Banknote size={15} className="text-zinc-500" /> Financeiro
                        </Link>
                    </div>
                </aside>
            </section>
        </div>
    );
}
