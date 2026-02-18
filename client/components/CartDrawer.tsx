"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import api from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

export default function CartDrawer() {
    const {
        items,
        isDrawerOpen,
        setDrawerOpen,
        removeItem,
        clearCart,
        getSavings,
        appliedCoupon,
        setAppliedCoupon,
        removeCoupon
    } = useCartStore();
    const router = useRouter();
    const pathname = usePathname();
    const [isCheckingOut, setIsCheckingOut] = React.useState(false);
    const [couponCode, setCouponCode] = React.useState("");
    const [isValidatingCoupon, setIsValidatingCoupon] = React.useState(false);

    const { rawTotal, tierSavings, finalTotal, couponDiscount } = getSavings();

    // Reset checkout loading state when page is restored from bfcache (e.g., back from Mercado Pago)
    React.useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) setIsCheckingOut(false);
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const getImageUrl = (path?: string) => {
        if (!path) return "/placeholder.jpg";
        if (path.startsWith("http")) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com';
        return `${baseUrl}${cleanPath}`;
    };

    const handleValidateCoupon = async () => {
        if (!couponCode || isValidatingCoupon) return;
        setIsValidatingCoupon(true);
        try {
            // Get user CPF if logged in, for per-CPF coupon validation
            let cpfParam = '';
            if (typeof window !== 'undefined') {
                try {
                    const userStr = localStorage.getItem('user');
                    if (userStr) {
                        const userData = JSON.parse(userStr);
                        if (userData?.cpf) cpfParam = userData.cpf;
                    }
                } catch (_) { }
            }

            const url = cpfParam
                ? `/coupons/validate/${couponCode}?cpf=${encodeURIComponent(cpfParam)}`
                : `/coupons/validate/${couponCode}`;

            const res = await api.get(url);
            setAppliedCoupon(res.data);
            alert("Cupom aplicado com sucesso!");
            setCouponCode("");
        } catch (error: any) {
            alert(error.response?.data?.error || "Cupom inválido");
            removeCoupon();
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleCheckout = async () => {
        if (items.length === 0 || isCheckingOut) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            setDrawerOpen(false);
            router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
            return;
        }

        setIsCheckingOut(true);
        try {
            const res = await api.post('/orders', {
                photoIds: items.map(i => i.id),
                total: finalTotal,
                couponCode: appliedCoupon?.code,
                eventName: items[0]?.eventName || "Compra Múltipla"
            });

            if (res.data.status === 'PAID') {
                clearCart();
                setDrawerOpen(false);
                router.push('/my-orders');
            } else if (res.data.init_point || res.data.sandbox_init_point) {
                window.location.href = res.data.init_point || res.data.sandbox_init_point;
            } else {
                alert("Erro ao iniciar pagamento.");
                setIsCheckingOut(false);
            }
        } catch (error: any) {
            alert(`Erro ao processar compra: ${error.response?.data?.error || error.message}`);
            setIsCheckingOut(false);
        }
    };

    return (
        <AnimatePresence>
            {isDrawerOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDrawerOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[101] shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-black rounded-lg">
                                    <ShoppingCart className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Meu Carrinho</h2>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{items.length} itens</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <ShoppingCart className="w-16 h-16 text-slate-300" />
                                    <p className="font-bold text-slate-400">Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0">
                                            <img
                                                src={getImageUrl(item.url)}
                                                alt="Foto"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <p className="text-[10px] text-brand font-black uppercase tracking-widest mb-0.5">{item.eventName}</p>
                                                <p className="text-sm font-bold text-slate-900">Foto #{item.id}</p>
                                            </div>
                                            <p className="text-sm font-black text-slate-700">R$ 20,00</p>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="self-center p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-bold">Subtotal</span>
                                        <span className={`${tierSavings > 0 ? 'text-slate-400 line-through' : 'text-slate-900 font-bold'}`}>
                                            R$ {rawTotal.toFixed(2)}
                                        </span>
                                    </div>
                                    {tierSavings > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600 font-bold uppercase tracking-tighter">Desconto Progressivo</span>
                                            <span className="text-green-600 font-black">- R$ {tierSavings.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {appliedCoupon && (
                                        <div className="flex justify-between text-sm animate-in slide-in-from-right-2">
                                            <span className="text-brand font-bold uppercase tracking-tighter flex items-center gap-1">
                                                Cupom: <span className="bg-brand/10 px-1.5 py-0.5 rounded text-[10px]">{appliedCoupon.code}</span>
                                                <button
                                                    onClick={removeCoupon}
                                                    className="ml-1 text-red-500 hover:text-red-700 p-1"
                                                    title="Remover Cupom"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </span>
                                            <span className="text-brand font-black">- R$ {couponDiscount.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Coupon Input */}
                                    {!appliedCoupon && (
                                        <div className="flex gap-2 pt-2">
                                            <input
                                                type="text"
                                                placeholder="CUPOM DE DESCONTO"
                                                value={couponCode}
                                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 focus:border-brand outline-none transition-all uppercase placeholder:text-slate-300"
                                            />
                                            <button
                                                onClick={handleValidateCoupon}
                                                disabled={!couponCode || isValidatingCoupon}
                                                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand disabled:opacity-50 transition-all"
                                            >
                                                {isValidatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end pt-4 border-t border-slate-100 mt-2">
                                        <span className="text-lg font-black uppercase tracking-tighter text-slate-900">Total a pagar</span>
                                        <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter">R$ {finalTotal.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <button
                                        onClick={() => {
                                            if (confirm("Tem certeza que deseja esvaziar seu carrinho?")) {
                                                clearCart();
                                            }
                                        }}
                                        className="py-4 rounded-xl border-2 border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all"
                                    >
                                        Limpar Tudo
                                    </button>
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isCheckingOut}
                                        className="py-4 rounded-xl bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-black/10 hover:bg-brand transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                        Finalizar Compra
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
