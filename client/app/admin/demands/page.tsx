"use client";

import { useEffect, useState } from "react";
import { Plus, ClipboardCheck, Calendar, User, Trash2, Edit2, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";
import { getDemands, createDemand, updateDemand, deleteDemand } from "@/lib/api";

const demandAreas = [
    "📊 Planilha",
    "💰 Financeiro",
    "📋 Operação",
    "🤝 Clientes",
    "📣 Marketing",
    "⚖️ Jurídico / Contratos",
    "⚠️ MEI",
    "🏠 Pessoal"
];

const deadlineOptions = ["Hoje", "Esta semana", "Próxima semana", "Este mês", "Junho/2026", "Sem prazo"];
const demandTypes = ["Operacional", "Financeiro", "Comercial", "Entrega", "Estrutura", "Hábito", "Estratégico", "Pessoal"];

export default function AdminDemandsPage() {
    const [demands, setDemands] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filtros
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [responsibleFilter, setResponsibleFilter] = useState("ALL");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDemand, setEditingDemand] = useState<any | null>(null);
    const [form, setForm] = useState({
        area: "",
        action: "",
        deadline: "",
        responsible: "Eduarda",
        status: "Pendente",
        type: "Operacional",
        obs: ""
    });

    const fetchDemands = async () => {
        try {
            setLoading(true);
            const data = await getDemands();
            setDemands(data);
        } catch (error) {
            console.error("Erro ao buscar demandas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDemands();
    }, []);

    // Aplicar filtros
    const filteredDemands = demands.filter(d => {
        const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
        
        let matchesResponsible = true;
        if (responsibleFilter !== "ALL") {
            const respLower = String(d.responsible).toLowerCase();
            const filterLower = responsibleFilter.toLowerCase();
            matchesResponsible = respLower.includes(filterLower);
        }

        return matchesStatus && matchesResponsible;
    });

    // Contadores
    const pendingCount = demands.filter(d => d.status !== 'Realizada ' && d.status !== 'Realizada').length;
    const completedCount = demands.filter(d => d.status === 'Realizada ' || d.status === 'Realizada').length;

    const handleOpenModal = (demand: any | null = null) => {
        if (demand) {
            setEditingDemand(demand);
            setForm({
                area: demand.area || "",
                action: demand.action || "",
                deadline: demand.deadline || "",
                responsible: demand.responsible || "Eduarda",
                status: demand.status || "Pendente",
                type: demand.type || "Operacional",
                obs: demand.obs || ""
            });
        } else {
            setEditingDemand(null);
            setForm({
                area: "",
                action: "",
                deadline: "Junho/2026",
                responsible: "Eduarda",
                status: "Pendente",
                type: "Operacional",
                obs: ""
            });
        }
        setModalOpen(true);
    };

    const handleSaveDemand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.area || !form.action || !form.responsible) {
            alert("Área, ação/demanda e responsável são obrigatórios.");
            return;
        }

        try {
            setActionLoading("save");
            if (editingDemand) {
                await updateDemand(editingDemand.id, form);
            } else {
                await createDemand(form);
            }
            setModalOpen(false);
            fetchDemands();
        } catch (error) {
            console.error("Erro ao salvar demanda:", error);
            alert("Erro ao salvar demanda.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteDemand = async (id: number) => {
        if (confirm("Deseja realmente remover esta demanda da mentoria?")) {
            try {
                setActionLoading(`delete-${id}`);
                await deleteDemand(id);
                fetchDemands();
            } catch (error) {
                console.error("Erro ao excluir demanda:", error);
                alert("Erro ao excluir demanda.");
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handleToggleComplete = async (demand: any) => {
        const isCurrentlyDone = demand.status === 'Realizada' || demand.status === 'Realizada ';
        const newStatus = isCurrentlyDone ? 'Pendente' : 'Realizada';
        try {
            setActionLoading(`toggle-${demand.id}`);
            await updateDemand(demand.id, { ...demand, status: newStatus });
            fetchDemands();
        } catch (error) {
            console.error("Erro ao alterar status da demanda:", error);
            alert("Erro ao alterar status.");
        } finally {
            setActionLoading(null);
        }
    };

    // Estilo de badge conforme status da demanda
    const getStatusStyle = (status: string) => {
        const s = String(status).trim().toLowerCase();
        if (s.includes("urgente")) {
            return "bg-red-500/10 border-red-500/20 text-red-400 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]";
        }
        if (s.includes("pendente")) {
            return "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]";
        }
        if (s.includes("monitorar")) {
            return "bg-blue-500/10 border-blue-500/20 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.05)]";
        }
        if (s.includes("realizada") || s.includes("concluída")) {
            return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]";
        }
        return "bg-slate-800 border-white/5 text-slate-400";
    };

    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-blue-400 font-bold tracking-[0.18em] uppercase text-[10px]">Operação</span>
                    <h1 className="text-3xl font-semibold text-white tracking-tight mt-2">Tarefas e acompanhamento</h1>
                    <p className="mt-2 text-sm text-slate-400">Prioridades da equipe, responsáveis e próximos prazos.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-slate-950 px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                >
                    <Plus size={16} />
                    Nova Demanda
                </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total de Demandas</span>
                    <div className="space-y-1 mt-4">
                        <span className="text-3xl font-light text-white tracking-tight">{demands.length}</span>
                        <p className="text-[10px] text-slate-400 font-semibold">Itens registrados na operação</p>
                    </div>
                </div>

                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-amber-400 transition-colors">Pendentes / Monitorar</span>
                    <div className="space-y-1 mt-4">
                        <span className="text-3xl font-semibold text-amber-400 tracking-tight">{pendingCount}</span>
                        <p className="text-[10px] text-slate-400 font-semibold">Demandas ativas aguardando ação</p>
                    </div>
                </div>

                <div className="bg-[#12141d] border border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[120px]">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-emerald-400 transition-colors">Concluídas</span>
                    <div className="space-y-1 mt-4">
                        <span className="text-3xl font-semibold text-emerald-400 tracking-tight">{completedCount}</span>
                        <p className="text-[10px] text-slate-400 font-semibold">Metas atingidas e entregues</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-[#12141d] border border-white/10 rounded-2xl px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                
                <div className="flex items-center gap-3">
                    <ClipboardCheck size={19} className="text-blue-500" aria-hidden="true" />
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-200">Filtros</span>
                </div>

                <div className="flex flex-wrap gap-6 items-center">
                    <label className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">Responsável</span>
                        <div className="relative">
                            <select 
                                value={responsibleFilter} 
                                onChange={e => setResponsibleFilter(e.target.value)} 
                                className="bg-[#1f2136] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                            >
                                <option value="ALL">Todos</option>
                                <option value="Eduarda">Eduarda</option>
                                <option value="Fernando">Fernando</option>
                                <option value="Ambos">Ambos / Concorrentes</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">Status</span>
                        <div className="relative">
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)} 
                                className="bg-[#1f2136] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-2.5 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                            >
                                <option value="ALL">Todos</option>
                                <option value="Pendente">Pendente</option>
                                <option value="Urgente">Urgente</option>
                                <option value="Monitorar">Monitorar</option>
                                <option value="Realizada">Realizada</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                        </div>
                    </label>
                </div>
            </div>

            {/* Demands Table */}
            <div className="bg-[#161826]/95 border border-white/10 rounded-[32px] shadow-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                    </div>
                ) : filteredDemands.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <AlertCircle size={32} className="text-slate-400 mb-3" />
                        <p className="text-slate-300 text-sm font-medium">Nenhuma demanda correspondente aos filtros.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#121320] border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[180px]">Área</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Demanda / Ação</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[150px]">Prazo</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[140px]">Responsável</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[120px]">Tipo</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[150px]">Status</th>
                                    <th className="px-3 py-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 text-right whitespace-nowrap">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredDemands.map(demand => {
                                    const isDone = String(demand.status).trim() === 'Realizada' || String(demand.status).trim() === 'Realizada ';
                                    return (
                                        <tr key={demand.id} className={`hover:bg-white/[0.02] transition-colors group ${isDone ? 'opacity-55' : ''}`}>
                                            <td className="px-6 py-5 font-bold text-xs text-white/80">
                                                {demand.area}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`font-semibold text-sm tracking-tight text-white ${isDone ? 'line-through text-slate-500' : ''}`}>{demand.action}</div>
                                                {demand.obs && (
                                                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-medium">{demand.obs}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-2 border-transparent">
                                                <Calendar size={12} className="text-blue-500" />
                                                {demand.deadline || "-"}
                                            </td>
                                            <td className="px-6 py-5 text-xs text-slate-300 font-semibold">
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-slate-500" />
                                                    {demand.responsible}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-xs text-slate-500 font-medium">
                                                {demand.type || "-"}
                                            </td>
                                            <td className="px-6 py-5">
                                                <button
                                                    onClick={() => handleToggleComplete(demand)}
                                                    disabled={actionLoading === `toggle-${demand.id}`}
                                                    className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase border gap-1.5 cursor-pointer transition-all active:scale-95 ${getStatusStyle(demand.status)}`}
                                                    title="Clique para alternar conclusão"
                                                >
                                                    {actionLoading === `toggle-${demand.id}` ? (
                                                        <Loader2 size={10} className="animate-spin" />
                                                    ) : isDone ? (
                                                        <CheckCircle size={10} />
                                                    ) : (
                                                        <Clock size={10} />
                                                    )}
                                                    {demand.status}
                                                </button>
                                            </td>
                                            <td className="px-3 py-5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenModal(demand)}
                                                        className="inline-flex w-20 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-[10px] font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 cursor-pointer"
                                                        title="Editar Demanda"
                                                        aria-label="Editar demanda"
                                                    >
                                                        <Edit2 size={13} />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDemand(demand.id)}
                                                        disabled={actionLoading === `delete-${demand.id}`}
                                                        className="admin-danger-button inline-flex w-20 items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                                        title="Excluir Demanda"
                                                        aria-label="Excluir demanda"
                                                    >
                                                        {actionLoading === `delete-${demand.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                        Excluir
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Demand Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1e2e] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                        <div className="bg-black/30 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editingDemand ? "Editar tarefa" : "Nova tarefa"}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSaveDemand} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Área / Ícone</span>
                                    <input required list="demand-area-options" value={form.area} onChange={e => setForm({...form, area: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Selecione ou escreva uma área" />
                                    <datalist id="demand-area-options">
                                        {demandAreas.map((area) => <option key={area} value={area} />)}
                                    </datalist>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Responsável</span>
                                    <div className="relative">
                                        <select required value={form.responsible} onChange={e => setForm({...form, responsible: e.target.value})} className="w-full appearance-none bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 pr-10 text-white outline-none focus:border-blue-500 text-sm cursor-pointer">
                                            {!['Eduarda', 'Fernando', 'Ambos'].includes(form.responsible) && <option value={form.responsible}>{form.responsible}</option>}
                                            <option value="Eduarda">Eduarda</option>
                                            <option value="Fernando">Fernando</option>
                                            <option value="Ambos">Ambos</option>
                                        </select>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 text-xs">▼</span>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ação / Demanda</span>
                                    <textarea required rows={2} value={form.action} onChange={e => setForm({...form, action: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm resize-y" placeholder="Descreva a ação de forma objetiva. Ex.: Enviar nova chave Pix aos clientes." />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Prazo / Limite</span>
                                    <input list="demand-deadline-options" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Selecione ou escreva um prazo" />
                                    <datalist id="demand-deadline-options">
                                        {deadlineOptions.map((deadline) => <option key={deadline} value={deadline} />)}
                                    </datalist>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tipo da Demanda</span>
                                    <div className="relative">
                                        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full appearance-none bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 pr-10 text-white outline-none focus:border-blue-500 text-sm cursor-pointer">
                                            {!demandTypes.includes(form.type) && <option value={form.type}>{form.type}</option>}
                                            {demandTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 text-xs">▼</span>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status</span>
                                    <div className="relative">
                                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                            <option value="Pendente">⏳ Pendente</option>
                                            <option value="Urgente">🔴 Urgente</option>
                                            <option value="Monitorar">👁️ Monitorar</option>
                                            <option value="Realizada">✅ Realizada</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Observações / Detalhes</span>
                                    <textarea rows={3} value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm resize-none" placeholder="Detalhes adicionais..." />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "save"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition shadow-lg shadow-blue-950/30 cursor-pointer disabled:opacity-50">
                                    {actionLoading === "save" && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Demanda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
