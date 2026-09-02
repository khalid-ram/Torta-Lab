// Re-exported under their historical names: existing callers (sign-in,
// sign-up pages) import these from "@/lib/api/auth" specifically.
import { ApiError as AuthApiError, NetworkError as AuthNetworkError, extractMessage, request } from "./client";
export { AuthApiError, AuthNetworkError };

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  phone: string;
  role: "buyer" | "admin";
}

export interface CurrentUser extends AuthUser {
  is_active: boolean;
}

export async function signup(input: {
  name: string;
  username: string;
  phone: string;
  password: string;
}): Promise<AuthUser> {
  const res = await request("/auth/signup", { method: "POST", body: JSON.stringify(input) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AuthApiError(res.status, extractMessage(body));
  return body.user;
}

export async function login(input: { username: string; password: string }): Promise<AuthUser> {
  const res = await request("/auth/login", { method: "POST", body: JSON.stringify(input) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AuthApiError(res.status, extractMessage(body));
  return body.user;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await request("/auth/me", { method: "GET" });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    return body?.user ?? null;
  } catch {
    // Backend unreachable: treat like a guest rather than hanging the
    // auth state in "loading" forever (this call is not user-initiated,
    // so there's no one to show a network error to).
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // Best-effort: the UI should still drop to logged-out locally even
    // if the network call to clear the server-side cookie fails.
  }
}
