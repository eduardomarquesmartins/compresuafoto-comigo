"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Mail, Phone, FileText, Trash2, Edit2, Check, Loader2, Calendar, ShieldAlert } from "lucide-react";
import { 
    getClients, createClient, updateClient, deleteClient, 
    createContract, deleteContract
} from "@/lib/api";

export default function AdminClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modais
    const [clientModalOpen, setClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<any | null>(null);
    const [contractModalOpen, setContractModalOpen] = useState(false);
    const [selectedClientForContract, setSelectedClientForContract] = useState<any | null>(null);

    // Formulários
    const [clientForm, setClientForm] = useState({
        name: "",
        email: "",
        document: "",
        phone: "",
        address: "",
        cityState: "",
        signerName: "",
        signerDocument: "",
        status: "ACTIVE"
    });

    const [contractForm, setContractForm] = useState({
        scope: "gestão de redes sociais, incluindo planejamento, criação de conteúdo, publicações, acompanhamento estratégico e serviços de marketing digital conforme proposta aprovada",
        monthlyValue: "",
        durationMonths: "6",
        paymentDay: "25",
        startDate: new Date().toISOString().split('T')[0],
        contractDate: new Date().toLocaleDateString("pt-BR")
    });

    const normalizeClient = (client: any) => ({
        ...client,
        contracts: Array.isArray(client?.contracts) ? client.contracts : []
    });

    const fetchClients = async () => {
        setLoading(true);
        setFetchError(null);

        try {
            const data = await getClients();
            setClients(Array.isArray(data) ? data.map(normalizeClient) : []);
        } catch (error: any) {
            const status = error.response?.status;
            const message = error.code === 'ECONNABORTED'
                ? 'A API demorou para responder. Tente novamente em instantes.'
                : error.code === 'ERR_NETWORK'
                    ? 'Não foi possível conectar na API. Verifique se o servidor está ativo na porta 3002.'
                    : error.response?.data?.error || error.response?.data?.message || error.message || 'Erro inesperado ao carregar clientes.';

            setClients([]);
            setFetchError(status ? `Erro ${status}: ${message}` : message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleOpenClientModal = (client: any | null = null) => {
        if (client) {
            setEditingClient(normalizeClient(client));
            setClientForm({
                name: client.name || "",
                email: client.email || "",
                document: client.document || "",
                phone: client.phone || "",
                address: client.address || "",
                cityState: client.cityState || "",
                signerName: client.signerName || "",
                signerDocument: client.signerDocument || "",
                status: client.status || "ACTIVE"
            });
        } else {
            setEditingClient(null);
            setClientForm({
                name: "",
                email: "",
                document: "",
                phone: "",
                address: "",
                cityState: "",
                signerName: "",
                signerDocument: "",
                status: "ACTIVE"
            });
        }
        setClientModalOpen(true);
    };

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientForm.name || !clientForm.email) {
            alert("Nome e E-mail são obrigatórios.");
            return;
        }

        try {
            setActionLoading("client");
            if (editingClient) {
                await updateClient(editingClient.id, clientForm);
            } else {
                await createClient(clientForm);
            }
            setClientModalOpen(false);
            fetchClients();
        } catch (error: any) {
            console.error("Erro ao salvar cliente:", error);
            alert(error.response?.data?.error || "Erro ao salvar cliente.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteClient = async (id: number) => {
        if (confirm("Tem certeza que deseja excluir este cliente? Todos os contratos associados serão excluídos.")) {
            try {
                setActionLoading(`delete-client-${id}`);
                await deleteClient(id);
                fetchClients();
            } catch (error) {
                console.error("Erro ao excluir cliente:", error);
                alert("Erro ao excluir cliente.");
            } finally {
                setActionLoading(null);
            }
        }
    };

    const handleOpenContractModal = (client: any) => {
        setSelectedClientForContract(normalizeClient(client));
        setContractForm({
            scope: "gestão de redes sociais, incluindo planejamento, criação de conteúdo, publicações, acompanhamento estratégico e serviços de marketing digital conforme proposta aprovada",
            monthlyValue: "",
            durationMonths: "6",
            paymentDay: "25",
            startDate: new Date().toISOString().split('T')[0],
            contractDate: new Date().toLocaleDateString("pt-BR")
        });
        setContractModalOpen(true);
    };

    const handleSaveContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractForm.scope || !contractForm.monthlyValue) {
            alert("Escopo e valor mensal são obrigatórios.");
            return;
        }

        try {
            setActionLoading("contract");
            await createContract({
                clientId: selectedClientForContract.id,
                ...contractForm,
                monthlyValue: parseFloat(contractForm.monthlyValue.replace(",", "."))
            });
            setContractModalOpen(false);
            fetchClients();
        } catch (error) {
            console.error("Erro ao criar contrato:", error);
            alert("Erro ao criar contrato.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteContract = async (id: number) => {
        if (confirm("Deseja realmente excluir este contrato?")) {
            try {
                setActionLoading(`delete-contract-${id}`);
                await deleteContract(id);
                fetchClients();
            } catch (error) {
                console.error("Erro ao excluir contrato:", error);
                alert("Erro ao excluir contrato.");
            } finally {
                setActionLoading(null);
            }
        }
    };


    return (
        <div className="pb-20 max-w-[1400px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <span className="text-blue-500 font-semibold tracking-widest uppercase text-xs">Gestão de Contas</span>
                    <h1 className="text-4xl font-extralight text-white tracking-tight flex items-center gap-4 mt-2">
                        Clientes Ativos
                    </h1>
                </div>
                <button
                    onClick={() => handleOpenClientModal()}
                    className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-white/5 active:scale-95 cursor-pointer"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Cadastrar Cliente
                </button>
            </div>

            {fetchError && (
                <div className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-amber-100 shadow-2xl shadow-amber-950/20 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                            <ShieldAlert size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-50">Clientes indisponíveis no momento</p>
                            <p className="mt-1 text-sm text-amber-100/80">{fetchError}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchClients}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-400/20"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Clients List */}
            {loading ? (
                <div className="py-24 flex justify-center items-center">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                </div>
            ) : clients.length === 0 ? (
                <div className="py-28 bg-[#161826]/80 backdrop-blur-xl rounded-[32px] border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-[#0f111a]/80 flex items-center justify-center border border-white/10 shadow-inner relative">
                            <div className="absolute inset-0 bg-blue-500/[0.05] rounded-full blur-md"></div>
                            <Users size={32} className="text-slate-500 relative z-10" />
                        </div>
                        <div>
                            <p className="text-slate-200 font-bold tracking-widest uppercase text-xs">Nenhum cliente cadastrado</p>
                            <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                                Adicione clientes ao seu portfólio comercial para vincular contratos e manter o histórico organizado.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {clients.map(client => {
                        const clientContracts = Array.isArray(client.contracts) ? client.contracts : [];

                        return (
                        <div key={client.id} className="group bg-gradient-to-br from-[#161826] to-[#11131e] border border-white/10 hover:border-blue-500/25 rounded-[32px] shadow-2xl overflow-hidden relative transition-all duration-500 p-6 md:p-8 space-y-6">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                            
                            {/* Client Header Info */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">{client.name}</h3>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${client.status === 'ACTIVE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                                            {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
                                        {client.email && (
                                            <span className="flex items-center gap-2 hover:text-white transition-colors">
                                                <Mail size={13} className="text-blue-500" /> {client.email}
                                            </span>
                                        )}
                                        {client.phone && (
                                            <span className="flex items-center gap-2 hover:text-white transition-colors">
                                                <Phone size={13} className="text-blue-500" /> {client.phone}
                                            </span>
                                        )}
                                        {client.document && (
                                            <span className="text-slate-500">Documento: <strong className="text-slate-400 font-semibold">{client.document}</strong></span>
                                        )}
                                        {client.cityState && (
                                            <span className="text-slate-500">Localização: <strong className="text-slate-400 font-semibold">{client.cityState}</strong></span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <button
                                        onClick={() => handleOpenContractModal(client)}
                                        className="text-[10px] font-black uppercase tracking-widest bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-950/20 active:scale-95"
                                    >
                                        Vincular Contrato
                                    </button>
                                    <button
                                        onClick={() => handleOpenClientModal(client)}
                                        className="text-slate-400 hover:text-white p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all cursor-pointer"
                                        title="Editar Cliente"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClient(client.id)}
                                        disabled={actionLoading === `delete-client-${client.id}`}
                                        className="text-slate-500 hover:text-red-400 p-3 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                        title="Excluir Cliente"
                                    >
                                        {actionLoading === `delete-client-${client.id}` ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Client Contracts List */}
                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileText size={13} className="text-slate-500" />
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Contratos Contratados</h4>
                                </div>
                                {clientContracts.length === 0 ? (
                                    <div className="bg-[#0f111a]/40 border border-dashed border-white/10 rounded-2xl p-6 text-center">
                                        <p className="text-xs text-slate-500 italic">Nenhum contrato ativo cadastrado para este cliente.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {clientContracts.map((contract: any) => (
                                            <div key={contract.id} className="bg-[#0f111a]/60 border border-white/10 hover:border-white/20 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
                                                <div className="space-y-3 flex-1">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="font-mono text-base font-bold text-white bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-xl">
                                                            R$ {contract.monthlyValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 bg-[#161826] border border-white/10 px-3 py-1 rounded-lg font-bold uppercase tracking-wider">
                                                            Vence Dia {contract.paymentDay}
                                                        </span>
                                                        <span className="text-[10px] text-slate-300 bg-[#161826] border border-white/10 px-3 py-1 rounded-lg font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                            <Calendar size={11} /> {contract.durationMonths} meses
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">{contract.scope}</p>
                                                    <div className="text-[10px] text-slate-500 flex gap-6 font-semibold">
                                                        <span>Início: <strong className="text-slate-400">{new Date(contract.startDate).toLocaleDateString('pt-BR')}</strong></span>
                                                        {contract.endDate && <span>Vencimento: <strong className="text-slate-400">{new Date(contract.endDate).toLocaleDateString('pt-BR')}</strong></span>}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleDeleteContract(contract.id)}
                                                        disabled={actionLoading === `delete-contract-${contract.id}`}
                                                        className="text-slate-500 hover:text-red-400 p-3 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                                                        title="Excluir Contrato"
                                                    >
                                                        {actionLoading === `delete-contract-${contract.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        );
                    })}
                </div>
            )}

            {/* Client Modal */}
            {clientModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161826] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                        <div className="bg-black/40 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">{editingClient ? "Editar Cliente" : "Cadastrar Cliente"}</h3>
                            <button onClick={() => setClientModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nome / Razão Social</span>
                                    <input required value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Nome da empresa" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">E-mail Comercial</span>
                                    <input required type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="email@comercial.com" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">CNPJ / CPF</span>
                                    <input value={clientForm.document} onChange={e => setClientForm({...clientForm, document: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="00.000.000/0001-00" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Telefone</span>
                                    <input value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="(00) 00000-0000" />
                                </label>
                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Endereço</span>
                                    <input value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Rua, número, sala, bairro" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cidade / UF</span>
                                    <input value={clientForm.cityState} onChange={e => setClientForm({...clientForm, cityState: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Porto Alegre/RS" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Status</span>
                                    <div className="relative">
                                        <select value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-white outline-none text-sm appearance-none pr-8 cursor-pointer focus:ring-1 focus:ring-blue-500/35 transition-all">
                                            <option value="ACTIVE">Ativo</option>
                                            <option value="INACTIVE">Inativo</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 text-xs">▼</div>
                                    </div>
                                </label>
                                <div className="md:col-span-2 h-[1px] bg-white/10 my-2"></div>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Nome do Representante</span>
                                    <input value={clientForm.signerName} onChange={e => setClientForm({...clientForm, signerName: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Representante legal" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">CPF do Representante</span>
                                    <input value={clientForm.signerDocument} onChange={e => setClientForm({...clientForm, signerDocument: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="000.000.000-00" />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setClientModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "client"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition shadow-lg shadow-blue-950/30 cursor-pointer disabled:opacity-50">
                                    {actionLoading === "client" && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Contract Modal */}
            {contractModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161826] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                        <div className="bg-black/40 px-8 py-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">Criar Novo Contrato</h3>
                                <p className="text-xs text-slate-400 mt-1">Cliente: {selectedClientForContract?.name}</p>
                            </div>
                            <button onClick={() => setContractModalOpen(false)} className="text-slate-400 hover:text-white text-2xl font-light cursor-pointer">&times;</button>
                        </div>
                        <form onSubmit={handleSaveContract} className="p-8 space-y-6">
                            <label className="flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Escopo dos Serviços</span>
                                <textarea required rows={4} value={contractForm.scope} onChange={e => setContractForm({...contractForm, scope: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm resize-none focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Escreva os detalhes do escopo..." />
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Valor Mensal (R$)</span>
                                    <input required type="text" value={contractForm.monthlyValue} onChange={e => setContractForm({...contractForm, monthlyValue: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm font-mono focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="0,00" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Vigência (Meses)</span>
                                    <input required type="number" value={contractForm.durationMonths} onChange={e => setContractForm({...contractForm, durationMonths: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="6" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Dia do Pagamento</span>
                                    <input required type="number" min={1} max={31} value={contractForm.paymentDay} onChange={e => setContractForm({...contractForm, paymentDay: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="25" />
                                </label>
                                <label className="flex flex-col gap-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Data de Início</span>
                                    <input required type="date" value={contractForm.startDate} onChange={e => setContractForm({...contractForm, startDate: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" />
                                </label>
                                <label className="flex flex-col gap-2 md:col-span-2">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Data de Vigência por Extenso</span>
                                    <input required type="text" value={contractForm.contractDate} onChange={e => setContractForm({...contractForm, contractDate: e.target.value})} className="w-full bg-[#0f111a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 text-sm focus:ring-1 focus:ring-blue-500/35 transition-all" placeholder="Ex: 03/06/2026 ou 03 de Junho de 2026" />
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setContractModalOpen(false)} className="px-5 py-3 text-sm font-bold text-slate-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionLoading === "contract"} className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition shadow-lg shadow-blue-950/30 cursor-pointer disabled:opacity-50">
                                    {actionLoading === "contract" && <Loader2 size={16} className="animate-spin" />}
                                    Salvar Contrato
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
