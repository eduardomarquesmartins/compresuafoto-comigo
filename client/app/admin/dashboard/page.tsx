"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
    ArrowUpRight,
    Calendar,
    Image as ImageIcon,
    MonitorPlay,
    RefreshCw,
    ShoppingBag,
    Sparkles,
    Wallet,
    AlertTriangle
} from "lucide-react";

const defaultStats = {
    revenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    totalEvents: 0,
    totalPhotos: 0
};

type DashboardStats = typeof defaultStats;
type ChartPoint = {
    date: string;
    sales: number;
};

type MetricCard = {
    label: string;
    value: string;
    meta: string;
    tone: "blue" | "pink" | "red" | "green";
    icon: React.ElementType;
};

const getDashboardErrorMessage = (error: unknown) => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { status?: number; data?: { error?: string } } }).response;
        if (response?.status === 401 || response?.status === 403) {
            return "Sessão expirada ou sem permissão de admin. Faça login novamente.";
        }
        if (response?.status) {
            return `API respondeu com erro ${response.status}.`;
        }
    }

    if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "ERR_NETWORK") {
            return "Não consegui conectar na API local. Verifique se o servidor está rodando na porta 3002.";
        }
    }

    return "Não foi possível carregar os dados do dashboard agora.";
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats>(defaultStats);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [chartMounted, setChartMounted] = useState(false);
    const hasChartData = chartData.some((point) => Number(point.sales) > 0);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            setErrorMessage(null);

            const [statsResult, chartResult] = await Promise.allSettled([
                api.get<DashboardStats>("/dashboard/stats"),
                api.get<ChartPoint[]>("/dashboard/chart-data")
            ]);

            if (!isMounted) return;

            if (statsResult.status === "fulfilled") {
                setStats({ ...defaultStats, ...statsResult.value.data });
            }

            if (chartResult.status === "fulfilled" && Array.isArray(chartResult.value.data)) {
                setChartData(chartResult.value.data);
            }

            const rejectedResult = [statsResult, chartResult].find(
                (result): result is PromiseRejectedResult => result.status === "rejected"
            );

            if (rejectedResult) {
                setErrorMessage(getDashboardErrorMessage(rejectedResult.reason));
            }

            setLoading(false);
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Delay chart rendering to ensure container has proper dimensions (fixes Safari Recharts warning)
    useEffect(() => {
        if (!loading) {
            const timer = requestAnimationFrame(() => setChartMounted(true));
            return () => cancelAnimationFrame(timer);
        }
    }, [loading]);

    const metrics = useMemo<MetricCard[]>(() => [
        {
            label: "Receita Fotos",
            value: currency.format(stats.revenue),
            meta: "",
            tone: "green",
            icon: Wallet
        },
        {
            label: "Pedidos",
            value: String(stats.totalOrders),
            meta: `${stats.paidOrders} pagos confirmados`,
            tone: "blue",
            icon: ShoppingBag
        },
        {
            label: "Eventos ativos",
            value: String(stats.totalEvents),
            meta: "Sessões em operação",
            tone: "pink",
            icon: Calendar
        },
        {
            label: "Fotos no acervo",
            value: String(stats.totalPhotos),
            meta: "Ativos disponíveis para venda",
            tone: "red",
            icon: ImageIcon
        }
    ], [stats]);

    if (loading) {
        return (
            <div className="admin-loading-card flex h-[70vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="admin-loader" />
                    <p className="admin-microcopy">Sincronizando dados do painel</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page-stack pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {errorMessage && (
                <div className="admin-warning-banner">
                    <div className="flex gap-3">
                        <div className="admin-warning-icon">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Dados em modo temporário</p>
                            <p className="mt-1 text-sm text-slate-400">{errorMessage}</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => window.location.reload()} className="admin-secondary-button">
                        <RefreshCw size={15} />
                        Tentar novamente
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                        <article key={metric.label} className={`admin-metric-card tone-${metric.tone}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="admin-metric-icon"><Icon size={18} strokeWidth={1.8} /></div>
                            </div>
                            <div className="mt-8">
                                <p className="admin-metric-label">{metric.label}</p>
                                <p className="mt-2 truncate text-4xl font-semibold tracking-[-0.06em] text-white">{metric.value}</p>
                                <p className="mt-3 text-sm text-slate-500">{metric.meta}</p>
                            </div>
                        </article>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                <section className="admin-card min-w-0 p-5 md:p-6">
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold tracking-[-0.045em] text-white">Métricas de vendas</h2>
                        <p className="mt-2 text-sm text-slate-500">Receita por dia nos últimos 7 dias.</p>
                    </div>

                    <div className="relative h-[340px] min-h-[320px] w-full min-w-0">
                        {!hasChartData && (
                            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                                <div className="admin-empty-state">
                                    <p className="text-sm font-medium text-white">Sem vendas nos últimos 7 dias</p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">O gráfico será preenchido quando houver pedidos pagos ou propostas aprovadas.</p>
                                </div>
                            </div>
                        )}
                        {chartMounted ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0a72ef" stopOpacity={0.55} />
                                        <stop offset="55%" stopColor="#de1d8d" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#ff5b4f" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="rgba(255,255,255,0.07)" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#8a93a3", fontSize: 11, fontWeight: 500 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#8a93a3", fontSize: 11, fontWeight: 500 }}
                                    tickFormatter={(value) => `R$${value}`}
                                />
                                <Tooltip
                                    formatter={(value) => [`R$ ${value}`, "Vendas"]}
                                    contentStyle={{
                                        backgroundColor: "rgba(10, 10, 12, 0.94)",
                                        backdropFilter: "blur(16px)",
                                        borderRadius: "14px",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        color: "#fff",
                                        boxShadow: "0 24px 70px rgba(0,0,0,0.55)"
                                    }}
                                    itemStyle={{ color: "#fff", fontWeight: 500 }}
                                    labelStyle={{ color: "#8a93a3", marginBottom: "4px" }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#0a72ef" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer> : <div className="flex h-full items-center justify-center"><div className="admin-loader" /></div>}
                    </div>
                </section>

                <aside className="admin-card p-5 md:p-6">
                    <span className="admin-kicker">Ações rápidas</span>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-white">Próximo melhor passo</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">Acesse os fluxos principais sem perder o contexto operacional do painel.</p>

                    <div className="mt-8 space-y-3">
                        <Link href="/admin/events" className="admin-action-link">
                            <span>
                                <strong>Gerenciar eventos</strong>
                                <small>Atualize disponibilidade e acervos</small>
                            </span>
                            <ArrowUpRight size={16} />
                        </Link>
                        <Link href="/admin/orders" className="admin-action-link">
                            <span>
                                <strong>Últimos pedidos</strong>
                                <small>Veja compras e confirmações</small>
                            </span>
                            <ArrowUpRight size={16} />
                        </Link>
                        <Link href="/admin/presentation" className="admin-action-link">
                            <span>
                                <strong>Apresentação</strong>
                                <small>Inicie os slides comerciais</small>
                            </span>
                            <MonitorPlay size={16} />
                        </Link>
                        <Link href="/admin/proposals/new" className="admin-primary-button w-full justify-center">
                            Nova proposta
                            <ArrowUpRight size={16} />
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
