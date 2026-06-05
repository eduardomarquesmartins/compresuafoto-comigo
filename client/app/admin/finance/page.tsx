"use client";

import { useEffect, useState, useRef } from "react";
import { 
    Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    Calendar, Trash2, CheckCircle, Clock, Loader2, Filter, AlertCircle, Upload
} from "lucide-react";
import { 
    getFinancials, getFinancialStats, createFinancial, updateFinancial, deleteFinancial, getClients, importExcel 
} from "@/lib/api";

const CATEGORIES = {
    INCOME: ["Mensalidade", "Serviço Avulso", "Fotografia", "Venda de Fotos", "Outros"],
    EXPENSE: ["Infraestrutura", "Impostos", "Salários / Equipe", "Marketing", "Deslocamento", "Equipamentos", "Outros"]
};

const ACCOUNTS = [
    "CORA & CONTI",
    "PIC PAY EDUARDA",
    "SICRED EDUARDA",
    "ASAAS & CONTI",
    "SICRED FERNANDO",
    "C6",
    "ASAAS AUDIOVISUAL",
    "SALDO"
];

const CATEGORY_COLORS: Record<string, string> = {
    "Mensalidade": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "Serviço Avulso": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "Fotografia": "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Venda de Fotos": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "Infraestrutura": "bg-slate-500/10 text-slate-400 border-slate-500/20",
    "Impostos": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Salários / Equipe": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "Marketing": "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "Deslocamento": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Equipamentos": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "Outros": "bg-slate-700/10 text-slate-400 border-slate-700/20"
};

