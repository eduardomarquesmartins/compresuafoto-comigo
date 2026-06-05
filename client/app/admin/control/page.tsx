"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    CheckCircle2,
    ClipboardCheck,
    Clock3,
    DollarSign,
    FileSpreadsheet,
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
            <div className="admin-loading-card flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-9 w-9 animate-spin text-[#0a72ef]" />
                    <p className="admin-microcopy">Carregando central de controle</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page-stack pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {error && (
                <div className="admin-warning-banner">
                    <div className="flex gap-3">
                        <div className="admin-warning-icon">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Dados parciais</p>
                            <p className="mt-1 text-sm text-slate-400">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <section className="admin-card p-5 md:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <span className="admin-kicker">Controle</span>
                        <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-none tracking-[-0.055em] text-white md:text-6xl">
                            Central operacional.
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">
                            Financeiro, dívidas e demandas em uma visão única para priorizar a rotina administrativa.
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                        <Link href="/admin/finance" className="admin-secondary-button">
                            <Banknote size={16} />
                            Financeiro
                        </Link>
                        <Link href="/admin/debts" className="admin-secondary-button">
                            <ShieldAlert size={16} />
                            Dívidas
                        </Link>
                        <Link href="/admin/demands" className="admin-secondary-button">
                            <ClipboardCheck size={16} />
                            Demandas
                        </Link>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="admin-metric-card">
                    <div className="admin-metric-icon text-emerald-300">
                        <TrendingUp size={18} />
                    </div>
                    <div className="mt-8">
                        <p className="admin-metric-label">Entradas do mês</p>
                        <p className="mt-2 truncate text-3xl font-semibold tracking-[-0.05em] text-white">{currency.format(stats.incomes)}</p>
                        <p className="mt-3 text-sm text-slate-500">{control.pendingIncomes.length} pendente(s)</p>
                    </div>
                </article>

                <article className="admin-metric-card">
                    <div className="admin-metric-icon text-red-300">
                        <TrendingDown size={18} />
                    </div>
                    <div className="mt-8">
                        <p className="admin-metric-label">Saídas do mês</p>
                        <p className="mt-2 truncate text-3xl font-semibold tracking-[-0.05em] text-white">{currency.format(stats.expenses)}</p>
                        <p className="mt-3 text-sm text-slate-500">{control.pendingExpenses.length} pendente(s)</p>
                    </div>
                </article>

                <article className="admin-metric-card">
                    <div className={`admin-metric-icon ${stats.balance >= 0 ? "text-[#9ecbff]" : "text-amber-300"}`}>
                        <Wallet size={18} />
                    </div>
                    <div className="mt-8">
                        <p className="admin-metric-label">Saldo realizado</p>
                        <p className={`mt-2 truncate text-3xl font-semibold tracking-[-0.05em] ${stats.balance >= 0 ? "text-white" : "text-amber-200"}`}>{currency.format(stats.balance)}</p>
                        <p className="mt-3 text-sm text-slate-500">Previsão: {currency.format(stats.forecast)}</p>
                    </div>
                </article>

                <article className="admin-metric-card">
                    <div className="admin-metric-icon text-blue-300">
                        <ListChecks size={18} />
                    </div>
                    <div className="mt-8">
                        <p className="admin-metric-label">Demandas ativas</p>
                        <p className="mt-2 truncate text-3xl font-semibold tracking-[-0.05em] text-white">{control.activeDemands.length}</p>
                        <p className="mt-3 text-sm text-slate-500">{control.completedDemands} concluída(s)</p>
                    </div>
                </article>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                <section className="admin-card p-5 md:p-6">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                            <span className="admin-kicker">Prioridades</span>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">Fila de controle</h2>
                        </div>
                        <Link href="/admin/demands" className="admin-pill hover:border-blue-400/40 hover:text-white">
                            Ver tudo
                            <ArrowRight size={13} />
                        </Link>
                    </div>

                    <div className="grid gap-3">
                        {control.activeDemands.slice(0, 5).map((demand) => (
                            <Link key={demand.id} href="/admin/demands" className="admin-action-link">
                                <span className="min-w-0">
                                    <strong className="truncate">{demand.action}</strong>
                                    <small>{demand.area || "Sem área"} · {demand.responsible || "Sem responsável"} · {demand.deadline || "Sem prazo"}</small>
                                </span>
                                <span className={`admin-pill ${isUrgentDemand(demand) ? "border-amber-400/30 text-amber-200" : ""}`}>{demand.status || "Pendente"}</span>
                            </Link>
                        ))}

                        {control.activeDemands.length === 0 && (
                            <div className="admin-empty-state mx-auto">
                                <CheckCircle2 className="mx-auto mb-3 text-emerald-300" size={28} />
                                <p className="text-sm font-medium text-white">Sem demandas abertas</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">A fila de controle está limpa.</p>
                            </div>
                        )}
                    </div>
                </section>

                <aside className="admin-card p-5 md:p-6">
                    <span className="admin-kicker">Sinais</span>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">Alertas do controle</h2>

                    <div className="mt-6 space-y-3">
                        {alerts.map((alert) => (
                            <Link key={alert.title} href={alert.href} className="admin-action-link">
                                <span>
                                    <strong>{alert.title}</strong>
                                    <small>{alert.detail}</small>
                                </span>
                                <AlertTriangle
                                    size={16}
                                    className={
                                        alert.tone === "red" ? "text-red-300" :
                                        alert.tone === "amber" ? "text-amber-300" :
                                        alert.tone === "green" ? "text-emerald-300" :
                                        "text-[#9ecbff]"
                                    }
                                />
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <section className="admin-card p-5 md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="admin-metric-icon text-[#9ecbff]">
                            <DollarSign size={18} />
                        </div>
                        <span className="admin-pill">{records.length} lançamento(s)</span>
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-white">Rotina financeira</h3>
                    <div className="mt-5 space-y-3 text-sm text-slate-400">
                        <p className="flex justify-between gap-3"><span>Receitas em aberto</span><strong className="text-white">{currency.format(control.pendingIncomeValue)}</strong></p>
                        <p className="flex justify-between gap-3"><span>Despesas em aberto</span><strong className="text-white">{currency.format(control.pendingExpenseValue)}</strong></p>
                    </div>
                    <Link href="/admin/finance" className="admin-primary-button mt-6 w-full">
                        Abrir financeiro
                        <ArrowRight size={16} />
                    </Link>
                </section>

                <section className="admin-card p-5 md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="admin-metric-icon text-red-300">
                            <ShieldAlert size={18} />
                        </div>
                        <span className="admin-pill">{control.openDebts.length} aberta(s)</span>
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-white">Passivos e acordos</h3>
                    <div className="mt-5 space-y-3 text-sm text-slate-400">
                        <p className="flex justify-between gap-3"><span>Valor original</span><strong className="text-white">{currency.format(control.totalDebtOriginal)}</strong></p>
                        <p className="flex justify-between gap-3"><span>Melhor oferta</span><strong className="text-white">{currency.format(control.totalDebtOffer)}</strong></p>
                    </div>
                    <Link href="/admin/debts" className="admin-primary-button mt-6 w-full">
                        Abrir dívidas
                        <ArrowRight size={16} />
                    </Link>
                </section>

                <section className="admin-card p-5 md:p-6">
                    <div className="flex items-center justify-between">
                        <div className="admin-metric-icon text-emerald-300">
                            <FileSpreadsheet size={18} />
                        </div>
                        <span className="admin-pill">{demands.length} item(ns)</span>
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-[-0.035em] text-white">Demandas e execução</h3>
                    <div className="mt-5 space-y-3 text-sm text-slate-400">
                        <p className="flex justify-between gap-3"><span>Urgentes</span><strong className="text-white">{control.urgentDemands.length}</strong></p>
                        <p className="flex justify-between gap-3"><span>Concluídas</span><strong className="text-white">{control.completedDemands}</strong></p>
                    </div>
                    <Link href="/admin/demands" className="admin-primary-button mt-6 w-full">
                        Abrir demandas
                        <ArrowRight size={16} />
                    </Link>
                </section>
            </div>

            <section className="admin-card p-5 md:p-6">
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <span className="admin-kicker">Agenda</span>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">Próximas ações sugeridas</h2>
                    </div>
                    <Clock3 className="text-slate-500" size={18} />
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Link href="/admin/finance" className="admin-action-link">
                        <span>
                            <strong>Conferir recebíveis</strong>
                            <small>{control.pendingIncomes.length} receita(s) em aberto no mês.</small>
                        </span>
                    </Link>
                    <Link href="/admin/finance" className="admin-action-link">
                        <span>
                            <strong>Validar despesas</strong>
                            <small>{control.pendingExpenses.length} despesa(s) pendente(s).</small>
                        </span>
                    </Link>
                    <Link href="/admin/debts" className="admin-action-link">
                        <span>
                            <strong>Negociar passivos</strong>
                            <small>{control.attentionDebts.length} item(ns) com atenção elevada.</small>
                        </span>
                    </Link>
                    <Link href="/admin/demands" className="admin-action-link">
                        <span>
                            <strong>Atualizar responsáveis</strong>
                            <small>{control.activeDemands.length} demanda(s) ativa(s).</small>
                        </span>
                    </Link>
                </div>
            </section>
        </div>
    );
}
