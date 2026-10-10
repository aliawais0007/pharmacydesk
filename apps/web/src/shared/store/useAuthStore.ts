import { create } from "zustand";
import type { User } from "@pharmacy/contracts";

type AuthStatus = "booting" | "anonymous" | "authenticated";

type AuthStore = {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  setSession: (user: User, accessToken: string) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  status: "booting",
  user: null,
  accessToken: null,
  setSession: (user, accessToken) => set({ status: "authenticated", user, accessToken }),
  clearSession: () => set({ status: "anonymous", user: null, accessToken: null }),
}));