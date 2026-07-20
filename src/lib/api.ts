// Typed API client for the Slide AI backend.
//
// All requests go to the backend's /api/v1 base path. In development the
// Vite dev server proxies "/api" to the running backend (see vite.config.ts),
// so no absolute URL or CORS setup is needed locally.
//
// The backend exposes the AI provider only as "Slide AI"; this client never
// references any internal provider implementation.

export const API_BASE = "/api/v1";

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number | null;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface ApiError {
  error: string;
  message: string;
  detail?: unknown;
}

const TOKEN_KEY = "slideai.access_token";
const REFRESH_KEY = "slideai.refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeTokens(tokens: Tokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  detail?: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = (data ?? {}) as ApiError;
    throw new ApiClientError(
      res.status,
      err.error ?? "unknown_error",
      err.message ?? res.statusText,
      err.detail,
    );
  }
  return data as T;
}

export const authApi = {
  signUp(email: string, password: string, fullName?: string) {
    return request<AuthResponse>("POST", "/auth/signup", {
      email,
      password,
      full_name: fullName ?? null,
    });
  },
  signIn(email: string, password: string) {
    return request<AuthResponse>("POST", "/auth/signin", { email, password });
  },
  signOut(refreshToken?: string | null) {
    return request<{ message: string }>("POST", "/auth/signout", {
      refresh_token: refreshToken ?? null,
    });
  },
  me(token: string) {
    return request<User>("GET", "/auth/me", undefined, token);
  },
};

export { request };
