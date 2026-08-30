// Typed API client for the Slide AI backend.
//
// All requests go to the backend's /api/v1 base path. In development the
// Vite dev server proxies "/api" to the running backend (see vite.config.ts),
// so no absolute URL or CORS setup is needed locally.
//
// The backend exposes the AI provider only as "Slide AI"; this client never
// references any internal provider implementation.

export const API_BASE = "/api/v1";

import type { Presentation, PresentationList, FileAsset, FileList, PresentationSpec, ChatListResponse, SlideSpec } from "./../types";

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
  localStorage.setItem(
    "slideai.token_expires_at",
    String(Date.now() + (tokens.expires_in ?? 3600) * 1000),
  );
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

let refreshingPromise: Promise<boolean> | null = null;

/** Silent session refresh using the stored refresh token. */
async function tryRefreshSession(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    let refreshToken: string | null = null;
    try {
      refreshToken = localStorage.getItem(REFRESH_KEY);
    } catch {
      refreshToken = null;
    }
    if (!refreshToken) return false;
    try {
      const res = await authApi.refresh(refreshToken);
      if (!res.access_token || !res.refresh_token) return false;
      storeTokens({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        token_type: "bearer",
        expires_in: res.expires_in ?? null,
      });
      return true;
    } catch {
      return false;
    }
  })();
  const ok = await refreshingPromise;
  refreshingPromise = null;
  return ok;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null,
  _retried = false,
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
    // Silent refresh once on 401 for non-auth endpoints, then retry.
    if (res.status === 401 && !_retried && !path.startsWith("/auth/")) {
      if (await tryRefreshSession()) {
        return request<T>(method, path, body, token, true);
      }
    }
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
  /** Rotate a Supabase refresh token into a fresh session. */
  refresh(refreshToken: string) {
    return request<{ access_token: string; refresh_token: string; expires_in: number | null }>(
      "POST",
      "/auth/refresh",
      { refresh_token: refreshToken },
    );
  },
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
  updateDisplayName(fullName: string) {
    return request<User>("PATCH", "/auth/me", { full_name: fullName });
  },
  /** Mint a personal 30-day access token for MCP clients. */
  mcpToken() {
    return request<{ access_token: string; token_type: string; expires_in: number; purpose: string }>(
      "POST",
      "/auth/mcp-token",
    );
  },
};

export { request };

