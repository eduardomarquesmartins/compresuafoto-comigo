import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: number;
    url: string;
    price: number;
    eventId: string | number;
    eventName: string;
}

interface CartState {
    items: CartItem[];
    isDrawerOpen: boolean;
    appliedCoupon: {
        code: string;
        discountType: string;
        discountValue: number;
        freePhotos: number;
    } | null;
    addItem: (item: CartItem) => void;
    removeItem: (id: number) => void;
    toggleItem: (item: CartItem) => void;
    clearCart: () => void;
    setDrawerOpen: (open: boolean) => void;
    setAppliedCoupon: (coupon: any) => void;
    removeCoupon: () => void;
    getTotal: () => number;
    getItemCount: () => number;
    getSavings: () => {
        rawTotal: number;
        tierSavings: number;
        finalTotal: number;
        couponDiscount: number;
        totalSavings: number;
    };
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isDrawerOpen: false,
            appliedCoupon: null,

            addItem: (item) => set((state) => ({
                items: [...state.items.filter(i => i.id !== item.id), item]
            })),

            removeItem: (id) => set((state) => ({
                items: state.items.filter((i) => i.id !== id)
            })),

            toggleItem: (item) => set((state) => {
                const exists = state.items.some(i => i.id === item.id);
                if (exists) {
                    return { items: state.items.filter(i => i.id !== item.id) };
                }
                return { items: [...state.items, item] };
            }),

            clearCart: () => set({ items: [], appliedCoupon: null }),

            setDrawerOpen: (open) => set({ isDrawerOpen: open }),

            setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),

            removeCoupon: () => set({ appliedCoupon: null }),

            getItemCount: () => get().items.length,

            getTotal: () => {
                const { finalTotal } = get().getSavings();
                return finalTotal;
            },

            getSavings: () => {
                const { items, appliedCoupon } = get();
                const count = items.length;
                const rawTotal = count * 20;
                let tierFinalTotal = rawTotal;

                if (count >= 20) tierFinalTotal = count * 9;
                else if (count >= 10) tierFinalTotal = count * 10;
                else if (count >= 5) tierFinalTotal = count * 15;

                let couponDiscount = 0;
                if (appliedCoupon) {
                    // 1. Percentage/Fixed discount
                    if (appliedCoupon.discountType === 'PERCENTAGE') {
                        couponDiscount = tierFinalTotal * (appliedCoupon.discountValue / 100);
                    } else {
                        couponDiscount = appliedCoupon.discountValue;
                    }

                    // 2. Free photos discount
                    if (appliedCoupon.freePhotos > 0) {
                        const applicableFreePhotos = Math.min(count, appliedCoupon.freePhotos);
                        const pricePerPhoto = count > 0 ? tierFinalTotal / count : 20;
                        couponDiscount += applicableFreePhotos * pricePerPhoto;
                    }
                }

                const finalTotal = Math.max(0, tierFinalTotal - couponDiscount);
                const totalSavings = rawTotal - finalTotal;

                return {
                    rawTotal,
                    tierSavings: rawTotal - tierFinalTotal,
                    couponDiscount,
                    totalSavings,
                    finalTotal
                };
            }
        }),
        {
            name: 'cart-storage',
            partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
        }
    )
);
