"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ArrowLeft, ArrowRight, Loader2, Trash2, X, LockKeyhole, Maximize2 } from "lucide-react";
import api from "@/lib/api";
import Link from "next/link";
import DiscountCard from "@/components/DiscountCard";
import Navbar from "@/components/Navbar";
import { useCartStore } from "@/store/useCartStore";
import PhotoSkeleton from "@/components/PhotoSkeleton";
import PhotoGridItem from "@/components/PhotoGridItem";
import { getPublicAppUrl } from "@/lib/publicAppUrl";
import { usePublicAppPath } from "@/lib/publicAppPath";

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
    const appPath = usePublicAppPath();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [matchedPhotos, setMatchedPhotos] = useState<Photo[] | null>(null);
    const [galleryVisible, setGalleryVisible] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

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
    const [visibleCount, setVisibleCount] = useState(12);
    const resultsKey = `searchResults_${id}`;
    const restoreKey = `restoreSearchResults_${id}`;

    const displayPhotos = matchedPhotos || event?.photos || [];
    const visiblePhotos = displayPhotos.slice(0, visibleCount);

    const { rawTotal, tierSavings, totalSavings, finalTotal, couponDiscount } = getSavings();
    const currentPricePerPhoto = cartItems.length > 0 ? (finalTotal / cartItems.length) : 20;

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + 12, displayPhotos.length));
    };

    // Auto-load more when reaching bottom
    useEffect(() => {
        const handleScroll = () => {
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                loadMore();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [displayPhotos.length]);

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

    useEffect(() => {
        if (!previewPhoto) return;

        const closePreviewOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPreviewPhoto(null);
        };

        window.addEventListener('keydown', closePreviewOnEscape);
        return () => window.removeEventListener('keydown', closePreviewOnEscape);
    }, [previewPhoto]);

    // Restore search results and selection from sessionStorage on mount (e.g., after login redirect)
    useEffect(() => {
        if (!id || typeof window === 'undefined') return;

        const shouldRestore = sessionStorage.getItem(restoreKey) === "true";
        if (!shouldRestore) return;

        const savedMatched = sessionStorage.getItem(resultsKey);
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
        sessionStorage.removeItem(restoreKey);
    }, [id, resultsKey, restoreKey]);

    const fetchEventDetails = async () => {
        try {
            const res = await api.get(`/events/${id}`);
            setEvent(res.data);
        } catch (error: any) {
            if (error.response?.status === 403) {
                setAccessError(error.response?.data?.error || 'Esta galeria é privada.');
            } else {
                console.error("Erro ao buscar detalhes:", error);
            }
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
                sessionStorage.setItem(resultsKey, JSON.stringify(res.data));
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
        const baseUrl = getPublicAppUrl();
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
            sessionStorage.setItem(resultsKey, JSON.stringify(matchedPhotos));
        }
    }, [id, matchedPhotos, resultsKey]);

    const persistSearchForRedirect = () => {
        if (typeof window === 'undefined' || !matchedPhotos) return;
        sessionStorage.setItem(resultsKey, JSON.stringify(matchedPhotos));
        sessionStorage.setItem(restoreKey, "true");
    };

    const handleValidateCoupon = async () => {
        if (!couponCode || isValidatingCoupon) return;
        setIsValidatingCoupon(true);
        try {
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
            persistSearchForRedirect();
            router.push(appPath(`login?redirectTo=${encodeURIComponent(pathname)}`));
            return;
        }

        // Check if user has completed their profile (CPF required)
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        if (userData) {
            const user = JSON.parse(userData);
            if (!user.cpf || !user.cpf.trim()) {
                persistSearchForRedirect();
                alert('Para finalizar sua compra, complete seu cadastro com o CPF.');
                router.push(appPath(`profile?incomplete=true&redirectTo=${encodeURIComponent(pathname)}`));
                return;
            }
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
                router.push(appPath('my-orders'));
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

    if (accessError) {
        return (
            <>
                <Navbar />
                <main className="flex min-h-screen items-center justify-center bg-background px-6 pb-24 pt-32 text-center">
                    <div className="max-w-md rounded-[2rem] border border-brand/20 bg-white p-10 shadow-xl">
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                            <LockKeyhole size={30} />
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900">Galeria privada</h1>
                        <p className="mt-3 leading-relaxed text-slate-600">{accessError}</p>
                        <Link href={appPath(`login?redirectTo=${encodeURIComponent(pathname)}`)} className="mt-7 inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand">
                            Entrar com a conta autorizada
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    if (!event && !loading) return <div className="text-slate-500 text-center pt-20">Evento não encontrado.</div>;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-brand selection:text-white pb-32">

            {/* Unified Global Preloader Overlay - Only show for initial event load or search, not image preloading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        <div className="bg-white/50 p-12 rounded-[3.5rem] border border-black/5 shadow-2xl flex flex-col items-center max-w-sm w-full">
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    opacity: [0.5, 1, 0.5]
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="mb-8"
                            >
                                <Loader2 className="w-16 h-16 text-brand animate-spin" />
                            </motion.div>

                            <h2 className="text-2xl font-light text-slate-900 mb-2 tracking-tight">
                                Carregando evento...
                            </h2>
                            <p className="text-slate-500 text-sm mb-8 font-light italic">
                                Buscando informações do evento...
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Navbar />

            {event && (
                <>
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

                    <DiscountCard />

                    {/* Photos Grid */}
                    <div className="container mx-auto px-6 relative z-30 mt-8">

                        {/* Selfie Search Option */}
                        <div className="mb-12">
                            <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-white/90 p-6 md:p-8 shadow-xl shadow-blue-500/5 backdrop-blur-md dark:bg-slate-900/90 dark:border-blue-500/30">
                                {/* Efeitos de iluminação azul no fundo */}
                                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
                                <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-400/15 blur-3xl pointer-events-none" />

                                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                                    {/* Lado esquerdo: Ícone com Glow + Textos */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5">
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                                            <Camera className="h-8 w-8" />
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                                Quer encontrar suas fotos em segundos?
                                            </h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Envie uma selfie e nossa IA localiza todas as fotos onde você aparece.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Lado direito: Botão de Ação com Input File invisível */}
                                    <div className="relative shrink-0 group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSelfieUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                            disabled={searching}
                                        />
                                        <button 
                                            disabled={searching}
                                            className="group relative inline-flex items-center justify-center gap-3 rounded-full bg-slate-900 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:scale-105 hover:bg-slate-800 hover:shadow-2xl active:scale-95 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {searching ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-blue-400 dark:text-white" />
                                            ) : (
                                                <Camera className="h-5 w-5 text-blue-400 transition-transform group-hover:rotate-12 dark:text-white" />
                                            )}
                                            <span>{searching ? "Procurando..." : "Subir Selfie para Filtrar"}</span>
                                            {!searching && (
                                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 opacity-70" />
                                            )}
                                        </button>
                                    </div>
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

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[400px]">
                                {searching || loading ? (
                                    // Show skeletons while searching or initial loading
                                    Array.from({ length: 12 }).map((_, i) => (
                                        <div
                                            key={`skeleton-${i}`}
                                        >
                                            <PhotoSkeleton />
                                        </div>
                                    ))
                                ) : (
                                    visiblePhotos.map((photo) => {
                                        const isSelected = cartItems.some(item => item.id === photo.id);
                                        return (
                                            <PhotoGridItem
                                                key={photo.id}
                                                photo={photo}
                                                isSelected={isSelected}
                                                onToggle={toggleSelection}
                                                onPreview={setPreviewPhoto}
                                                getImageUrl={getImageUrl}
                                                getPhotoUrl={getPhotoUrl}
                                            />
                                        );
                                    })
                                )}
                            </div>

                            {visibleCount < displayPhotos.length && (
                                <div className="flex justify-center mt-12">
                                    <button
                                        onClick={loadMore}
                                        className="bg-slate-900 border border-slate-700 hover:border-brand text-white px-8 py-3 rounded-full font-medium text-sm transition-all"
                                    >
                                        Ver Mais Fotos
                                    </button>
                                </div>
                            )}

                            {!searching && displayPhotos.length > 0 && visibleCount >= displayPhotos.length && (
                                <div className="text-center py-12 text-gray-500 font-light text-sm italic">
                                    Você chegou ao fim da galeria.
                                </div>
                            )}

                            {!searching && displayPhotos.length === 0 && (
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
                                                {appliedCoupon?.code}
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

                    <AnimatePresence>
                        {previewPhoto && getPhotoUrl(previewPhoto) && (
                            <motion.div
                                role="dialog"
                                aria-modal="true"
                                aria-label="Prévia ampliada da foto"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setPreviewPhoto(null)}
                                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm md:p-8"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: 18 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={(event) => event.stopPropagation()}
                                    className="relative flex h-full w-full max-w-6xl items-center justify-center"
                                >
                                    <div className="relative max-h-[84vh] max-w-full overflow-hidden rounded-2xl shadow-2xl">
                                        <img
                                            src={getImageUrl(getPhotoUrl(previewPhoto))}
                                            alt={`Prévia ampliada da foto ${previewPhoto.id}`}
                                            className="block max-h-[84vh] max-w-full object-contain"
                                        />
                                        <div
                                            aria-hidden="true"
                                            className="pointer-events-none absolute inset-0 overflow-hidden"
                                        >
                                            <div className="absolute inset-x-[-18%] top-1/2 -translate-y-1/2 -rotate-[18deg] border-y border-white/45 bg-slate-950/75 py-3 text-center text-xs font-bold tracking-[0.28em] text-white shadow-lg sm:py-4 sm:text-sm">
                                                PRÉVIA — USO NÃO AUTORIZADO
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute left-0 right-0 top-0 flex items-center justify-between gap-4 text-white">
                                        <span className="inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium backdrop-blur">
                                            <Maximize2 size={16} /> Prévia ampliada
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewPhoto(null)}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-brand focus:outline-none focus:ring-2 focus:ring-white"
                                            aria-label="Fechar prévia"
                                        >
                                            <X size={22} />
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
