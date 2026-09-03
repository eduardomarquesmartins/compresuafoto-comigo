"use client";

import { useEffect, useState } from "react";
import { 
    Plus, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    Trash2, CheckCircle, Clock, Loader2, Filter, AlertCircle, FileUp, FileText,
    CreditCard, Copy, ExternalLink, MessageCircle, RefreshCw, XCircle, RotateCcw
} from "lucide-react";
import api, {
    getFinancials, getFinancialStats, createFinancial, updateFinancial, deleteFinancial, getClients, uploadFinancialNote,
    createBillingCharge, getBillingCharges, cancelBillingCharge, refreshBillingChargeLink, reissueBillingCharge, getContracts
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

export const parseCurrencyInput = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    let str = String(value).trim();
    if (!str) return 0;

    // Remove any non-digit character except dot, comma, and minus sign
    str = str.replace(/[^\d.,\-]/g, "");
    if (!str) return 0;

    const hasComma = str.includes(",");
    const hasDot = str.includes(".");

    if (hasComma && hasDot) {
        const lastComma = str.lastIndexOf(",");
        const lastDot = str.lastIndexOf(".");

        if (lastComma > lastDot) {
            // Brazilian format e.g. "1.234,56" or "1.000.000,50" -> dots are thousands, comma is decimal
            str = str.replace(/\./g, "").replace(",", ".");
        } else {
            // International format e.g. "1,234.56" -> commas are thousands, dot is decimal
            str = str.replace(/,/g, "");
        }
    } else if (hasComma) {
        const commaCount = (str.match(/,/g) || []).length;
        if (commaCount > 1) {
            str = str.replace(/,/g, "");
        } else {
            // Single comma e.g. "100,00", "100,5" -> decimal separator
            str = str.replace(",", ".");
        }
    } else if (hasDot) {
        const dotCount = (str.match(/\./g) || []).length;
        if (dotCount > 1) {
            str = str.replace(/\./g, "");
        } else {
            const [integerPart, decimalPart] = str.split(".");
            if (decimalPart && decimalPart.length === 3 && integerPart && integerPart.length >= 1 && integerPart.length <= 3) {
                // e.g. "1.000", "10.000", "100.000" -> thousands separator in Brazilian notation
                str = str.replace(/\./g, "");
            }
        }
    }

    const num = Number(str);
    return Number.isFinite(num) ? num : 0;
};