export const presentationsApi = {
  list() {
    return request<PresentationList>("GET", "/presentations");
  },
  /** Full-deck search: title, description AND slide content. */
  search(q: string) {
    return request<PresentationList>("GET", `/presentations/search?q=${encodeURIComponent(q)}`);
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
  template_name?: string | null;
  // Model selected on the settings page. Undefined/null → backend default.
  model?: string | null;
}

export const generationApi = {
  generate(req: GenerateRequest) {
    return request<Presentation>("POST", "/presentations/generate", req);
  },
};

// --- Model catalog ---------------------------------------------------------

export interface ModelInfo {
  id: string;
  owned_by?: string;
}

export interface ModelsResponse {
  provider: string;
  default: string;
  models: ModelInfo[];
}

export const modelsApi = {
  list() {
    return request<ModelsResponse>("GET", "/models");
  },
};

export interface LibrarySlide {
  id: string;
  title: string;
  slide: SlideSpec;
  created_at: string;
}

export const slideLibraryApi = {
  list() {
    return request<{ slides: LibrarySlide[] }>("GET", "/slide-library");
  },
  save(title: string, slide: SlideSpec) {
    return request<LibrarySlide>("POST", "/slide-library", { title, slide });
  },
  remove(id: string) {
    return request<void>("DELETE", `/slide-library/${id}`);
  },
};

export interface BrandKit {
  logo_url?: string | null
  color_primary?: string | null
  color_secondary?: string | null
  font_heading?: string | null
  font_body?: string | null
  updated_at?: string | null
}

export const brandKitApi = {
  get() {
    return request<BrandKit>("GET", "/brand-kit");
  },
  upsert(patch: Partial<BrandKit>) {
    return request<BrandKit>("PUT", "/brand-kit", patch);
  },
};

export interface ImportRequest {
  source: "markdown" | "url";
  content?: string | null;
  url?: string | null;
  slide_count?: number | null;
  language?: string;
  theme?: string | null;
  model?: string | null;
}

export const importApi = {
  run(req: ImportRequest) {
    return request<Presentation>("POST", "/presentations/import", req);
  },
};

export const specApi = {
  get(id: string) {
    return request<PresentationSpec>("GET", `/presentations/${id}/spec`);
  },
  /**
   * Persist the spec with optimistic locking. Pass the updated_at the spec
   * was loaded with — the backend answers 409 if the deck changed since.
   * The fresh updated_at comes back in the X-Updated-At header.
   */
  async update(id: string, spec: PresentationSpec, expectedUpdatedAt?: string | null): Promise<{ spec: PresentationSpec; updatedAt: string | null }> {
    const authToken = getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const qs = expectedUpdatedAt
      ? `?expected_updated_at=${encodeURIComponent(expectedUpdatedAt)}`
      : "";
    const res = await fetch(`${API_BASE}/presentations/${id}/spec${qs}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(spec),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = (data ?? {}) as ApiError;
      throw new ApiClientError(res.status, err.error ?? "unknown_error", err.message ?? res.statusText, err.detail);
    }
    return { spec: data as PresentationSpec, updatedAt: res.headers.get("X-Updated-At") };
  },
};

export interface SpecEditResponse {
  spec: PresentationSpec;
  summary: string;
  changed_indexes: number[];
}

export interface SpecEditRequest {
  instruction: string;
  target_indexes?: number[];
  // Model selected on the settings page. Undefined/null → backend default.
  model?: string | null;
}

export const aiEditApi = {
  run(id: string, req: SpecEditRequest) {
    return request<SpecEditResponse>("POST", `/presentations/${id}/edit`, req);
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

export interface FileUrlResponse {
  url: string;
  expires_in: number;
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
  url(id: string) {
    return request<FileUrlResponse>("GET", `/files/${id}/url`);
  },
};

export interface AssetItem {
  id: string;
  kind: string;
  url: string;
  thumbnail: string | null;
  attribution: string | null;
  provider: string;
}

export interface AssetSearchResult {
  items: AssetItem[];
  total: number;
}

export type AssetKind = "image" | "icon" | "svg";

export const assetsApi = {
  search(q: string = "", kind: AssetKind = "image", limit: number = 12) {
    return request<AssetSearchResult>("GET", `/assets/search?q=${encodeURIComponent(q)}&kind=${kind}&limit=${limit}`);
  },
};

export interface TemplateSlideHint {
  layout: string;
  purpose: string;
  element_hints: string[];
}

export interface TemplateInfo {
  name: string;
  description: string;
  slides: TemplateSlideHint[];
}

export const templatesApi = {
  list() {
    return request<{ templates: TemplateInfo[] }>("GET", "/templates");
  },
  suggest(q: string) {
    return request<{ template: TemplateInfo }>("GET", `/templates/suggest?q=${encodeURIComponent(q)}`);
  },
};

export interface VersionInfo {
  id: string;
  presentation_id: string;
  version_note: string | null;
  slide_count: number;
  created_at: string;
}

export const versionsApi = {
  list(presentationId: string) {
    return request<{ versions: VersionInfo[]; total: number }>("GET", `/presentations/${presentationId}/versions`);
  },
  get(presentationId: string, versionId: string) {
    return request<VersionInfo>("GET", `/presentations/${presentationId}/versions/${versionId}`);
  },
  restore(presentationId: string, versionId: string) {
    return request<PresentationSpec>("POST", `/presentations/${presentationId}/versions/${versionId}/restore`);
  },
};

export interface ShareComment {
  id?: string;
  author_name?: string | null;
  content: string;
  created_at?: string;
}

export interface ShareInfo {
  id: string;
  token: string;
  visibility: string;
  permission: string;
  embed_allowed: boolean;
  expires_at: string | null;
  created_at: string;
  view_count?: number;
  comments?: ShareComment[];
  /** Seconds spent per slide by shared-deck viewers: {"0": 12, "1": 8} */
  slide_time_json?: Record<string, number> | null;
}

export interface CreateShareRequest {
  visibility?: string;
  password?: string;
  expires_at?: string;
  permission?: string;
  embed_allowed?: boolean;
}

export const sharesApi = {
  create(presentationId: string, req: CreateShareRequest) {
    return request<ShareInfo>("POST", `/presentations/${presentationId}/shares`, req);
  },
  list(presentationId: string) {
    return request<{ shares: ShareInfo[] }>("GET", `/presentations/${presentationId}/shares`);
  },
  remove(token: string) {
    return request<void>("DELETE", `/shares/${token}`);
  },
};

export interface SharedPresentation {
  spec: PresentationSpec;
  title: string;
  comments?: ShareComment[];
}

export const publicSharesApi = {
  get(token: string, password?: string) {
    const qs = password ? `?password=${encodeURIComponent(password)}` : "";
    return request<SharedPresentation>("GET", `/shared/${token}${qs}`);
  },
  /** Leave a reviewer comment on a shared deck (no auth required). */
  postComment(token: string, content: string, authorName?: string) {
    return request<ShareComment>("POST", `/shared/${token}/comments`, {
      content,
      author_name: authorName || null,
    });
  },
  /** Fire-and-forget time-per-slide analytics from a shared-deck viewer. */
  postSlideTime(token: string, timeJson: Record<string, number>) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    return fetch(`${API_BASE}/shared/${token}/analytics`, {
      method: "POST",
      headers,
      body: JSON.stringify({ time_json: timeJson }),
      keepalive: true,
    });
  },
};

export interface WorkspaceInfo {
  id: string;
  name: string;
  created_at: string;
  role?: string;
}

export interface WorkspaceMemberInfo {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  display_name?: string;
  email?: string;
}

export interface UserSearchResult {
  user_id: string;
  display_name: string;
  email: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  target: string | null;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export interface PendingInvitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  created_at: string;
}

export const workspacesApi = {
  list() {
    return request<{ workspaces: WorkspaceInfo[] }>("GET", "/workspaces");
  },
  create(name: string) {
    return request<WorkspaceInfo>("POST", "/workspaces", { name });
  },
  delete(workspaceId: string) {
    return request<void>("DELETE", `/workspaces/${workspaceId}`);
  },
  members(workspaceId: string) {
    return request<{ members: WorkspaceMemberInfo[] }>("GET", `/workspaces/${workspaceId}/members`);
  },
  inviteMember(workspaceId: string, email: string, role: string) {
    return request<WorkspaceInvitation>("POST", `/workspaces/${workspaceId}/invitations`, { email, role });
  },
  workspaceInvitations(workspaceId: string) {
    return request<{ invitations: WorkspaceInvitation[] }>("GET", `/workspaces/${workspaceId}/invitations`);
  },
  cancelInvitation(workspaceId: string, invitationId: string) {
    return request<void>("DELETE", `/workspaces/${workspaceId}/invitations/${invitationId}`);
  },
  pendingInvitations() {
    return request<{ invitations: PendingInvitation[] }>("GET", `/workspaces/invitations/pending`);
  },
  acceptInvitation(invitationId: string) {
    return request<WorkspaceMemberInfo>("POST", `/workspaces/invitations/${invitationId}/accept`);
  },
  declineInvitation(invitationId: string) {
    return request<void>("POST", `/workspaces/invitations/${invitationId}/decline`);
  },
  changeRole(workspaceId: string, userId: string, role: string) {
    return request<WorkspaceMemberInfo>("PATCH", `/workspaces/${workspaceId}/members/${userId}`, { role });
  },
  removeMember(workspaceId: string, userId: string) {
    return request<void>("DELETE", `/workspaces/${workspaceId}/members/${userId}`);
  },
  leaveWorkspace(workspaceId: string) {
    return request<void>("POST", `/workspaces/${workspaceId}/leave`);
  },
  searchUsers(query: string) {
    return request<{ users: UserSearchResult[] }>("GET", `/workspaces/search/users?q=${encodeURIComponent(query)}`);
  },
  listWorkspacePresentations(workspaceId: string) {
    return request<{ presentation_ids: string[]; presentations: Presentation[] }>(
      "GET",
      `/workspaces/${workspaceId}/presentations`,
    );
  },
  addPresentation(workspaceId: string, presentationId: string) {
    return request<{ status: string }>("POST", `/workspaces/${workspaceId}/presentations`, { presentation_id: presentationId });
  },
  removePresentation(workspaceId: string, presentationId: string) {
    return request<void>("DELETE", `/workspaces/${workspaceId}/presentations/${presentationId}`);
  },
  audit(workspaceId: string) {
    return request<{ entries: AuditEntry[] }>("GET", `/workspaces/${workspaceId}/audit`);
  },
};

export const chatApi = {
  list(presentationId: string) {
    return request<ChatListResponse>("GET", `/presentations/${presentationId}/chat`);
  },

  /** Streaming chat — returns an async iterator of SSE events. */
  async *stream(
    presentationId: string,
    message: string,
    currentSlideIndex: number = 0,
    model?: string | null,
    screenshot?: string | null,
    diagnostics?: { element_index: number; problem: string; detail?: string }[] | null,
    signal?: AbortSignal | null,
  ): AsyncGenerator<{ event: string; data: string }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const authToken = getAccessToken();
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}/presentations/${presentationId}/chat/stream`, {
      method: "POST",
      headers,
      signal: signal ?? undefined,
      body: JSON.stringify({
        message,
        current_slide_index: currentSlideIndex,
        model: model || null,
        screenshot: screenshot || null,
        diagnostics: diagnostics && diagnostics.length > 0 ? diagnostics : null,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Stream request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let pendingEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          pendingEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && pendingEvent) {
          const data = line.slice(6);
          yield { event: pendingEvent, data };
          pendingEvent = "";
        }
      }
    }
  },

  clear(presentationId: string) {
    return request<{ message: string }>("DELETE", `/presentations/${presentationId}/chat`);
  },
};
