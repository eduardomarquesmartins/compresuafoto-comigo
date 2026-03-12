"use client";

import { Suspense } from "react";
import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

function OrderFailureContent() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans p-6 flex flex-col items-center justify-center">
            <div className="max-w-md w-full bg-white p-12 rounded-[3.5rem] border border-black/5 shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-8">
                    <XCircle className="w-12 h-12 text-red-500" />
                </div>

                <h1 className="text-3xl font-light text-slate-900 mb-4 tracking-tight">Ops! Algo deu errado.</h1>
                <p className="text-slate-500 mb-10 font-light leading-relaxed">
                    Não conseguimos processar o seu pagamento. Não se preocupe, nenhuma cobrança foi realizada.
                </p>

                <div className="flex flex-col w-full gap-4">
                    <Link
                        href="/events"
                        className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:bg-brand transition-all shadow-xl shadow-black/5"
                    >
                        <RefreshCw size={20} />
                        Tentar Novamente
                    </Link>

                    <Link
                        href="/"
                        className="text-slate-400 hover:text-slate-600 font-medium flex items-center justify-center gap-2 transition-colors py-2"
                    >
                        <ArrowLeft size={16} />
                        Voltar para o Início
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function OrderFailurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
            <OrderFailureContent />
        </Suspense>
    );
}