const getNextPaymentDate = (paymentDayInput?: number | string | null): string => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    let targetDay = parseInt(String(paymentDayInput || 25), 10);
    if (isNaN(targetDay) || targetDay < 1) targetDay = 1;
    if (targetDay > 31) targetDay = 31;

    let targetYear = currentYear;
    let targetMonth = currentMonth;

    if (currentDay > targetDay) {
        targetMonth += 1;
        if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
        }
    }

    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const finalDay = Math.min(targetDay, daysInTargetMonth);

    const yyyy = String(targetYear);
    const mm = String(targetMonth + 1).padStart(2, "0");
    const dd = String(finalDay).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
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
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [noteFile, setNoteFile] = useState<File | null>(null);

    // Cobranças por link
    const [billingCharges, setBillingCharges] = useState<any[]>([]);
    const [billingLoading, setBillingLoading] = useState(false);
    const [billingStatusFilter, setBillingStatusFilter] = useState("ALL");
    const [billingClientFilter, setBillingClientFilter] = useState("ALL");
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [billingForm, setBillingForm] = useState({ clientId: "", contractId: "", amount: "", description: "", dueDate: "" });
    const [billingAction, setBillingAction] = useState<string | null>(null);
    const [billingError, setBillingError] = useState<string | null>(null);

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
            const [recordsResult, statsResult, clientsResult, contractsResult] = await Promise.allSettled([
                getFinancials(params),
                getFinancialStats({ month, year }),
                getClients(),
                getContracts()
            ]);

            setRecords(recordsResult.status === "fulfilled" ? recordsResult.value : []);
            setStats(statsResult.status === "fulfilled" ? statsResult.value : { incomes: 0, expenses: 0, balance: 0, forecast: 0 });
            setClients(clientsResult.status === "fulfilled" && Array.isArray(clientsResult.value) ? clientsResult.value : []);
            setContracts(contractsResult.status === "fulfilled" && Array.isArray(contractsResult.value) ? contractsResult.value : []);
        } catch (error) {
            console.error("Erro ao carregar dados financeiros:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBillingCharges = async (statusFilter = billingStatusFilter, clientFilter = billingClientFilter) => {
        try {
            setBillingLoading(true);
            const params: { status?: string; clientId?: number } = {};
            if (statusFilter !== "ALL") {
                params.status = statusFilter;
            }
            if (clientFilter !== "ALL") {
                params.clientId = Number(clientFilter);
            }
            const charges = await getBillingCharges(params);
            setBillingCharges(Array.isArray(charges) ? charges : []);
        } catch (error) {
            console.error("Erro ao carregar cobranças por link:", error);
        } finally {
            setBillingLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, [month, year, typeFilter]);

    useEffect(() => {
        fetchBillingCharges(billingStatusFilter, billingClientFilter);
    }, [billingStatusFilter, billingClientFilter]);

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

    const handleDownloadNote = async (recordId: number) => {
        try {
            const response = await api.get(`/financials/${recordId}/note`, { responseType: "blob" });
            const fileUrl = URL.createObjectURL(response.data);
            window.open(fileUrl, "_blank", "noopener,noreferrer");
            window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
        } catch {
            alert("Não foi possível baixar esta nota.");
        }
    };

    const handleSaveRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseCurrencyInput(form.amount);
        if (!form.description.trim() || parsedAmount <= 0) {
            alert("Descrição e valor válido maior que zero são obrigatórios.");
            return;
        }

        try {
            setActionLoading("save");
            await createFinancial({
                ...form,
                amount: parsedAmount,
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

    const formatBillingAmount = (amount: unknown) => Number(amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const openBillingModal = () => {
        setBillingError(null);
        setBillingForm({
            clientId: clients[0]?.id ? String(clients[0].id) : "",
            contractId: "",
            amount: "",
            description: "",
            dueDate: ""
        });
        setBillingModalOpen(true);
    };

    const handleBillingClientChange = (newClientId: string) => {
        setBillingForm(prev => ({
            ...prev,
            clientId: newClientId,
            contractId: ""
        }));
    };

    const handleBillingContractChange = (newContractId: string) => {
        if (!newContractId) {
            setBillingForm(prev => ({
                ...prev,
                contractId: ""
            }));
            return;
        }

        const contract = contracts.find(c => String(c.id) === String(newContractId));
        if (!contract) return;

        const nextDueDate = getNextPaymentDate(contract.paymentDay);
        const [y, m, d] = nextDueDate.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const monthName = dateObj.toLocaleDateString("pt-BR", { month: "long" });
        const suggestedDesc = `Mensalidade de ${monthName}`;
        const formattedAmount = contract.monthlyValue != null
            ? Number(contract.monthlyValue).toFixed(2).replace(".", ",")
            : "";

        setBillingForm(prev => ({
            ...prev,
            contractId: newContractId,
            amount: formattedAmount,
            dueDate: nextDueDate,
            description: suggestedDesc
        }));
    };

    const handleCreateBilling = async (event: React.FormEvent) => {
        event.preventDefault();
        const amount = parseCurrencyInput(billingForm.amount);
        if (!billingForm.clientId || !billingForm.description.trim() || amount <= 0) {
            setBillingError("Selecione o cliente e informe uma descrição e um valor válido maior que zero.");
            return;
        }

        try {
            setBillingAction("create");
            const contractIdNum = billingForm.contractId ? Number(billingForm.contractId) : undefined;
            let idempotencyKey: string | undefined;

            if (contractIdNum) {
                let yearMonth = "";
                if (billingForm.dueDate) {
                    const [y, m] = billingForm.dueDate.split("-");
                    if (y && m) yearMonth = `${y}-${m.padStart(2, "0")}`;
                }
                if (!yearMonth) {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    yearMonth = `${yyyy}-${mm}`;
                }
                idempotencyKey = `contract-${contractIdNum}-${yearMonth}`;
            } else {
                idempotencyKey = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined;
            }

            const payload: any = {
                clientId: Number(billingForm.clientId),
                amount,
                description: billingForm.description.trim(),
                dueDate: billingForm.dueDate || undefined
            };
            if (contractIdNum) {
                payload.contractId = contractIdNum;
            }

            const charge = await createBillingCharge(payload, idempotencyKey);
            setBillingCharges(current => [charge, ...current.filter(item => item.id !== charge.id)]);
            setBillingModalOpen(false);
            setBillingForm({ clientId: "", contractId: "", amount: "", description: "", dueDate: "" });
            alert("Cobrança criada. Agora você pode copiar o link ou abrir o WhatsApp.");
        } catch (error: any) {
            const errorData = error.response?.data;
            if (error.response?.status === 502 && errorData?.chargeId) {
                setBillingError(`A cobrança #${errorData.chargeId} foi criada no sistema, mas houve instabilidade na comunicação com o Mercado Pago e ela ficou Em Revisão (não foi paga).`);
                fetchBillingCharges();
            } else {
                setBillingError(errorData?.error || "Não foi possível criar a cobrança.");
            }
        } finally {
            setBillingAction(null);
        }
    };

    const handleReissueCharge = async (charge: any) => {
        if (billingAction) return;
        const clientName = charge.client?.name || "este cliente";
        const formattedVal = formatBillingAmount(charge.amount);
        if (!confirm(`Gerar uma nova cobrança para ${clientName} no valor de ${formattedVal}?\n\nA cobrança cancelada anterior será mantida no histórico.`)) {
            return;
        }

        try {
            setBillingAction(`reissue-${charge.id}`);
            const reissued = await reissueBillingCharge(charge.id);
            setBillingCharges(current => [reissued, ...current.filter(item => item.id !== reissued.id)]);
            alert("Nova cobrança gerada com sucesso! O histórico da cobrança cancelada anterior foi preservado.");
        } catch (error: any) {
            console.error("Erro ao reemitir cobrança:", error);
            if (error.response?.status === 502 && error.response?.data?.chargeId) {
                alert(`Nova cobrança criada (#${error.response.data.chargeId}), mas ficou Em Revisão por instabilidade no provedor (não foi paga).`);
                fetchBillingCharges();
            } else {
                alert(error.response?.data?.error || "Não foi possível gerar nova cobrança.");
            }
        } finally {
            setBillingAction(null);
        }
    };

    const copyBillingLink = async (link?: string) => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            alert("Link copiado.");
        } catch {
            window.prompt("Copie o link da cobrança:", link);
        }
    };

    const whatsappBillingLink = (charge: any) => {
        const rawPhone = String(charge.client?.phone || "").replace(/\D/g, "");
        if (!rawPhone || !charge.checkoutUrl) return null;
        const phone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
        const message = `Olá, ${charge.client?.name || "tudo bem"}! Segue o link para pagamento de ${charge.description} no valor de ${formatBillingAmount(charge.amount)}: ${charge.checkoutUrl}`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    const handleBillingAction = async (action: "cancel" | "refresh", charge: any) => {
        if (billingAction) return;
        try {
            setBillingAction(`${action}-${charge.id}`);
            const updated = action === "cancel"
                ? await cancelBillingCharge(charge.id)
                : await refreshBillingChargeLink(charge.id);
            setBillingCharges(current => current.map(item => item.id === charge.id ? { ...item, ...updated } : item));
        } catch (error: any) {
            alert(error.response?.data?.error || "Não foi possível atualizar a cobrança.");
        } finally {
            setBillingAction(null);
        }
    };

    const billingStatus = (status: string) => {
        const labels: Record<string, string> = { OPEN: "Aberta", PENDING: "Aguardando", PAID: "Paga", FAILED: "Falhou", CANCELLED: "Cancelada", REFUNDED: "Reembolsada", REVIEW: "Em revisão" };
        return labels[status] || status;
    };

    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-sm font-extrabold tracking-[0.2em] uppercase text-blue-600">Gestão financeira</span>
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

            {/* Cobranças Econti */}
            <section className="bg-[#12141d] border border-blue-500/20 rounded-[28px] p-6 md:p-8 shadow-xl shadow-blue-950/10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400">Recebimentos Econti</p>
                        <h2 className="text-xl md:text-2xl font-bold text-white mt-1">Cobranças por link</h2>
                        <p className="text-xs text-slate-400 mt-2 max-w-xl">Gere um link Checkout Pro para o cliente pagar com Pix, cartão ou boleto. O botão do WhatsApp apenas abre uma mensagem pronta no seu celular.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openBillingModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-950/30 transition hover:from-blue-500 hover:to-indigo-500 active:scale-95 cursor-pointer"
                    >
                        <CreditCard size={16} />
                        Gerar cobrança
                    </button>
                </div>

                {/* Filtros específicos de Cobranças por link */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Filter size={14} className="text-blue-400" />
                            <span>Filtrar cobranças:</span>
                        </div>

                        {/* Filtro por Cliente */}
                        <label className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Cliente</span>
                            <div className="relative">
                                <select
                                    value={billingClientFilter}
                                    onChange={(e) => setBillingClientFilter(e.target.value)}
                                    className="bg-[#181a29] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                                >
                                    <option value="ALL">Todos os clientes</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 text-xs">▼</div>
                            </div>
                        </label>

                        {/* Filtro por Status */}
                        <label className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status</span>
                            <div className="relative">
                                <select
                                    value={billingStatusFilter}
                                    onChange={(e) => setBillingStatusFilter(e.target.value)}
                                    className="bg-[#181a29] border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2 text-white outline-none text-xs transition-colors appearance-none pr-8 cursor-pointer"
                                >
                                    <option value="ALL">Todos os status</option>
                                    <option value="PENDING">Aguardando / Aberta</option>
                                    <option value="PAID">Paga</option>
                                    <option value="CANCELLED">Cancelada</option>
                                    <option value="FAILED">Falhou</option>
                                    <option value="REFUNDED">Reembolsada</option>
                                    <option value="REVIEW">Em revisão</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 text-xs">▼</div>
                            </div>
                        </label>
                    </div>

                    {(billingStatusFilter !== "ALL" || billingClientFilter !== "ALL") && (
                        <button
                            type="button"
                            onClick={() => {
                                setBillingStatusFilter("ALL");
                                setBillingClientFilter("ALL");
                            }}
                            className="text-[10px] uppercase tracking-wider text-slate-400 hover:text-blue-400 font-bold transition-colors cursor-pointer"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>

                {billingLoading ? (
                    <div className="py-12 flex justify-center items-center">
                        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                    </div>
                ) : billingCharges.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-5 py-8 text-center">
                        <CreditCard size={26} className="mx-auto text-slate-600" />
                        <p className="mt-3 text-sm font-semibold text-slate-300">
                            {billingStatusFilter !== "ALL" || billingClientFilter !== "ALL"
                                ? "Nenhuma cobrança encontrada com os filtros selecionados."
                                : "Nenhuma cobrança criada ainda."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                        <table className="w-full min-w-[760px] text-left border-collapse">
                            <thead className="bg-[#0d0f19] border-b border-white/10">
                                <tr>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente / Descrição</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Valor</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Vencimento</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                                    <th className="px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {billingCharges.map(charge => {
                                    const whatsappUrl = whatsappBillingLink(charge);
                                    const terminal = ["PAID", "CANCELLED", "REFUNDED"].includes(charge.status);
                                    const isReview = charge.status === "REVIEW";
                                    const isCancelled = charge.status === "CANCELLED";
                                    const isPaid = charge.status === "PAID";
                                    const isFailed = charge.status === "FAILED";

                                    const statusColor = isPaid
                                        ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
                                        : isFailed
                                            ? "text-rose-300 bg-rose-500/10 border-rose-500/20"
                                            : isCancelled
                                                ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                                                : isReview
                                                    ? "text-amber-300 bg-amber-500/15 border-amber-500/30 font-bold"
                                                    : "text-amber-300 bg-amber-500/10 border-amber-500/20";
                                    return (
                                        <tr key={charge.id || charge.publicId} className="hover:bg-white/[0.025] transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-white text-sm">{charge.client?.name || "Cliente"}</div>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs text-slate-400 max-w-[280px] truncate" title={charge.description}>
                                                        {charge.description}
                                                    </span>
                                                    {charge.contractId && (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-300 border border-blue-500/20">
                                                            Contrato #{charge.contractId}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-sans tabular-nums font-bold text-blue-300">{formatBillingAmount(charge.amount)}</td>
                                            <td className="px-5 py-4 text-xs text-slate-400 font-sans tabular-nums">{charge.dueDate ? new Date(charge.dueDate).toLocaleDateString("pt-BR") : "Sem prazo"}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${statusColor}`}>
                                                    {isReview && <AlertCircle size={10} className="text-amber-400" />}
                                                    {billingStatus(charge.status)}
                                                </span>
                                                {isReview && (
                                                    <span className="block mt-1 text-[9px] text-amber-400/90 font-medium leading-tight max-w-[220px]">
                                                        Falha no provedor (não foi paga)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end items-center gap-1.5">
                                                    {isCancelled ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReissueCharge(charge)}
                                                            disabled={billingAction === `reissue-${charge.id}`}
                                                            title="Gerar nova cobrança a partir desta cancelada (preserva a antiga no histórico)"
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/20 hover:text-white disabled:opacity-40 cursor-pointer shadow-sm"
                                                        >
                                                            {billingAction === `reissue-${charge.id}` ? (
                                                                <Loader2 size={13} className="animate-spin text-blue-300" />
                                                            ) : (
                                                                <RotateCcw size={13} />
                                                            )}
                                                            <span>Gerar nova cobrança</span>
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button type="button" onClick={() => copyBillingLink(charge.checkoutUrl)} disabled={!charge.checkoutUrl} title="Copiar link" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300 disabled:opacity-30 cursor-pointer"><Copy size={14} /></button>
                                                            {charge.checkoutUrl && <a href={charge.checkoutUrl} target="_blank" rel="noreferrer" title="Abrir checkout" className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-300"><ExternalLink size={14} /></a>}
                                                            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noreferrer" title="Abrir WhatsApp com mensagem pronta" className="rounded-lg border border-emerald-500/20 p-2 text-emerald-400 transition hover:bg-emerald-500/10"><MessageCircle size={14} /></a>}
                                                            {!terminal && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleBillingAction("refresh", charge)}
                                                                    disabled={billingAction === `refresh-${charge.id}`}
                                                                    title={isReview ? "Tentar gerar link novamente no Mercado Pago" : "Gerar novo link"}
                                                                    className={`rounded-lg border p-2 transition cursor-pointer disabled:opacity-30 ${isReview ? "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white" : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"}`}
                                                                >
                                                                    {billingAction === `refresh-${charge.id}` ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                                </button>
                                                            )}
                                                            {!terminal && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { if (confirm("Cancelar esta cobrança?")) handleBillingAction("cancel", charge); }}
                                                                    disabled={billingAction === `cancel-${charge.id}`}
                                                                    title="Cancelar cobrança"
                                                                    className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-30 cursor-pointer"
                                                                >
                                                                    {billingAction === `cancel-${charge.id}` ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

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
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadNote(record.id)}
                                                            className="ml-2 inline-flex items-center gap-1 border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-blue-300 hover:bg-blue-500/20 rounded-full"
                                                        >
                                                            <FileText size={10} />
                                                            Nota
                                                        </button>
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
                                            <span className={`font-sans tabular-nums font-bold text-sm ${record.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                <div className="fixed inset-0 xl:left-[292px] bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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

            {/* Billing Modal */}
            {billingModalOpen && (() => {
                const eligibleContracts = contracts.filter(c => {
                    const cClientId = c.clientId || c.client?.id;
                    if (!billingForm.clientId || String(cClientId) !== String(billingForm.clientId)) return false;
                    const isActive = !c.status || String(c.status).toUpperCase() === "ACTIVE";
                    const isSigned = Boolean(c.signedAt);
                    return isActive && isSigned;
                });

                return (
                <div className="fixed inset-0 xl:left-[292px] bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1c1e2e] border border-blue-500/20 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"></div>
                        <div className="bg-black/30 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300 font-bold">Mercado Pago Econti</p>
                                <h3 className="text-xl font-bold text-white">Gerar cobrança por link</h3>
                            </div>
                            <button type="button" onClick={() => setBillingModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleCreateBilling} className="p-8 space-y-5">
                            {billingError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{billingError}</div>}
                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cliente</span>
                                <div className="relative">
                                    <select
                                        required
                                        value={billingForm.clientId}
                                        onChange={e => handleBillingClientChange(e.target.value)}
                                        className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer"
                                    >
                                        <option value="">Selecione um cliente</option>
                                        {clients.map(client => <option key={client.id} value={client.id}>{client.name} — {client.email}</option>)}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                </div>
                            </label>

                            <label className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Contrato Vinculado (Opcional)</span>
                                    {billingForm.clientId && (
                                        <span className="text-[10px] text-slate-500">
                                            {eligibleContracts.length} contrato{eligibleContracts.length === 1 ? "" : "s"} ativo(s) e assinado(s)
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <select
                                        value={billingForm.contractId}
                                        onChange={e => handleBillingContractChange(e.target.value)}
                                        disabled={!billingForm.clientId}
                                        className="w-full bg-[#111322] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <option value="">Cobrança avulsa (sem contrato)</option>
                                        {eligibleContracts.map(contract => (
                                            <option key={contract.id} value={contract.id}>
                                                Contrato #{contract.id} — Dia {contract.paymentDay || 25} (R$ {Number(contract.monthlyValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 text-xs">▼</div>
                                </div>
                                {billingForm.contractId && (
                                    <p className="text-[11px] text-blue-400/90 font-medium">
                                        Valor, vencimento e descrição sugerida preenchidos com base no contrato. Você pode editá-los livremente.
                                    </p>
                                )}
                            </label>

                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Descrição</span>
                                <input
                                    required
                                    value={billingForm.description}
                                    onChange={e => setBillingForm({ ...billingForm, description: e.target.value })}
                                    className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm"
                                    placeholder="Ex.: Mensalidade de setembro"
                                />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Valor (R$)</span>
                                    <input
                                        required
                                        inputMode="decimal"
                                        value={billingForm.amount}
                                        onChange={e => setBillingForm({ ...billingForm, amount: e.target.value })}
                                        className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-sans tabular-nums"
                                        placeholder="0,00"
                                    />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Vencimento (opcional)</span>
                                    <input
                                        type="date"
                                        value={billingForm.dueDate}
                                        onChange={e => setBillingForm({ ...billingForm, dueDate: e.target.value })}
                                        className="w-full bg-[#111322] border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-sans tabular-nums"
                                    />
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setBillingModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">Cancelar</button>
                                <button type="submit" disabled={billingAction === "create"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl transition shadow-lg cursor-pointer disabled:opacity-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500">
                                    {billingAction === "create" && <Loader2 size={16} className="animate-spin" />}
                                    Criar link de pagamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                );
            })()}

            {/* Record Modal (Receita/Despesa) */}
            {modalOpen && (
                <div className="fixed inset-0 xl:left-[292px] bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
