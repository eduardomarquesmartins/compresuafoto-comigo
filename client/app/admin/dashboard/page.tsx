"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, ShoppingBag, Calendar, Image as ImageIcon, ArrowUpRight, Sparkles } from 'lucide-react';

import AdminUserMenu from '@/components/AdminUserMenu';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        revenue: 0,
        totalOrders: 0,
        paidOrders: 0,
        totalEvents: 0,
        totalPhotos: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, chartRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/chart-data')
                ]);
                setStats(statsRes.data);
                setChartData(chartRes.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[70vh] text-blue-500">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
            </div>
        );
    }

    return (
        <div className="pb-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <header className="flex justify-between items-end mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="text-blue-500 h-5 w-5" />
                        <span className="text-blue-500 font-medium tracking-widest uppercase text-xs">Visão Geral</span>
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight">Dashboard</h1>
                </div>
                <div className="flex items-center gap-4">
                    <AdminUserMenu />
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Total Revenue */}
                <div className="group bg-[#0a0a0c]/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-white/5 hover:border-green-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center shadow-[inset_0_0_10px_rgba(7ade80,0.2)] border border-green-500/20 group-hover:scale-110 transition-transform">
                                <Wallet strokeWidth={1.5} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-slate-400 text-xs tracking-widest uppercase font-medium mb-2">Receita Total</h3>
                            <p className="text-3xl font-light text-white tracking-tight">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="group bg-[#0a0a0c]/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-[inset_0_0_10px_rgba(96,165,250,0.2)] border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <ShoppingBag strokeWidth={1.5} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-slate-400 text-xs tracking-widest uppercase font-medium mb-2">Pedidos</h3>
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-light text-white tracking-tight">{stats.totalOrders}</p>
                                <span className="text-blue-400/80 text-sm font-medium">({stats.paidOrders} pagos)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Total Events */}
                <div className="group bg-[#0a0a0c]/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-[inset_0_0_10px_rgba(129,140,248,0.2)] border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <Calendar strokeWidth={1.5} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-slate-400 text-xs tracking-widest uppercase font-medium mb-2">Eventos Ativos</h3>
                            <p className="text-3xl font-light text-white tracking-tight">{stats.totalEvents}</p>
                        </div>
                    </div>
                </div>

                {/* Total Photos */}
                <div className="group bg-[#0a0a0c]/80 backdrop-blur-xl p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-[inset_0_0_10px_rgba(251,191,36,0.2)] border border-amber-500/20 group-hover:scale-110 transition-transform">
                                <ImageIcon strokeWidth={1.5} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-slate-400 text-xs tracking-widest uppercase font-medium mb-2">Fotos</h3>
                            <p className="text-3xl font-light text-white tracking-tight">{stats.totalPhotos}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                <div className="lg:col-span-2 min-w-0 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative z-10">
                        <h3 className="text-sm font-medium tracking-widest text-white uppercase mb-8 flex items-center gap-2">
                            <span>Métricas de Vendas</span>
                            <span className="text-slate-500 text-xs font-normal Normal-case">(Últimos 7 dias)</span>
                        </h3>
                        <div className="h-[320px] min-h-[320px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(val) => {
                                            const d = new Date(val);
                                            return `${d.getDate()}/${d.getMonth() + 1}`;
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                        tickFormatter={(value) => `R$${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value) => [`R$ ${value}`, 'Vendas']}
                                        contentStyle={{
                                            backgroundColor: 'rgba(10, 10, 12, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                                        }}
                                        itemStyle={{ color: '#fff', fontWeight: 500 }}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="sales"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Quick Actions / Tips */}
                <div className="bg-[#0a0a0c]/80 backdrop-blur-xl rounded-2xl p-6 text-white border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/20 transition-colors duration-700 pointer-events-none"></div>

                    <div className="relative z-10 h-full flex flex-col">
                        <h3 className="text-sm font-medium tracking-widest text-white uppercase mb-6">Ações Rápidas</h3>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 relative overflow-hidden group/tip">
                            <div className="absolute left-0 top-0 w-1 h-full bg-blue-500"></div>
                            <p className="text-slate-300 leading-relaxed text-sm">
                                Mantenha seus <span className="text-white font-medium">eventos atualizados</span> e confira as novas propostas diárias para otimizar suas conversões.
                            </p>
                        </div>

                        <div className="space-y-4 flex-1 flex flex-col justify-end">
                            <Link href="/admin/events" className="group/btn flex items-center justify-between w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-medium px-5 py-3.5 rounded-xl transition-all duration-300">
                                <span className="text-sm">Gerenciar Eventos</span>
                                <ArrowUpRight size={16} className="text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </Link>
                            <Link href="/admin/orders" className="group/btn flex items-center justify-between w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-medium px-5 py-3.5 rounded-xl transition-all duration-300">
                                <span className="text-sm">Últimos Pedidos</span>
                                <ArrowUpRight size={16} className="text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                            </Link>
                            <Link href="/admin/proposals/new" className="flex justify-center items-center w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium px-5 py-4 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] border border-white/10">
                                <span className="text-sm tracking-wide">NOVA PROPOSTA</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
