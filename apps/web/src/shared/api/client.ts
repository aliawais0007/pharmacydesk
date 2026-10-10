import type { AuthSession } from "@pharmacy/contracts";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
let pendingRefresh: Promise<string | null> | null = null;

async function send(path: string, options: RequestInit, accessToken: string | null): Promise<Response> {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
    });
    return response;
}

async function readResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(payload?.detail ?? `Request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}

async function refreshSession(): Promise<string | null> {
    try {
        const response = await send("/auth/refresh", { method: "POST" }, null);
        if (!response.ok) throw new Error("Refresh session failed");
        const session = (await response.json()) as AuthSession;
        useAuthStore.getState().setSession(session.user, session.access_token);
        return session.access_token;
    } catch {
        useAuthStore.getState().clearSession();
        return null;
    }
}

function refreshAccessToken(): Promise<string | null> {
    if (!pendingRefresh) {
        pendingRefresh = refreshSession().finally(() => {
            pendingRefresh = null;
        });
    }
    return pendingRefresh;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
    const { accessToken } = useAuthStore.getState();
    const response = await send(path, options, accessToken);
    if (response.status === 401 && retry && !path.startsWith("/auth/")) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
            const retriedResponse = await send(path, options, refreshedToken);
            if (retriedResponse.status === 401) useAuthStore.getState().clearSession();
            return readResponse<T>(retriedResponse);
        }
    }
    return readResponse<T>(response);
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (path: string) => request<void>(path, { method: "DELETE" }),
};

export { API_BASE_URL };