"use client";
import React from "react";
import { Tags, HandCoins } from "lucide-react";

export default function DiscountCard() {
    return (
        <div className="container mx-auto px-4 md:px-6 mb-8 md:mb-12">
            <div className="bg-white/70 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                {/* Background decorations */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand/5 blur-[120px] -z-10 rounded-full" />
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-400/5 blur-[100px] -z-10 rounded-full" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
                    <div className="space-y-1 md:space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand/10 rounded-2xl shadow-sm">
                                <Tags className="w-5 h-5 md:w-7 md:h-7 text-brand" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-light tracking-tight text-slate-900 uppercase">
                                Descontos <span className="text-brand font-normal">Progressivos</span>
                            </h2>
                        </div>
                        <p className="text-sm md:text-lg text-slate-500 font-normal">Quanto mais fotos você compra, maior o seu desconto automático!</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    {/* Tier 5 */}
                    <div className="bg-white/60 border border-black/5 p-4 md:p-6 rounded-3xl hover:border-brand/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/tier">
                        <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[8px] md:text-xs text-slate-500 font-normal uppercase tracking-wider mb-2 md:mb-3">5 fotos</span>
                        <div className="flex items-baseline gap-1 mb-1 md:mb-2">
                            <span className="text-xs font-normal text-slate-400">R$</span>
                            <p className="text-xl md:text-3xl font-medium text-blue-600">75,00</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">25% OFF</span>
                        </div>
                    </div>

                    {/* Tier 10 */}
                    <div className="bg-white/60 border border-black/5 p-4 md:p-6 rounded-3xl hover:border-brand/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/tier">
                        <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[8px] md:text-xs text-slate-500 font-normal uppercase tracking-wider mb-2 md:mb-3">10 fotos</span>
                        <div className="flex items-baseline gap-1 mb-1 md:mb-2">
                            <span className="text-xs font-normal text-slate-400">R$</span>
                            <p className="text-xl md:text-3xl font-medium text-purple-600">100,00</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">50% OFF</span>
                        </div>
                    </div>

                    {/* Tier 20 */}
                    <div className="bg-white/60 border border-black/5 p-4 md:p-6 rounded-3xl hover:border-brand/30 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group/tier">
                        <span className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[8px] md:text-xs text-slate-500 font-normal uppercase tracking-wider mb-2 md:mb-3">20 fotos</span>
                        <div className="flex items-baseline gap-1 mb-1 md:mb-2">
                            <span className="text-xs font-normal text-slate-400">R$</span>
                            <p className="text-xl md:text-3xl font-medium text-pink-600">180,00</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] md:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase">55% OFF</span>
                        </div>
                    </div>

                    {/* Best Value Highlight */}
                    <div className="bg-black text-white p-4 md:p-6 rounded-3xl relative overflow-hidden shadow-2xl hover:scale-[1.03] transition-transform duration-300">
                        <div className="absolute top-0 right-0 p-3">
                            <HandCoins className="w-4 h-4 md:w-5 md:h-5 text-brand" />
                        </div>
                        <span className="inline-block px-3 py-1 bg-brand text-white rounded-full text-[8px] md:text-xs font-medium uppercase tracking-widest mb-2 md:mb-3">Melhor Valor</span>
                        <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-xs font-normal text-white/50">R$</span>
                            <p className="text-2xl md:text-4xl font-normal text-white tracking-tight">9,00</p>
                        </div>
                        <p className="text-[10px] md:text-sm text-white/60 font-normal leading-tight uppercase tracking-tight">Cada foto no pc. 20</p>

                        {/* Decorative glow */}
                        <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-brand/30 blur-2xl rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
