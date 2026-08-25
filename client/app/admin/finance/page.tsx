"use client";

import { useEffect, useState } from "react";
import { 
    Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    Calendar, Trash2, CheckCircle, Clock, Loader2, Filter, AlertCircle, FileUp, FileText
} from "lucide-react";
import { 
    getFinancials, getFinancialStats, createFinancial, updateFinancial, deleteFinancial, getClients, uploadFinancialNote
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

const parseUploadedNote = (obs?: string) => {
    if (!obs) return null;

    try {
        const data = JSON.parse(obs);
        return data?.type === "uploaded-cost-note" ? data : null;
    } catch {
        return null;
    }
};

const getInitialFinanceFilters = () => {
    if (typeof window === "undefined") {
        return {
            month: String(new Date().getMonth() + 1),
            year: String(new Date().getFullYear())
        };
    }

    const params = new URLSearchParams(window.location.search);
    return {
        month: params.get("month") || String(new Date().getMonth() + 1),
        year: params.get("year") || String(new Date().getFullYear())
    };
};

export default function AdminFinancePage() {
    const initialFilters = getInitialFinanceFilters();
    const [records, setRecords] = useState<any[]>([]);
    const [stats, setStats] = useState({ incomes: 0, expenses: 0, balance: 0, forecast: 0 });
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [noteFile, setNoteFile] = useState<File | null>(null);

    // Filtros
    const [month, setMonth] = useState(initialFilters.month);
    const [year, setYear] = useState(initialFilters.year);
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
    const [noteForm, setNoteForm] = useState({
        status: "PAID",
        account: "CORA & CONTI",
        obs: ""
    });

    const fetchFinanceData = async () => {
        try {
            setLoading(true);
            const params = {
                month,
                year,
                type: typeFilter !== "ALL" ? typeFilter : undefined
            };
            const [recordsResult, statsResult, clientsResult] = await Promise.allSettled([
                getFinancials(params),
                getFinancialStats({ month, year }),
                getClients()
            ]);

            setRecords(recordsResult.status === "fulfilled" ? recordsResult.value : []);
            setStats(statsResult.status === "fulfilled" ? statsResult.value : { incomes: 0, expenses: 0, balance: 0, forecast: 0 });
            setClients(clientsResult.status === "fulfilled" ? clientsResult.value : []);
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

    const handleOpenNoteModal = () => {
        setNoteFile(null);
        setNoteForm({
            status: "PAID",
            account: "CORA & CONTI",
            obs: ""
        });
        setNoteModalOpen(true);
    };

    const handleNoteFileChange = (file?: File) => {
        if (!file) return;

        setNoteFile(file);
    };

    const handleUploadNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteFile) {
            alert("Selecione a nota ou comprovante.");
            return;
        }

        try {
            setActionLoading("note-upload");
            await uploadFinancialNote({
                note: noteFile,
                ...noteForm
            });
            setNoteModalOpen(false);
            fetchFinanceData();
        } catch (error) {
            console.error("Erro ao subir nota financeira:", error);
            alert("Erro ao subir nota e criar despesa.");
        } finally {
            setActionLoading(null);
        }
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

    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-blue-400 font-bold tracking-[0.18em] uppercase text-[10px]">Financeiro</span>
                    <h1 className="text-3xl font-semibold text-white tracking-tight mt-2">Gestão financeira</h1>
                    <p className="mt-2 text-sm text-slate-400">Lançamentos, resultado do período e previsibilidade de caixa.</p>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                    <button
                        onClick={handleOpenNoteModal}
                        className="flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-slate-200 px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors border border-white/15 cursor-pointer"
                    >
                        <FileUp size={14} />
                        Subir Nota
                    </button>
                    <button
                        onClick={() => handleOpenModal("INCOME")}
                        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        Nova Receita
                    </button>
                    <button
                        onClick={() => handleOpenModal("EXPENSE")}
                        className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 text-white px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        Nova Despesa
                    </button>
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Entradas */}
                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[136px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-2xl group-hover:bg-emerald-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-emerald-400 transition-colors">Entradas</span>
                        <TrendingUp size={21} className="text-emerald-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {stats.incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Receitas liquidadas este mês</p>
                    </div>
                </div>

                {/* Saídas */}
                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[136px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.04] rounded-full blur-2xl group-hover:bg-red-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-red-400 transition-colors">Saídas</span>
                        <TrendingDown size={21} className="text-red-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {stats.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Despesas liquidadas este mês</p>
                    </div>
                </div>

                {/* Saldo Líquido */}
                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[136px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.04] rounded-full blur-2xl group-hover:bg-blue-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-blue-400 transition-colors">Saldo Atual</span>
                        <DollarSign size={21} className={stats.balance >= 0 ? "text-blue-500" : "text-amber-500"} aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className={`text-3xl font-bold tracking-tight ${stats.balance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                            R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Resultado líquido realizado</p>
                    </div>
                </div>

                {/* Previsão Contratos Ativos */}
                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[136px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.04] rounded-full blur-2xl group-hover:bg-indigo-500/[0.08] transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-indigo-400 transition-colors">Previsão Contratos</span>
                        <TrendingUp size={21} className="rotate-45 text-indigo-500" aria-hidden="true" />
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
            <div className="bg-[#12141d] border border-white/10 rounded-2xl px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                <div className="flex items-center gap-3">
                    <Filter size={19} className="text-blue-500" aria-hidden="true" />
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
                                {records.map(record => {
                                    const uploadedNote = parseUploadedNote(record.obs);

                                    return (
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
                                                    {uploadedNote && (
                                                        <a
                                                            href={uploadedNote.fileUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="ml-2 inline-flex items-center gap-1 border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 rounded-full"
                                                        >
                                                            <FileText size={10} />
                                                            Nota
                                                        </a>
                                                    )}
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload de Nota de Custo */}
            {noteModalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1e2e] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500/30 to-transparent"></div>
                        <div className="bg-black/30 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-rose-300 font-bold">Despesa automatica</p>
                                <h3 className="text-xl font-bold text-white">Subir nota de custo</h3>
                            </div>
                            <button onClick={() => setNoteModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleUploadNote} className="p-8 space-y-6">
                            <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-black/25 px-6 py-8 text-center hover:border-rose-400/40 hover:bg-rose-500/5 transition">
                                <FileUp size={30} className="text-rose-300" />
                                <div>
                                    <p className="text-sm font-bold text-white">{noteFile ? noteFile.name : "Clique para escolher a nota"}</p>
                                    <p className="mt-1 text-xs text-slate-500">O sistema le valor, data, fornecedor e categoria automaticamente.</p>
                                    <p className="mt-1 text-xs text-slate-600">PDF com texto, JPG, PNG ou WEBP ate 12MB</p>
                                </div>
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png,image/webp"
                                    onChange={e => handleNoteFileChange(e.target.files?.[0])}
                                    className="hidden"
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Conta de pagamento</span>
                                    <select value={noteForm.account} onChange={e => setNoteForm({...noteForm, account: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm cursor-pointer">
                                        {ACCOUNTS.map(acc => (
                                            <option key={acc} value={acc}>{acc}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status</span>
                                    <select value={noteForm.status} onChange={e => setNoteForm({...noteForm, status: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm cursor-pointer">
                                        <option value="PAID">Pago</option>
                                        <option value="PENDING">Pendente</option>
                                    </select>
                                </label>

                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Observacoes</span>
                                    <textarea value={noteForm.obs} onChange={e => setNoteForm({...noteForm, obs: e.target.value})} rows={3} className="w-full resize-none bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Detalhes opcionais sobre a nota" />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setNoteModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "note-upload"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/30">
                                    {actionLoading === "note-upload" && <Loader2 size={16} className="animate-spin" />}
                                    Ler nota e criar despesa
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
