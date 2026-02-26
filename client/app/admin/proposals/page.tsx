"use client";
import React, { useEffect, useState } from "react";
import { FileText, Plus, Search, Trash2, CheckCircle, Clock } from "lucide-react";
import Link from 'next/link';
import { getProposals, deleteProposal, approveProposal } from "@/lib/api";

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-light text-white flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-500" />
                        Propostas Comerciais
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">Gerencie e acompanhe seus orçamentos.</p>
                </div>
                <Link
                    href="/admin/proposals/new"
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Nova Proposta
                </Link>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="col-span-full py-20 bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
                        <Search className="w-16 h-16 text-slate-700 mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest">Nenhuma proposta salva</p>
                        <p className="text-slate-500 text-sm mt-3 max-w-md mx-auto">
                            Clique em "Nova Proposta" para gerar o seu primeiro orçamento.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-slate-900/50 rounded-[32px] border border-slate-800">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <th className="px-8 py-6">Cliente</th>
                                    <th className="px-8 py-6">Data</th>
                                    <th className="px-8 py-6">Total</th>
                                    <th className="px-8 py-6">Status</th>
                                    <th className="px-8 py-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {proposals.map((proposal) => (
                                    <tr key={proposal.id} className="hover:bg-slate-800/20 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-bold text-white uppercase tracking-tight">{proposal.clientName}</div>
                                            <div className="text-xs text-slate-500">{proposal.clientEmail || 'Sem e-mail'}</div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-medium">
                                            {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-8 py-6 font-mono font-bold text-blue-400">
                                            R$ {proposal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-8 py-6">
                                            {proposal.status === 'APPROVED' ? (
                                                <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                    <CheckCircle size={12} /> Aprovada
                                                </span>
                                            ) : (
                                                <span className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                                    <Clock size={12} /> Pendente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                {proposal.status !== 'APPROVED' && (
                                                    <button
                                                        onClick={() => handleApprove(proposal.id)}
                                                        className="p-3 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-lg shadow-blue-500/10"
                                                        title="Aprovar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(proposal.id)}
                                                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                                                    title="Apagar"
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
