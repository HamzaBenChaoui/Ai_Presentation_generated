// Typed API client for the Slide AI backend.
//
// All requests go to the backend's /api/v1 base path. In development the
// Vite dev server proxies "/api" to the running backend (see vite.config.ts),
// so no absolute URL or CORS setup is needed locally.
//
// The backend exposes the AI provider only as "Slide AI"; this client never
// references any internal provider implementation.

export const API_BASE = "/api/v1";

import type { Presentation, PresentationList, FileAsset, FileList, Slide, PresentationSpec } from "./../types";

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
  // Attach the stored access token automatically unless one is passed in.
  const authToken = token ?? getAccessToken();
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

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

export const presentationsApi = {
  list() {
    return request<PresentationList>("GET", "/presentations");
  },
  get(id: string) {
    return request<Presentation>("GET", `/presentations/${id}`);
  },
  create(title: string, description?: string | null, theme?: string | null) {
    return request<Presentation>("POST", "/presentations", {
      title,
      description: description ?? null,
      theme: theme ?? null,
    });
  },
  rename(id: string, title: string) {
    return request<Presentation>("PATCH", `/presentations/${id}`, { title });
  },
  duplicate(id: string) {
    return request<Presentation>("POST", `/presentations/${id}/duplicate`);
  },
  remove(id: string) {
    return request<void>("DELETE", `/presentations/${id}`);
  },
};

export interface GenerateRequest {
  prompt: string;
  slide_count: number;
  tone: string;
  language: string;
  theme: string | null;
}

export const generationApi = {
  generate(req: GenerateRequest) {
    return request<Presentation>("POST", "/presentations/generate", req);
  },
  slides(id: string) {
    return request<Slide[]>("GET", `/presentations/${id}/slides`);
  },
};

export const specApi = {
  get(id: string) {
    return request<PresentationSpec>("GET", `/presentations/${id}/spec`);
  },
  update(id: string, spec: PresentationSpec) {
    return request<PresentationSpec>("PUT", `/presentations/${id}/spec`, spec);
  },
};

export type ExportFormat = "html" | "pdf" | "pptx";

// Exports a presentation to a downloadable file. The backend streams the
// bytes with a Content-Disposition header; we turn the blob into a download.
export const exportApi = {
  async download(id: string, format: ExportFormat): Promise<void> {
    const authToken = getAccessToken();
    const headers: Record<string, string> = {};
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/presentations/${id}/export?format=${format}`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      throw new ApiClientError(res.status, "export_error", `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match?.[1] || `presentation.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
  const authToken = getAccessToken();
  const headers: Record<string, string> = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
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

export const filesApi = {
  list() {
    return request<FileList>("GET", "/files");
  },
  upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return uploadRequest<FileAsset>("/files", form);
  },
  remove(id: string) {
    return request<void>("DELETE", `/files/${id}`);
  },
};
