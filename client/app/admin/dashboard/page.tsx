"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
            <div className="flex justify-center items-center h-screen text-blue-500">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-normal text-white">Dashboard</h1>
                    <p className="text-slate-400">Visão geral do sistema</p>
                </div>
                <div className="flex items-center gap-4">
                    <AdminUserMenu />
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 text-green-400 flex items-center justify-center text-xl backdrop-blur-sm">
                                💰
                            </div>
                        </div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">Receita Total</h3>
                        <p className="text-2xl font-semibold text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
                        </p>
                    </div>
                </div>

                {/* Total Orders */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 text-blue-400 flex items-center justify-center text-xl backdrop-blur-sm">
                                🛍️
                            </div>
                        </div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">Pedidos Totais</h3>
                        <div className="flex items-end gap-2">
                            <p className="text-2xl font-semibold text-white">{stats.totalOrders}</p>
                            <span className="text-slate-500 text-xs mb-1">({stats.paidOrders} pagos)</span>
                        </div>
                    </div>
                </div>

                {/* Total Events */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 text-purple-400 flex items-center justify-center text-xl backdrop-blur-sm">
                                📅
                            </div>
                        </div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">Eventos Ativos</h3>
                        <p className="text-2xl font-semibold text-white">{stats.totalEvents}</p>
                    </div>
                </div>

                {/* Total Photos */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center text-xl backdrop-blur-sm">
                                📸
                            </div>
                        </div>
                        <h3 className="text-slate-400 text-sm font-medium mb-1">Fotos Armazenadas</h3>
                        <p className="text-2xl font-semibold text-white">{stats.totalPhotos}</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl border border-slate-700/50">
                    <h3 className="text-lg font-normal text-white mb-6">Desempenho de Vendas (Últimos 7 dias)</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getDate()}/${d.getMonth() + 1}`;
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => `R$${value}`}
                                />
                                <Tooltip
                                    formatter={(value) => [`R$ ${value}`, 'Vendas']}
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        borderRadius: '12px',
                                        border: '1px solid #334155',
                                        color: '#fff'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    stroke="#60a5fa"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSales)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions / Tips */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
                    <div className="relative z-10">
                        <h3 className="text-xl font-semibold mb-4">Dica Rápida</h3>
                        <p className="text-slate-300 mb-8 leading-relaxed text-sm">
                            Mantenha seus eventos atualizados e organize os registros mais antigos para garantir que as informações estejam sempre corretas.
                        </p>
                        <div className="space-y-3">
                            <Link href="/admin/events" className="block w-full bg-white text-slate-900 font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors text-center">
                                Gerenciar Eventos
                            </Link>
                            <Link href="/admin/orders" className="block w-full bg-slate-800 text-white border border-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-700 transition-colors text-center">
                                Gerenciar Pedidos
                            </Link>
                            <Link href="/admin/proposals/new" className="block w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-500 transition-colors text-center shadow-lg shadow-blue-900/40">
                                + Nova Proposta
                            </Link>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                </div>
            </div>
        </div>
    );
}
