import { create } from "zustand";
import type { Medicine } from "@pharmacy/contracts";

export type SaleCartItem = {
    medicine: Medicine;
    quantity: number;
};

type SaleCartStore = {
    items: SaleCartItem[];
    add: (medicine: Medicine) => void;
    setQuantity: (medicineId: number, quantity: number) => void;
    remove: (medicineId: number) => void;
    clear: () => void;
};

export const useSaleCartStore = create<SaleCartStore>((set) => ({
    items: [],
    add: (medicine) => set((state) => {
        const existing = state.items.find((item) => item.medicine.id === medicine.id);
        if (!existing) return { items: [...state.items, { medicine, quantity: 1 }] };
        return {
            items: state.items.map((item) => item.medicine.id === medicine.id
                ? { ...item, medicine, quantity: Math.min(item.quantity + 1, medicine.available_stock) }
                : item),
        };
    }),
    setQuantity: (medicineId, quantity) => set((state) => ({
        items: state.items.map((item) => item.medicine.id === medicineId
            ? { ...item, quantity: Math.min(Math.max(1, quantity), item.medicine.available_stock) }
            : item),
    })),
    remove: (medicineId) => set((state) => ({
        items: state.items.filter((item) => item.medicine.id !== medicineId),
    })),
    clear: () => set({ items: [] }),
}));