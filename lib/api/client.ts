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

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Thrown when the request never reached the server at all (backend down,
// wrong API base URL, offline), as opposed to ApiError which means the
// server responded but rejected the request. Kept distinct so the UI can
// tell "can't reach the server" apart from "the server said no".
export class NetworkError extends Error {
  constructor() {
    super("Could not reach the server.");
  }
}

export async function request(path: string, init?: RequestInit): Promise<Response> {
  // A FormData body (file uploads) must NOT get a manual Content-Type:
  // the browser sets multipart/form-data with the correct boundary
  // itself, and overriding it here would break upload parsing.
  const isFormData = init?.body instanceof FormData;
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new NetworkError();
  }
}

export function extractMessage(body: unknown): string {
  const message = (body as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join(" ");
  return message || "Something went wrong.";
}
