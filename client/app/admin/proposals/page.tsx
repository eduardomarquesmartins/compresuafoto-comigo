"use client";
import React, { useEffect, useState } from "react";
import { FileText, Plus, Trash2, CheckCircle, Clock, Pencil } from "lucide-react";
import Link from 'next/link';
import { getClients, getProposals, deleteProposal, approveProposal, linkProposalClient } from "@/lib/api";

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [linkingId, setLinkingId] = useState<number | null>(null);

    const fetchProposals = async () => {
        try {
            setLoading(true);
            const data = await getProposals();
            setProposals(data);
        } catch (error) {
            console.error("Erro ao buscar propostas:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
        const loadClients = async () => {
            try {
                const data = await getClients();
                setClients(Array.isArray(data) ? data : []);
            } catch (error) {
                console.warn("Erro ao carregar clientes:", error);
            }
        };
        loadClients();
    }, []);

    const handleDelete = async (id: number) => {
        if (confirm("Tem certeza que deseja apagar esta proposta?")) {
            try {
                await deleteProposal(id);
                setProposals(proposals.filter(p => p.id !== id));
            } catch (error) {
                alert("Erro ao apagar proposta.");
            }
        }
    };

    const handleApprove = async (id: number) => {
        if (confirm("Deseja aprovar esta proposta? Ela será contabilizada como venda no dashboard.")) {
            try {
                await approveProposal(id);
                setProposals(proposals.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
            } catch (error) {
                alert("Erro ao aprovar proposta.");
            }
        }
    };

    const handleLinkClient = async (proposalId: number, clientId: string) => {
        try {
            setLinkingId(proposalId);
            const updatedProposal = await linkProposalClient(proposalId, clientId ? Number(clientId) : undefined);
            setProposals(proposals.map(proposal => proposal.id === proposalId ? updatedProposal : proposal));
        } catch (error) {
            console.error("Erro ao vincular cliente:", error);
            alert("Erro ao vincular cliente à proposta.");
        } finally {
            setLinkingId(null);
        }
    };

    return (
        <div className="pb-12 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <span className="text-sm font-extrabold tracking-[0.2em] uppercase text-blue-600">Propostas comerciais</span>
                </div>
                <Link
                    href="/admin/proposals/new"
                    className="group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-white/10 active:scale-95"
                >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
                    Nova Proposta
                </Link>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="col-span-full py-24 bg-[#0a0a0c]/80 backdrop-blur-xl rounded-[32px] border border-white/5 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center border border-white/5 shadow-inner">
                                <FileText size={32} className="text-slate-600" />
                            </div>
                            <div>
                                <p className="text-slate-300 font-medium tracking-widest uppercase text-sm">Nenhuma proposta salva</p>
                                <p className="text-slate-600 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                                    Crie seu primeiro orçamento personalizado e acompanhe suas conversões por aqui.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#0a0a0c]/80 backdrop-blur-xl rounded-[32px] border border-white/5 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
                        <table className="w-full text-left">
                            <thead className="bg-black/40 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cliente</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Data</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Total</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-300">
                                {proposals.map((proposal) => (
                                    <tr key={proposal.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-medium text-white text-base tracking-tight mb-1">{proposal.client?.name || proposal.clientName}</div>
                                            <div className="text-xs font-semibold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                                                {proposal.client ? "Vinculada ao cliente" : "Sem vínculo"} · {proposal.client?.email || proposal.clientEmail || 'Sem e-mail'}
                                            </div>
                                            <select
                                                value={proposal.clientId || proposal.client?.id || ""}
                                                onChange={event => handleLinkClient(proposal.id, event.target.value)}
                                                disabled={linkingId === proposal.id}
                                                className="mt-3 w-full max-w-[320px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-200 outline-none transition focus:border-blue-500 disabled:opacity-50"
                                            >
                                                <option value="">Vincular cliente...</option>
                                                {clients.map(client => (
                                                    <option key={client.id} value={client.id}>
                                                        {client.name} {client.email ? `- ${client.email}` : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-medium tracking-tight text-slate-400">
                                            {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-light tracking-tight text-white text-base">
                                                R$ {proposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {proposal.status === 'APPROVED' ? (
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase border bg-green-500/10 border-green-500/20 text-green-400 shadow-[inset_0_0_10px_rgba(7ade80,0.1)] gap-1.5">
                                                    <CheckCircle size={12} /> Aprovada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase border bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)] gap-1.5">
                                                    <Clock size={12} /> Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-end items-center gap-2">
                                                <Link
                                                    href={`/admin/proposals/new?edit=${proposal.id}`}
                                                    className="text-slate-400 hover:text-white p-2 hover:bg-white/10 border border-transparent hover:border-white/20 rounded-lg transition-all flex items-center justify-center"
                                                    title="Editar Orçamento"
                                                >
                                                    <Pencil size={18} />
                                                </Link>
                                                {proposal.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleApprove(proposal.id)}
                                                        className="text-slate-400 hover:text-blue-400 p-2 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-lg transition-all"
                                                        title="Aprovar e Faturar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/admin/contracts?proposalId=${proposal.id}`}
                                                    className="text-slate-400 hover:text-green-400 p-2 hover:bg-green-500/10 border border-transparent hover:border-green-500/20 rounded-lg transition-all flex items-center justify-center"
                                                    title="Gerar Contrato"
                                                >
                                                    <FileText size={18} />
                                                </Link>
                                                <div className="w-[1px] h-6 bg-white/10 mx-2"></div>
                                                <button
                                                    onClick={() => handleDelete(proposal.id)}
                                                    className="text-slate-400 hover:text-red-400 p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-all"
                                                    title="Apagar Orçamento"
                                                >
                                                    <Trash2 size={18} />
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
        </div>
    );
}
