"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Tag, Percent, DollarSign, Loader2, Save, X, Ticket } from "lucide-react";
import api from "@/lib/api";

interface Coupon {
    id: number;
    code: string;
    discountType: string;
    discountValue: number;
    expiryDate: string | null;
    maxUses: number | null;
    usedCount: number;
    isActive: boolean;
    freePhotos: number;
    oncePerCpf: boolean;
    createdAt: string;
}

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        expiryDate: "",
        maxUses: "",
        freePhotos: "",
        isActive: true,
        oncePerCpf: false
    });

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await api.get("/coupons");
            setCoupons(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.warn("Erro ao buscar cupons. Renderizando lista vazia.");
            setCoupons([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenModal = (coupon: Coupon | null = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue.toString(),
                expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : "",
                maxUses: coupon.maxUses?.toString() || "",
                freePhotos: coupon.freePhotos?.toString() || "0",
                isActive: coupon.isActive,
                oncePerCpf: coupon.oncePerCpf
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: "",
                discountType: "PERCENTAGE",
                discountValue: "0",
                expiryDate: "",
                maxUses: "",
                freePhotos: "0",
                isActive: true,
                oncePerCpf: false
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const data = {
                ...formData,
                discountValue: parseFloat(formData.discountValue || "0"),
                maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                freePhotos: parseInt(formData.freePhotos || "0"),
                code: formData.code.toUpperCase()
            };

            if (editingCoupon) {
                await api.put(`/coupons/${editingCoupon.id}`, data);
            } else {
                await api.post("/coupons", data);
            }
            fetchCoupons();
            setShowModal(false);
        } catch (error: any) {
            alert(error.response?.data?.error || "Erro ao salvar cupom");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
        try {
            await api.delete(`/coupons/${id}`);
            fetchCoupons();
        } catch (error) {
            alert("Erro ao excluir cupom");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-light text-white flex items-center gap-3">
                        <Ticket className="w-8 h-8 text-blue-500" />
                        Cupons de Desconto
                    </h1>
                    <p className="text-slate-400 font-medium mt-1">Gerencie suas promoções e códigos de desconto.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 active:scale-95 group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    Novo Cupom
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.length === 0 ? (
                    <div className="col-span-full py-20 bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-center">
                        <Tag className="w-16 h-16 text-slate-700 mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest">Nenhum cupom cadastrado</p>
                    </div>
                ) : (
                    coupons.map((coupon) => (
                        <div
                            key={coupon.id}
                            className={`group relative bg-white rounded-[32px] p-6 border-2 transition-all hover:translate-y-[-4px] ${coupon.isActive ? 'border-transparent hover:border-blue-500/50 hover:shadow-2xl' : 'grayscale opacity-60 border-slate-200'}`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200 flex items-center gap-2 group-hover:border-blue-500/30 transition-colors">
                                    <Tag className="w-4 h-4 text-blue-600" />
                                    <span className="font-black text-slate-900 tracking-widest text-sm">#{coupon.code}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(coupon.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex flex-col mb-6">
                                {coupon.discountValue > 0 && (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                            {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue}`}
                                        </span>
                                        <span className="text-blue-600 font-black uppercase text-xs tracking-[0.2em]">OFF</span>
                                    </div>
                                )}
                                {coupon.freePhotos > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="p-1.5 bg-green-100 rounded-lg">
                                            < Ticket className="w-4 h-4 text-green-600" />
                                        </div>
                                        <span className="text-lg font-black text-slate-800 tracking-tight">
                                            +{coupon.freePhotos} {coupon.freePhotos === 1 ? 'Foto Grátis' : 'Fotos Grátis'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-slate-100">
                                {coupon.expiryDate && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        Expira em: <span className="text-slate-900">{new Date(coupon.expiryDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <Ticket className="w-4 h-4 text-slate-400" />
                                    Usos: <span className="text-slate-900">{coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : '(∞)'}</span>
                                </div>
                                {coupon.oncePerCpf && (
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">
                                        <span>🔒</span>
                                        1x por CPF
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleOpenModal(coupon)}
                                className="w-full mt-8 py-4 rounded-2xl bg-slate-100 font-black uppercase text-[10px] tracking-[0.2em] text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            >
                                Detalhes / Editar
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide text-white">
                        <div className="p-8 md:p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        <Tag className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                        {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
                                    </h2>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-800 rounded-2xl transition-all text-zinc-400 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Código do Cupom</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="EX: VERÃO25"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Tipo de Desconto</label>
                                        <select
                                            value={formData.discountType}
                                            onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                            className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 appearance-none"
                                        >
                                            <option value="PERCENTAGE">Porcentagem (%)</option>
                                            <option value="FIXED">Valor Fixo (R$)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Valor do Desconto</label>
                                        <div className="relative">
                                            {formData.discountType === 'PERCENTAGE' ? (
                                                <Percent className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                            ) : (
                                                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
                                            )}
                                            <input
                                                type="number"
                                                required
                                                step="0.01"
                                                value={formData.discountValue}
                                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                                                className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 pl-12 font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Fotos Gratuitas ✨</label>
                                    <div className="relative">
                                        <Ticket className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                                        <input
                                            type="number"
                                            placeholder="Ex: 2"
                                            value={formData.freePhotos}
                                            onChange={(e) => setFormData({ ...formData, freePhotos: e.target.value })}
                                            className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 pl-12 font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10"
                                        />
                                    </div>
                                    <p className="block font-mono text-[9px] font-semibold uppercase tracking-widest text-zinc-500 ml-1 mt-2">O cliente ganhará X fotos totalmente grátis</p>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Expiração</label>
                                        <input
                                            type="date"
                                            value={formData.expiryDate}
                                            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                            className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 font-bold text-white outline-none transition focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 [color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 ml-1">Limite de Uso</label>
                                        <input
                                            type="number"
                                            placeholder="Ex: 50"
                                            value={formData.maxUses}
                                            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                                            className="w-full rounded-[16px] border border-zinc-800 bg-zinc-950 px-5 py-4 font-bold text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-zinc-800/50 p-5 rounded-[20px] border border-zinc-700/50">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest text-white">Status</span>
                                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest mt-1">Cupom Ativo</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                        className={`w-14 h-8 rounded-full transition-all relative ${formData.isActive ? 'bg-blue-500' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.isActive ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-amber-500/10 p-5 rounded-[20px] border border-amber-500/20">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-500">🔒 Uso único por CPF</span>
                                        <span className="text-[10px] font-medium text-amber-500/70 uppercase tracking-widest mt-1">Cada CPF usa apenas 1 vez</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, oncePerCpf: !formData.oncePerCpf })}
                                        className={`w-14 h-8 rounded-full transition-all relative ${formData.oncePerCpf ? 'bg-amber-500' : 'bg-zinc-700'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.oncePerCpf ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[20px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {editingCoupon ? "Atualizar Cupom" : "Criar Novo Cupom"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
