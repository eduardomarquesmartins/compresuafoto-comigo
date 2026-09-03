"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { getPublicBillingCharge, syncPublicBillingCharge } from "@/lib/api";

type Charge = {
    publicId: string;
    amount: number | string;
    currency?: string;
    description: string;
    status: string;
    dueDate?: string | null;
    paidAt?: string | null;
    checkoutUrl?: string | null;
    client?: { name?: string };
};

const money = (value: number | string) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function PublicChargeContent() {
    const params = useParams<{ publicId: string }>();
    const searchParams = useSearchParams();
    const publicId = params.publicId;
    const [charge, setCharge] = useState<Charge | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCharge = useCallback(async (syncPayment = true) => {
        if (!publicId) return;
        setError(null);
        try {
            const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
            const result = paymentId && syncPayment
                ? await syncPublicBillingCharge(publicId, paymentId).catch(() => getPublicBillingCharge(publicId))
                : await getPublicBillingCharge(publicId);
            setCharge(result);
        } catch (err: any) {
            setError(err.response?.data?.error || "Não foi possível carregar esta cobrança.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [publicId, searchParams]);

    useEffect(() => { loadCharge(); }, [loadCharge]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadCharge(false);
    };

    const status = charge?.status;
    const isPaid = status === "PAID";
    const isPending = status === "PENDING" || status === "OPEN";
    const isUnavailable = status === "CANCELLED" || status === "REFUNDED" || status === "FAILED" || status === "REVIEW";

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin text-blue-400" size={36} /></div>;

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#172554,_#020617_55%)] px-5 py-10 text-slate-100 flex items-center justify-center">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-400/20"><ShieldCheck className="text-blue-300" size={28} /></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-300">& Conti Marketing Digital</p>
                    <h1 className="mt-3 text-2xl font-semibold tracking-tight">Pagamento seguro</h1>
                </div>

                {error || !charge ? (
                    <div className="rounded-3xl border border-rose-400/20 bg-slate-900/80 p-8 text-center shadow-2xl">
                        <AlertCircle className="mx-auto text-rose-300" size={42} />
                        <h2 className="mt-5 text-xl font-semibold">Cobrança indisponível</h2>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{error || "Não encontramos esta cobrança."}</p>
                        <button type="button" onClick={handleRefresh} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/15"><RefreshCw size={16} /> Tentar novamente</button>
                    </div>
                ) : (
                    <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 sm:p-8 shadow-2xl shadow-black/30">
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                            <div>
                                <p className="text-xs text-slate-400">Cobrança para</p>
                                <p className="mt-1 font-medium text-white">{charge.client?.name || "Cliente Econti"}</p>
                            </div>
                            <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-200">Econti</span>
                        </div>
                        <div className="py-7 text-center">
                            <p className="text-sm text-slate-400">{charge.description}</p>
                            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">{money(charge.amount)}</p>
                            {charge.dueDate && <p className="mt-3 text-xs text-slate-500">Vencimento: {new Date(charge.dueDate).toLocaleDateString("pt-BR")}</p>}
                        </div>

                        {isPaid ? (
                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center"><CheckCircle2 className="mx-auto text-emerald-300" size={36} /><h2 className="mt-3 font-semibold text-emerald-100">Pagamento confirmado</h2><p className="mt-2 text-sm text-emerald-200/70">Agradecemos pelo pagamento.</p></div>
                        ) : isUnavailable ? (
                            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5 text-center"><XCircle className="mx-auto text-rose-300" size={36} /><h2 className="mt-3 font-semibold text-rose-100">Cobrança indisponível</h2><p className="mt-2 text-sm text-rose-200/70">Entre em contato com a Econti para solicitar uma nova cobrança.</p></div>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-center"><Clock3 className="mx-auto text-amber-300" size={26} /><p className="mt-2 text-sm text-amber-100">{isPending ? "Aguardando pagamento" : "Estamos verificando o pagamento"}</p></div>
                                {charge.checkoutUrl && <a href={charge.checkoutUrl} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-400"><CreditCard size={19} /> Pagar com Mercado Pago</a>}
                                <p className="mt-4 text-center text-xs leading-5 text-slate-500">Você será direcionado para o ambiente seguro do Mercado Pago, onde poderá escolher Pix, cartão ou boleto.</p>
                            </>
                        )}

                        {!isPaid && <button type="button" onClick={handleRefresh} disabled={refreshing} className="mx-auto mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-50">{refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Atualizar status</button>}
                    </div>
                )}
                <p className="mt-6 text-center text-[11px] text-slate-500">Não compartilhe este link publicamente. Em caso de dúvida, fale diretamente com a Econti.</p>
            </div>
        </main>
    );
}

export default function PublicChargePage() {
    return <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-400" size={36} /></div>}><PublicChargeContent /></Suspense>;
}
