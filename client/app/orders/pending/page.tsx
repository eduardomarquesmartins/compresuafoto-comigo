"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";

function OrderPendingContent() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-6 flex flex-col items-center justify-center">
            <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8">
                    <Clock className="w-12 h-12 text-blue-500 animate-pulse" />
                </div>

                <h1 className="text-3xl font-light text-slate-900 mb-4 tracking-tight">Pagamento em Processamento</h1>
                <p className="text-slate-500 mb-10 font-light leading-relaxed">
                    O Mercado Pago está confirmando o seu pagamento. Assim que for aprovado, suas fotos serão liberadas em sua conta.
                </p>

                <div className="flex flex-col w-full gap-4">
                    <Link
                        href="/my-orders"
                        className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-brand transition-all shadow-xl shadow-black/5"
                    >
                        Ver Meus Pedidos
                        <ArrowRight size={20} />
                    </Link>

                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-2">
                        <CheckCircle2 size={16} className="text-brand" />
                        <span>Avisaremos por e-mail quando estiver pronto.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OrderPendingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
            <OrderPendingContent />
        </Suspense>
    );
}
