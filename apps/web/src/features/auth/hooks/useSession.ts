import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginInput } from "@pharmacy/contracts";
import { authService } from "../services/authService";
import { useAuthStore } from "../../../shared/store/useAuthStore";

export function useSessionBootstrap() {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const query = useQuery({
    queryKey: ["auth", "bootstrap"],
    queryFn: authService.refresh,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (query.data) setSession(query.data.user, query.data.access_token);
    else if (query.isError) clearSession();
  }, [query.data, query.isError, setSession, clearSession]);

  return query;
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (session) => setSession(session.user, session.access_token),
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}