import { create } from "zustand";

export type AppView = "dashboard" | "sales" | "medicines" | "suppliers" | "users";

type AppStore = {
    activeView: AppView;
    setActiveView: (view: AppView) => void;
};

export const useAppStore = create<AppStore>((set) => ({
    activeView: "dashboard",
    setActiveView: (activeView) => set({ activeView }),
}));