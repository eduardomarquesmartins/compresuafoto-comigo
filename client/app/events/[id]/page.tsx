"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, Loader2, Trash2, X } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import DiscountCard from "@/components/DiscountCard";
import Navbar from "@/components/Navbar";
import { useCartStore } from "@/store/useCartStore";

interface Photo {
    id: number;
    watermarkedUrl?: string; // From Event Detail (DB)
    url?: string;            // From Search Results (Mapped)
    price: number;
}

interface Event {
    id: number;
    name: string;
    date: string;
    description?: string;
    coverImage?: string;
    location?: string;
    photos?: Photo[];
}

export default function EventDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [matchedPhotos, setMatchedPhotos] = useState<Photo[] | null>(null);
    const [galleryVisible, setGalleryVisible] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Global Store
    const {
        items: cartItems,
        toggleItem,
        clearCart,
        setDrawerOpen,
        getSavings,
        appliedCoupon,
        setAppliedCoupon,
        removeCoupon
    } = useCartStore();

    const [couponCode, setCouponCode] = useState("");
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    useEffect(() => {
        if (id) fetchEventDetails();
    }, [id]);

    // Reset checkout loading state when page is restored from bfcache (e.g., back from Mercado Pago)
    useEffect(() => {
        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) setIsCheckingOut(false);
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // Restore search results and selection from sessionStorage on mount (e.g., after login redirect)
    useEffect(() => {
        if (!id || typeof window === 'undefined') return;

        const savedMatched = sessionStorage.getItem(`searchResults_${id}`);
        const savedSelected = sessionStorage.getItem(`selectedPhotos_${id}`);

        if (savedMatched) {
            try {
                const photos = JSON.parse(savedMatched);
                setMatchedPhotos(photos);
                console.log("[RESTORE] Restored matched photos from session");
            } catch (e) {
                console.error("Error parsing saved search results", e);
            }
        }
    }, [id]);

    const fetchEventDetails = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data);
        } catch (error) {
            console.error("Erro ao buscar detalhes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setSearching(true);
        const formData = new FormData();
        formData.append("selfie", e.target.files[0]);
        formData.append("eventId", id as string);

        try {
            const res = await api.post('/photos/search', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setMatchedPhotos(res.data);
            setGalleryVisible(true);

            // Save search results to persist across login redirect
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(`searchResults_${id}`, JSON.stringify(res.data));
            }
        } catch (error) {
            console.error("Erro no reconhecimento:", error);
            alert("Não foi possível processar sua selfie. Tente novamente.");
        } finally {
            setSearching(false);
        }
    };

    const getImageUrl = (path?: string) => {
        if (!path) return "/placeholder.jpg";
        if (path.startsWith("http")) return path;
        // Ensure we don't double slash if path already has it, or miss it if not
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://compresuafoto-comigo.onrender.com';
        return `${baseUrl}${cleanPath}`;
    };

    const getPhotoUrl = (photo: Photo) => {
        return photo.url || photo.watermarkedUrl;
    };

    // Pricing Logic (Cumulative Progressive)
    const calculateTotal = (count: number) => {
        if (count === 0) return 0;

        // Novos patamares baseados no card promocional:
        if (count >= 20) return count * 9;   // R$ 180 por 20 (R$ 9 cada)
        if (count >= 10) return count * 10;  // R$ 100 por 10 (R$ 10 cada)
        if (count >= 5) return count * 15;   // R$ 75 por 5 (R$ 15 cada)

        return count * 20; // R$ 20 unitário para menos de 5 fotos
    };

    // Auto-save search results to sessionStorage
    useEffect(() => {
        if (!id || typeof window === 'undefined') return;
        if (matchedPhotos) {
            sessionStorage.setItem(`searchResults_${id}`, JSON.stringify(matchedPhotos));
        }
    }, [id, matchedPhotos]);

    const handleValidateCoupon = async () => {
        if (!couponCode || isValidatingCoupon) return;
        setIsValidatingCoupon(true);
        try {
            const res = await api.get(`/coupons/validate/${couponCode}`);
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

    const handleRemoveCoupon = () => {
        removeCoupon();
        setCouponCode("");
    };

    const toggleSelection = (photo: Photo) => {
        toggleItem({
            id: photo.id,
            url: getPhotoUrl(photo) || "",
            price: 20,
            eventId: id as string,
            eventName: event?.name || "Evento"
        });
    };

    const pathname = usePathname();

    const handleCheckout = async () => {
        if (cartItems.length === 0 || isCheckingOut) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            router.push(`/login?redirectTo=${encodeURIComponent(pathname)}`);
            return;
        }

        setIsCheckingOut(true);
        const { finalTotal } = getSavings();

        try {
            const res = await api.post('/orders', {
                photoIds: cartItems.map(i => i.id),
                total: finalTotal,
                couponCode: appliedCoupon?.code,
                eventName: event?.name
            });

            if (res.data.status === 'PAID') {
                clearCart();
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

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand animate-spin" />
            </div>
        );
    }

    if (!event) return <div className="text-white text-center pt-20">Evento não encontrado.</div>;

    const displayPhotos = matchedPhotos || event.photos || [];
    const { rawTotal, tierSavings, totalSavings, finalTotal, couponDiscount } = getSavings();
    const currentPricePerPhoto = cartItems.length > 0 ? (finalTotal / cartItems.length) : 20;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-32">
            <Navbar />

            {/* Header Image */}
            <div className="relative h-[55vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-background z-10" />
                <img
                    src={getImageUrl(event.coverImage)}
                    alt={event.name}
                    className="w-full h-full object-cover"
                />

                <div className="absolute bottom-0 left-0 w-full p-6 pb-20 md:pb-12 z-20">
                    <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-1 text-white drop-shadow-xl">{event.name}</h1>
                </div>
            </div>

            {/* Pricing / Discount Card */}
            <DiscountCard />

            {/* Photos Grid */}
            <div className="container mx-auto px-6 relative z-30 mt-8">

                {/* Selfie Search Option */}
                <div className="flex flex-col items-center justify-center pb-12 text-center space-y-4">
                    <div className="max-w-md flex flex-col items-center">
                        <h3 className="text-xl font-medium mb-2 text-foreground italic opacity-90">Quer encontrar suas fotos mais rápido?</h3>

                        {/* Selfie Trigger */}
                        <div className="relative group w-auto mt-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSelfieUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                disabled={searching}
                            />
                            <button className="bg-slate-900 border border-slate-700 hover:border-brand text-white w-auto px-8 py-2 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 group">
                                {searching ? <Loader2 className="w-4 h-4 animate-spin text-brand" /> : <Camera className="w-4 h-4 text-brand" />}
                                {searching ? "Procurando..." : "Subir Selfie para Filtrar"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results/Gallery State */}
                <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-light">
                                {matchedPhotos ? 'Fotos encontradas' : 'Galeria do Evento'} <span className="text-brand">({displayPhotos.length})</span>
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Toque nas fotos para selecionar as que deseja comprar.
                            </p>
                        </div>
                        {matchedPhotos && (
                            <button
                                onClick={() => {
                                    setMatchedPhotos(null);
                                    clearCart(); // Optional: or just show all
                                }}
                                className="text-sm text-brand hover:text-white transition-colors flex items-center gap-1"
                            >
                                <ArrowLeft size={14} />
                                Ver Todas as Fotos
                            </button>
                        )}
                    </div>

                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                        {displayPhotos.map((photo) => {
                            const isSelected = cartItems.some(item => item.id === photo.id);
                            return (
                                <motion.div
                                    key={photo.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative group break-inside-avoid"
                                    onClick={() => toggleSelection(photo)}
                                >
                                    <div className={`rounded-2xl overflow-hidden bg-white border relative transition-all cursor-pointer shadow-sm ${isSelected ? 'border-brand ring-4 ring-brand/20' : 'border-black/5 hover:border-brand/30 hover:shadow-md'}`}>
                                        <img
                                            src={getImageUrl(getPhotoUrl(photo))}
                                            alt={`Photo ${photo.id}`}
                                            className="w-full h-auto object-contain"
                                        />
                                        {/* Selection Overlay */}
                                        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-brand border-brand' : 'border-white'}`}>
                                                {isSelected && <span className="text-white font-bold">✓</span>}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {displayPhotos.length === 0 && (
                        <div className="text-center py-20 text-gray-500 font-light">
                            Nenhuma foto encontrada com seu rosto. Tente uma selfie diferente.
                        </div>
                    )}
                </div>
            </div>

            {/* Cart Bottom Bar */}
            {cartItems.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:bottom-8 md:left-auto md:right-8 md:w-[450px] bg-white rounded-3xl p-6 z-50 animate-in slide-in-from-bottom-full duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-100">

                    {/* Close Button */}
                    <button
                        onClick={() => {
                            if (confirm("Deseja limpar todo o carrinho?")) {
                                clearCart();
                            }
                        }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110 z-[60]"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col gap-6">

                        {/* Header: Photo Count & Unit Price */}
                        <div className="flex items-start justify-between">
                            <div className="flex flex-col">
                                <p className="text-slate-900 text-2xl font-black uppercase tracking-tighter">
                                    {cartItems.length} {cartItems.length === 1 ? 'Foto' : 'Fotos'}
                                </p>
                                <button
                                    onClick={() => setDrawerOpen(true)}
                                    className="text-sm text-brand font-black uppercase tracking-widest hover:underline text-left mt-1"
                                >
                                    Ver Carrinho
                                </button>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Unitário: <span className="text-slate-900 font-black ml-1">R$ {currentPricePerPhoto.toFixed(2)}</span>
                                </span>
                            </div>
                        </div>

                        {/* Coupon Section */}
                        {!appliedCoupon ? (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="TEM UM CUPOM?"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 focus:border-brand outline-none transition-all uppercase placeholder:text-slate-300"
                                />
                                <button
                                    onClick={handleValidateCoupon}
                                    disabled={!couponCode || isValidatingCoupon}
                                    className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand disabled:opacity-50 transition-all"
                                >
                                    {isValidatingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-brand/5 border border-brand/10 p-3 rounded-2xl animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-brand text-white text-[10px] font-black px-2 py-0.5 rounded">
                                        {appliedCoupon.code}
                                    </div>
                                    <span className="text-xs font-bold text-brand uppercase tracking-tight">Cupom Aplicado</span>
                                </div>
                                <button
                                    onClick={handleRemoveCoupon}
                                    className="p-1 hover:bg-brand/10 rounded-full transition-colors text-brand"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Divider */}
                        <div className="h-px bg-slate-100 w-full" />

                        {/* Bottom: Total & CTA */}
                        <div className="flex items-end justify-between gap-4">
                            <div className="flex flex-col items-start gap-1">
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em]">Total a Pagar</p>

                                {totalSavings > 0 && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-slate-500/60 line-through font-semibold italic">R$ {rawTotal.toFixed(2)}</span>
                                        <div className="bg-[#00D05E] text-black px-2 py-1 rounded-md font-black text-[10px] uppercase flex flex-col items-center leading-none">
                                            <span>-{((totalSavings / rawTotal) * 100).toFixed(0)}%</span>
                                            <span className="text-[8px] opacity-80">OFF</span>
                                        </div>
                                    </div>
                                )}

                                <p className="text-4xl md:text-5xl font-black text-slate-900 leading-none tabular-nums tracking-tighter mt-1">
                                    R$ {finalTotal.toFixed(2)}
                                </p>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={isCheckingOut}
                                className={`flex-1 flex flex-col items-center justify-center bg-black text-white px-6 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(0,0,0,0.15)] max-h-24 ${isCheckingOut ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] hover:bg-brand active:scale-95'}`}
                            >
                                {isCheckingOut ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span className="text-xs leading-none">Finalizar</span>
                                        <span className="text-sm leading-none mt-1">Compra</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
