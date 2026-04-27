"use client";
import React from "react";
import { BadgePercent, Check, Sparkles } from "lucide-react";

const tiers = [
    {
        photos: "5 fotos",
        total: "75,00",
        discount: "25% OFF",
        perPhoto: "15,00",
        featured: false,
    },
    {
        photos: "10 fotos",
        total: "100,00",
        discount: "50% OFF",
        perPhoto: "10,00",
        featured: false,
    },
    {
        photos: "20 fotos",
        total: "180,00",
        discount: "55% OFF",
        perPhoto: "9,00",
        featured: true,
    },
];

export default function DiscountCard() {
    return (
        <div className="container mx-auto px-4 md:px-6 mb-8 md:mb-12">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[0.82fr_1.18fr]">
                    <div className="border-b border-slate-200 bg-slate-950 p-5 text-white sm:p-6 lg:border-b-0 lg:border-r">
                        <h2 className="text-2xl font-medium uppercase text-white md:text-3xl">
                            Descontos progressivos
                        </h2>
                        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300 md:text-base">
                            Quanto mais fotos você compra, menor fica o valor por foto.
                        </p>
                        <div className="mt-5 flex items-start gap-2 text-sm leading-5 text-slate-200">
                            <BadgePercent className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            <span>Desconto aplicado automaticamente no carrinho.</span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {tiers.map((tier) => (
                            <div
                                key={tier.photos}
                                className={`grid gap-4 p-5 transition-colors sm:p-6 lg:grid-cols-[1fr_auto_auto] lg:items-center ${
                                    tier.featured ? "bg-brand/5" : "bg-white hover:bg-slate-50"
                                }`}
                            >
                                <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <span className="text-lg font-semibold text-slate-950">{tier.photos}</span>
                                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold uppercase text-emerald-700">
                                            {tier.discount}
                                        </span>
                                        {tier.featured && (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold uppercase text-white">
                                                <Sparkles className="h-3 w-3 text-brand" />
                                                Melhor valor
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-2 text-sm leading-5 text-slate-500">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                        <span>Pacote ideal para galerias com várias escolhas.</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 lg:contents">
                                    <div className="rounded-md bg-slate-50 px-4 py-3 lg:bg-transparent lg:px-0 lg:py-0 lg:text-right">
                                        <span className="block text-xs font-medium uppercase text-slate-400">Total</span>
                                        <span className="block text-2xl font-semibold text-slate-950 md:text-3xl">
                                            R$ {tier.total}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 lg:min-w-32 lg:text-center">
                                        <span className="block text-xs font-medium uppercase text-slate-400">Por foto</span>
                                        <span className="block text-xl font-semibold text-brand">R$ {tier.perPhoto}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
