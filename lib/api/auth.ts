const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

if (typeof window !== "undefined" && !API_BASE_URL) {
  // Without this, every request silently falls back to a same-origin
  // path (e.g. the Next.js server itself), which 404s with no useful
  // signal anywhere in the UI. Fail loudly in the console instead.
  console.error(
    "NEXT_PUBLIC_API_BASE_URL is not set. Create a .env.local with " +
      "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 and restart the dev server.",
  );
}

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

// Thrown when the request never reached the server at all (backend down,
// wrong API base URL, offline), as opposed to AuthApiError which means the
// server responded but rejected the request. Kept distinct so the UI can
// tell "can't reach the server" apart from "the server said no".
export class AuthNetworkError extends Error {
  constructor() {
    super("Could not reach the server.");
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new AuthNetworkError();
  }
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
