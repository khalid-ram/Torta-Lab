const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

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

export class AuthApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
}

function extractMessage(body: unknown): string {
  const message = (body as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message || "Something went wrong.";
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
  const res = await request("/auth/me", { method: "GET" });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.user ?? null;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}