export default function AdminFinancePage() {
    const [records, setRecords] = useState<any[]>([]);
    const [stats, setStats] = useState({ incomes: 0, expenses: 0, balance: 0, forecast: 0 });
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filtros
    const [month, setMonth] = useState(String(new Date().getMonth() + 1));
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [typeFilter, setTypeFilter] = useState("ALL");

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        type: "INCOME",
        description: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        category: "Mensalidade",
        status: "PAID",
        account: "CORA & CONTI",
        clientId: ""
    });

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const params = {
                month,
                year,
                type: typeFilter !== "ALL" ? typeFilter : undefined
            };
            const [recordsData, statsData, clientsData] = await Promise.all([
                getFinancials(params),
                getFinancialStats({ month, year }),
                getClients()
            ]);
            setRecords(recordsData);
            setStats(statsData);
            setClients(clientsData);
        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, [month, year, typeFilter]);

    const handleOpenModal = (type: "INCOME" | "EXPENSE") => {
        setForm({
            type,
            description: "",
            amount: "",
            date: new Date().toISOString().split('T')[0],
            category: CATEGORIES[type][0],
            status: "PAID",
            account: "CORA & CONTI",
            clientId: ""
        });
        setModalOpen(true);
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.description || !form.amount) {
            alert("Descrição e valor são obrigatórios.");
            return;
        }

        try {
            setActionLoading("save");
            await createFinancial({
                ...form,
                clientId: form.clientId ? parseInt(form.clientId) : undefined
            });
            setModalOpen(false);
            fetchFinanceData();
        } catch (error) {
            console.error("Erro ao salvar lançamento financeiro:", error);
            alert("Erro ao salvar lançamento financeiro.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteRecord = async (id: number) => {
        if (confirm("Deseja realmente apagar este lançamento?")) {
            try {
                setActionLoading(`delete-${id}`);
                await deleteFinancial(id);
                fetchFinanceData();
            } catch (error) {
                console.error("Erro ao apagar lançamento:", error);
                alert("Erro ao apagar lançamento.");
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handleToggleStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === "PAID" ? "PENDING" : "PAID";
        try {
            setActionLoading(`status-${id}`);
            await updateFinancial(id, { status: newStatus });
            fetchFinanceData();
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        try {
            setActionLoading("import");
            const res = await importExcel(file);
            alert(
                `${res.message}\n\nResumo da Importação:\n` +
                `- Gastos Mai 2026: ${res.summary.incomesAndExpenses} transações\n` +
                `- Dívidas: ${res.summary.debts} registros\n` +
                `- Demandas Mentoria: ${res.summary.mentoriaDemands} tarefas`
            );
            // Sincronizar filtros com o mês de Maio para exibir os dados importados
            setMonth("5");
            setYear("2026");
            fetchFinanceData();
        } catch (error: any) {
            console.error("Erro ao importar planilha:", error);
            alert(error.response?.data?.error || "Erro ao processar arquivo Excel.");
        } finally {
            setActionLoading(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-blue-500 font-semibold tracking-widest uppercase text-xs">Administração Financeira</span>
                    <h1 className="text-4xl font-extralight text-white tracking-tight flex items-center gap-4 mt-2">
                        Fluxo de Caixa
                    </h1>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportExcel} 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={actionLoading === "import"}
                        className="group flex items-center justify-center gap-2 bg-[#0a0a0c]/80 border border-white/10 hover:border-blue-500/25 text-slate-300 hover:text-white px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Importar planilha Excel oficial do cliente"
                    >
                        {actionLoading === "import" ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Upload size={14} />
                        )}
                        Importar Planilha
                    </button>
                    <button
                        onClick={() => handleOpenModal("INCOME")}
                        className="group flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] border border-white/5 active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        Nova Receita
                    </button>
                    <button
                        onClick={() => handleOpenModal("EXPENSE")}
                        className="group flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] border border-white/5 active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Entradas */}
                <div className="group bg-[#161825]/90 border border-white/10 hover:border-emerald-500/30 rounded-[28px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[150px] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-2xl group-hover:bg-emerald-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-emerald-400 transition-colors">Entradas</span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {stats.incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Receitas liquidadas este mês</p>
                    </div>
                </div>

                {/* Saídas */}
                <div className="group bg-[#161825]/90 border border-white/10 hover:border-red-500/30 rounded-[28px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[150px] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.04] rounded-full blur-2xl group-hover:bg-red-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-red-400 transition-colors">Saídas</span>
                        <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                            <TrendingDown size={18} />
                        </div>
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Despesas liquidadas este mês</p>
                    </div>
                </div>

                {/* Saldo Líquido */}
                <div className="group bg-[#161825]/90 border border-white/10 hover:border-blue-500/30 rounded-[28px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[150px] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.04] rounded-full blur-2xl group-hover:bg-blue-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-blue-400 transition-colors">Saldo Atual</span>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stats.balance >= 0 ? 'bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-amber-500/15 text-amber-400 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.15)]'}`}>
                            <DollarSign size={18} />
                        </div>
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className={`text-3xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Resultado líquido realizado</p>
                    </div>
                </div>

                {/* Previsão Contratos Ativos */}
                <div className="group bg-[#161825]/90 border border-white/10 hover:border-indigo-500/30 rounded-[28px] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[150px] transition-all duration-500 hover:-translate-y-1">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] rounded-full blur-2xl group-hover:bg-indigo-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-indigo-400 transition-colors">Previsão Contratos</span>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/25 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                            <TrendingUp size={18} className="rotate-45" />
                        </div>
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-light text-indigo-300 tracking-tight">
                            R$ {stats.forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Receita recorrente contratada</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#161827] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                        <Filter size={14} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Filtrar Lançamentos</span>
                </div>

                <div className="flex flex-wrap gap-6 items-center">
                    <label className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">Mês</span>
                        <div className="relative">
                            <select 
                                value={month} 
                                onChange={e => setMonth(e.target.value)} 
                                className="bg-[#1f2136] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(m => (
                                    <option key={m} value={m}>{new Date(2020, parseInt(m) - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">Ano</span>
                        <div className="relative">
                            <select 
                                value={year} 
                                onChange={e => setYear(e.target.value)} 
                                className="bg-[#1f2136] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                            >
                                {["2025", "2026", "2027", "2028"].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                        </div>
                    </label>

                    <div className="flex bg-[#121320] border border-slate-700 rounded-xl p-1 shadow-inner">
                        <button
                            onClick={() => setTypeFilter("ALL")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${typeFilter === 'ALL' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setTypeFilter("INCOME")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${typeFilter === 'INCOME' ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Receitas
                        </button>
                        <button
                            onClick={() => setTypeFilter("EXPENSE")}
                            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${typeFilter === 'EXPENSE' ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            Despesas
                        </button>
                    </div>
                </div>
            </div>

            {/* Financial Ledger Table */}
            <div className="bg-[#161826]/95 border border-white/10 rounded-[32px] shadow-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="py-28 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/[0.04] rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                        <div className="w-20 h-20 rounded-full bg-[#1b1d30] flex items-center justify-center border border-white/10 shadow-inner mb-6 relative">
                            <div className="absolute inset-0 bg-blue-500/[0.08] rounded-full blur-md"></div>
                            <AlertCircle size={32} className="text-slate-400 relative z-10" />
                        </div>
                        <p className="text-slate-200 font-bold tracking-widest uppercase text-xs relative z-10">Nenhum lançamento encontrado</p>
                        <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto leading-relaxed relative z-10">
                            Não existem movimentações financeiras para {new Date(2020, parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long' })} de {year}.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#121320] border-b border-white/10">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Descrição / Categoria</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Conta / Origem</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {records.map(record => (
                                    <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300 ${record.type === 'INCOME' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.05)]' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.05)]'}`}>
                                                    {record.type === 'INCOME' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-sm tracking-tight">{record.description}</div>
                                                    <span className={`inline-block border text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mt-1.5 ${CATEGORY_COLORS[record.category] || 'bg-slate-800 text-slate-400 border-white/5'}`}>
                                                        {record.category}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                                            {new Date(record.date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-slate-300 font-bold uppercase tracking-wider">
                                            {record.account ? (
                                                <span className="bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg text-[9px]">{record.account}</span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-xs text-slate-400 font-medium">
                                            {record.client?.name ? (
                                                <span className="text-white/80">{record.client.name}</span>
                                            ) : (
                                                <span className="text-slate-600">-</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`font-mono font-bold text-sm ${record.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {record.type === 'INCOME' ? '+' : '-'} R$ {record.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => handleToggleStatus(record.id, record.status)}
                                                disabled={actionLoading === `status-${record.id}`}
                                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border gap-1.5 cursor-pointer transition-all active:scale-95 ${record.status === 'PAID' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)] hover:bg-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)] hover:bg-amber-500/20'}`}
                                                title="Clique para alternar o status de pagamento"
                                            >
                                                {actionLoading === `status-${record.id}` ? (
                                                    <Loader2 size={10} className="animate-spin" />
                                                ) : record.status === 'PAID' ? (
                                                    <CheckCircle size={10} />
                                                ) : (
                                                    <Clock size={10} />
                                                )}
                                                {record.status === 'PAID' ? 'Pago' : 'Pendente'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button
                                                onClick={() => handleDeleteRecord(record.id)}
                                                disabled={actionLoading === `delete-${record.id}`}
                                                className="text-slate-500 hover:text-red-400 p-2.5 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/15 transition-all cursor-pointer disabled:opacity-50"
                                                title="Excluir Lançamento"
                                            >
                                                {actionLoading === `delete-${record.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Record Modal (Receita/Despesa) */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1e2e] border border-white/10 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                        <div className="bg-black/30 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {form.type === "INCOME" ? "Nova Receita (Entrada)" : "Nova Despesa (Saída)"}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSaveRecord} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Descrição do Lançamento</span>
                                    <input required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Ex: Mensalidade Junho" />
                                </label>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Valor (R$)</span>
                                        <input required type="text" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-mono" placeholder="0,00" />
                                    </label>

                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Data do Lançamento</span>
                                        <input required type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" />
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Categoria</span>
                                        <div className="relative">
                                            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                                {CATEGORIES[form.type as "INCOME" | "EXPENSE"].map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                        </div>
                                    </label>

                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Conta Origem / Destino</span>
                                        <div className="relative">
                                            <select value={form.account} onChange={e => setForm({...form, account: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                                {ACCOUNTS.map(acc => (
                                                    <option key={acc} value={acc}>{acc}</option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                        </div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="flex flex-col gap-2">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status de Pagamento</span>
                                        <div className="relative">
                                            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                                <option value="PAID">Pago</option>
                                                <option value="PENDING">Pendente</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                        </div>
                                    </label>

                                    {form.type === "INCOME" && (
                                        <label className="flex flex-col gap-2">
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cliente Associado (Opcional)</span>
                                            <div className="relative">
                                                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                                    <option value="">Nenhum cliente</option>
                                                    {clients.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "save"} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50 ${form.type === 'INCOME' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/30' : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/30'}`}>
                                    {actionLoading === "save" && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Lançamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
