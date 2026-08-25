"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldAlert, Award, TrendingDown, DollarSign, Loader2, Edit2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { getDebts, createDebt, updateDebt, deleteDebt } from "@/lib/api";

const PRIORITY_OPTIONS = [
    "",
    "🔴 Urgente",
    "🟡 Atenção",
    "⚖️ Judicial",
    "🟢 Baixa",
    "CNPJ",
    "Fiscal"
];

const STATUS_OPTIONS = [
    "Aguardando",
    "Negociar agora",
    "Processo ativo",
    "Em acordo",
    "Parcelando",
    "A vencer",
    "Pago",
    "Quitado",
    "Suspenso"
];

const getDebtCreditor = (debt: any) => debt.credor || debt.creditor || "";
const isDebtCnpj = (debt: any) => Boolean(debt.isCnpj) || String(debt.holder || "").toLowerCase().includes("cnpj");

export default function AdminDebtsPage() {
    const [debts, setDebts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"CPF" | "CNPJ">("CPF");

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<any | null>(null);
    const [form, setForm] = useState({
        priority: "",
        credor: "",
        holder: "",
        originalAmount: "",
        bestOffer: "",
        type: "Serasa",
        status: "Negociar agora",
        obs: "",
        isCnpj: "false"
    });
    const priorityOptions = form.priority && !PRIORITY_OPTIONS.includes(form.priority)
        ? [form.priority, ...PRIORITY_OPTIONS]
        : PRIORITY_OPTIONS;
    const statusOptions = form.status && !STATUS_OPTIONS.includes(form.status)
        ? [form.status, ...STATUS_OPTIONS]
        : STATUS_OPTIONS;

    const fetchDebts = async () => {
        try {
            setLoading(true);
            const data = await getDebts();
            setDebts(data);
        } catch (error) {
            console.error("Erro ao buscar dívidas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebts();
    }, []);

    // Filtrar dívidas conforme o modo selecionado
    const filteredDebts = debts.filter(d => viewMode === "CNPJ" ? isDebtCnpj(d) : !isDebtCnpj(d));

    // Calcular Totais
    const totalOriginal = filteredDebts.reduce((acc, d) => acc + d.originalAmount, 0);
    const totalBestOffer = filteredDebts.reduce((acc, d) => acc + d.bestOffer, 0);
    const totalSavings = totalOriginal - totalBestOffer;
    const avgDiscount = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0;

    const handleOpenModal = (debt: any | null = null) => {
        if (debt) {
            setEditingDebt(debt);
            setForm({
                priority: debt.priority || "",
                credor: getDebtCreditor(debt),
                holder: debt.holder || "",
                originalAmount: String(debt.originalAmount),
                bestOffer: String(debt.bestOffer),
                type: debt.type || "Serasa",
                status: debt.status || "Negociar agora",
                obs: debt.obs || "",
                isCnpj: String(isDebtCnpj(debt))
            });
        } else {
            setEditingDebt(null);
            setForm({
                priority: viewMode === "CPF" ? "🟡 " : "",
                credor: "",
                holder: viewMode === "CPF" ? "CPF Eduarda" : "CNPJ &Conti",
                originalAmount: "",
                bestOffer: "",
                type: viewMode === "CPF" ? "Serasa" : "Fiscal",
                status: "Negociar agora",
                obs: "",
                isCnpj: String(viewMode === "CNPJ")
            });
        }
        setModalOpen(true);
    };

    const handleSaveDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.credor || !form.originalAmount) {
            alert("Credor/Item e Valor Original são obrigatórios.");
            return;
        }

        try {
            setActionLoading("save");
            const data = {
                ...form,
                creditor: form.credor,
                originalAmount: parseFloat(form.originalAmount),
                bestOffer: parseFloat(form.bestOffer || form.originalAmount),
                isCnpj: form.isCnpj === "true"
            };

            if (editingDebt) {
                await updateDebt(editingDebt.id, data);
            } else {
                await createDebt(data);
            }
            setModalOpen(false);
            fetchDebts();
        } catch (error) {
            console.error("Erro ao salvar dívida:", error);
            alert("Erro ao salvar dívida.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteDebt = async (id: number) => {
        if (confirm("Tem certeza que deseja remover este débito?")) {
            try {
                setActionLoading(`delete-${id}`);
                await deleteDebt(id);
                fetchDebts();
            } catch (error) {
                console.error("Erro ao excluir dívida:", error);
                alert("Erro ao excluir dívida.");
            } finally {
                setActionLoading(null);
            }
        }
    };

    // Estilo de badge de prioridade/status
    const getStatusStyle = (status: string, priority: string = "") => {
        const fullStr = (status + " " + priority).toLowerCase();
        if (fullStr.includes("🔴") || fullStr.includes("urgente") || fullStr.includes("processo ativo")) {
            return "bg-red-500/10 border-red-500/20 text-red-400 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]";
        }
        if (fullStr.includes("🟡") || fullStr.includes("negociar")) {
            return "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]";
        }
        if (fullStr.includes("pago") || fullStr.includes("quitado") || fullStr.includes("concluído")) {
            return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]";
        }
        return "bg-slate-800 border-white/5 text-slate-400";
    };

    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-blue-500 font-bold tracking-[0.18em] uppercase text-[10px]">Financeiro</span>
                    <h1 className="text-3xl font-semibold text-white tracking-tight mt-2">Dívidas e acordos</h1>
                    <p className="mt-2 text-sm text-slate-400">Priorize negociações, acompanhe propostas e registre cada etapa da quitação.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors cursor-pointer"
                >
                    <Plus size={16} />
                    Adicionar Débito
                </button>
            </div>

            {/* View Mode Select */}
            <div className="flex bg-[#121320] border border-slate-700 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setViewMode("CPF")}
                    className={`px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'CPF' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Pessoas
                </button>
                <button
                    onClick={() => setViewMode("CNPJ")}
                    className={`px-4 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${viewMode === 'CNPJ' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    Empresas
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                <div className="bg-[#12141d] p-5 flex flex-col justify-between min-h-[128px]">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Total Acumulado</span>
                        <TrendingDown size={21} className="text-red-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {totalOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Soma de todos os valores originais</p>
                    </div>
                </div>

                <div className="bg-[#12141d] p-5 flex flex-col justify-between min-h-[128px]">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Valor para Quitação</span>
                        <DollarSign size={21} className="text-blue-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6">
                        <span className="text-3xl font-light text-white tracking-tight">
                            R$ {totalBestOffer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Melhores propostas/ofertas para acordo</p>
                    </div>
                </div>

                <div className="bg-[#12141d] p-5 relative overflow-hidden flex flex-col justify-between min-h-[128px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-emerald-400 transition-colors">Economia Potencial</span>
                        <TrendingDown size={21} className="rotate-180 text-emerald-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-semibold text-emerald-400 tracking-tight">
                            R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">Diferença de negociação</p>
                    </div>
                </div>

                <div className="bg-[#12141d] p-5 relative overflow-hidden flex flex-col justify-between min-h-[128px]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.04] rounded-full blur-2xl"></div>
                    <div className="flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-emerald-400 transition-colors">Desconto Médio</span>
                        <Award size={21} className="text-emerald-500" aria-hidden="true" />
                    </div>
                    <div className="space-y-1 mt-6 z-10">
                        <span className="text-3xl font-bold text-emerald-400 tracking-tight">
                            {avgDiscount.toFixed(1)}%
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">Média de redução conquistada</p>
                    </div>
                </div>
            </div>

            {/* Debts Table */}
            <div className="bg-[#12141d] border border-white/10 rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="py-24 flex justify-center items-center">
                        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                    </div>
                ) : filteredDebts.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <AlertCircle size={32} className="text-slate-400 mb-3" />
                        <p className="text-slate-300 text-sm font-medium">Nenhum débito registrado para esta aba.</p>
                        <p className="text-slate-500 text-xs mt-1">Cadastre um débito manualmente para acompanhar acordos, prioridade e status.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#121320] border-b border-white/10">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 w-[120px]">Prioridade/CNPJ</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Credor / Item</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Titular / Empresa</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Valor Original</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Melhor Oferta</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Tipo</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status / Obs</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {filteredDebts.map(debt => (
                                    <tr key={debt.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5 font-bold text-xs text-white/80">
                                            {debt.priority || "-"}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-white text-sm tracking-tight">{getDebtCreditor(debt) || "-"}</div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-400 font-medium">
                                            {debt.holder || "-"}
                                        </td>
                                        <td className="px-6 py-5 font-mono text-sm text-slate-400 font-medium">
                                            R$ {debt.originalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 font-mono text-sm text-white font-bold">
                                            R$ {debt.bestOffer.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-slate-400 font-medium">
                                            {debt.type}
                                        </td>
                                        <td className="px-6 py-5 max-w-[280px]">
                                            <div className="space-y-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black tracking-wider uppercase border ${getStatusStyle(debt.status, debt.priority)}`}>
                                                    {debt.status}
                                                </span>
                                                {debt.obs && (
                                                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{debt.obs}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleOpenModal(debt)}
                                                    className="inline-flex w-24 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-[10px] font-bold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 cursor-pointer"
                                                    title="Editar Débito"
                                                    aria-label="Editar débito"
                                                >
                                                    <Edit2 size={13} />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDebt(debt.id)}
                                                    disabled={actionLoading === `delete-${debt.id}`}
                                                    className="admin-danger-button inline-flex w-24 items-center justify-center gap-1.5 px-2.5 py-2 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                                    title="Excluir Débito"
                                                    aria-label="Excluir débito"
                                                >
                                                    {actionLoading === `delete-${debt.id}` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Debt Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1e2e] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                        <div className="bg-black/30 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">
                                {editingDebt ? "Editar Débito" : "Adicionar Débito"}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSaveDebt} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Credor / Item</span>
                                    <input required value={form.credor} onChange={e => setForm({...form, credor: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Nome do credor" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Titular / Empresa</span>
                                    <input
                                        required
                                        value={form.holder}
                                        onChange={e => {
                                            const holder = e.target.value;
                                            const normalized = holder.toLowerCase();
                                            setForm({
                                                ...form,
                                                holder,
                                                isCnpj: normalized.includes("cnpj") ? "true" : normalized.includes("cpf") ? "false" : form.isCnpj
                                            });
                                        }}
                                        className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                                        placeholder="Ex: CPF Eduarda ou CNPJ &Conti"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Prioridade / Identificador</span>
                                    <div className="relative">
                                        <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                            {priorityOptions.map(option => (
                                                <option key={option || "none"} value={option}>{option || "Sem prioridade"}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tipo de Dívida</span>
                                    <input value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm" placeholder="Ex: Serasa, Protesto, Judicial, Fiscal" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Valor Original (R$)</span>
                                    <input required type="text" value={form.originalAmount} onChange={e => setForm({...form, originalAmount: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-mono" placeholder="0,00" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Melhor Oferta de Acordo (R$)</span>
                                    <input type="text" value={form.bestOffer} onChange={e => setForm({...form, bestOffer: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-mono" placeholder="Deixe em branco se for o mesmo valor" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status</span>
                                    <div className="relative">
                                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                            {statusOptions.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Dívida de CNPJ (Empresa)?</span>
                                    <div className="relative">
                                        <select value={form.isCnpj} onChange={e => setForm({...form, isCnpj: e.target.value})} className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer">
                                            <option value="false">Não (Dívida CPF - Pessoal)</option>
                                            <option value="true">Sim (Dívida CNPJ - Empresa)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Observações / Detalhes</span>
                                    <textarea rows={3} value={form.obs} onChange={e => setForm({...form, obs: e.target.value})} className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm resize-none" placeholder="Credor contatos, advogados, detalhes de desconto..." />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "save"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition shadow-lg shadow-blue-950/30 cursor-pointer disabled:opacity-50">
                                    {actionLoading === "save" && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Débito
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
