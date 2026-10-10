import type { AuthSession, LoginInput } from "@pharmacy/contracts";
import { api } from "../../../shared/api/client";

export const authService = {
  login: (input: LoginInput) => api.post<AuthSession>("/auth/login", input),
  refresh: () => api.post<AuthSession>("/auth/refresh", {}),
  logout: () => api.post<void>("/auth/logout", {}),
};