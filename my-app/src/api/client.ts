const AUTH_URL = "/auth_service/api/v1/auth";
const LEGACY_SESSION_KEY = "auth_dashboard_session";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const REQUEST_TIMEOUT_MS = 15_000;

type RequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: Record<string, string>;
  token?: string | null;
};
type TokenResponse = { accessToken: string; expiresIn: number; refreshToken: string };
type RegisterResponse = { username: string };
type PasswordChange = { currentPassword: string; newPassword: string };
type ErrorResponse = { data?: Record<string, unknown>; message?: string; detail?: string };

let accessToken: string | null = null;
let sessionVersion = 0;
let pendingRefresh: Promise<string> | null = null;

export type RefreshStatus = { state: "loading" | "success" | "error"; message: string };

function notifyRefresh(status: RefreshStatus): void {
  window.dispatchEvent(new CustomEvent("token-refresh", { detail: status }));
}

function setAccessToken(token: string | null): void {
  accessToken = token;
  window.dispatchEvent(new Event("access-token-changed"));
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearSession(): void {
  setAccessToken(null);
  sessionVersion += 1;
  pendingRefresh = null;
  // Remove tokens left by older versions of the frontend.
  localStorage.removeItem(LEGACY_SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

function expireSession(): void {
  clearSession();
  window.dispatchEvent(new Event("session-expired"));
}

function assertCurrentSession(version: number): void {
  if (version !== sessionVersion) {
    throw new DOMException("The session changed while the request was pending.", "AbortError");
  }
}

function defaultErrorMessage(status: number): string {
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  return `Request failed (${status}).`;
}

function createApiError(status: number, data: ErrorResponse | null): Error & { status: number } {
  const details = data?.data && typeof data.data === "object" ? Object.values(data.data).join("; ") : "";
  const message = details || data?.message || data?.detail || defaultErrorMessage(status);
  return Object.assign(new Error(message), { status });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof Error && "status" in error && error.status === 401;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw createApiError(response.status, data);
  return data as T;
}

function buildRequestOptions({ body, token, headers, ...options }: RequestOptions): RequestInit {
  const multipart = body instanceof FormData;
  return {
    ...options,
    credentials: "omit",
    headers: {
      ...headers,
      ...(body === undefined || multipart ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  };
}

function sendRequest(url: string, options: RequestOptions): Promise<Response> {
  const requestOptions = buildRequestOptions(options);
  return fetch(url, {
    ...requestOptions,
    signal: requestOptions.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

async function performRefresh(version: number): Promise<string> {
  const showNotification = accessToken !== null;
  if (showNotification) notifyRefresh({ state: "loading", message: "Đang làm mới access token…" });
  try {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw createApiError(401, null);
    const response = await sendRequest(`${AUTH_URL}/refresh`, { method: "POST", body: { refreshToken } });
    const result = await parseResponse<TokenResponse>(response);
    assertCurrentSession(version);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    setAccessToken(result.accessToken);
    if (showNotification) notifyRefresh({ state: "success", message: "Đã làm mới access token." });
    return result.accessToken;
  } catch (error) {
    if (showNotification && version === sessionVersion) {
      const message = error instanceof Error ? error.message : "Không thể kết nối máy chủ.";
      notifyRefresh({ state: "error", message: `Làm mới token thất bại: ${message}` });
    }
    if (version === sessionVersion && isUnauthorized(error)) expireSession();
    throw error;
  }
}

export function refreshAccessToken(): Promise<string> {
  if (pendingRefresh) return pendingRefresh;

  const refresh = performRefresh(sessionVersion);
  pendingRefresh = refresh;
  function releaseRefresh(): void {
    if (pendingRefresh === refresh) pendingRefresh = null;
  }
  refresh.then(releaseRefresh, releaseRefresh);
  return refresh;
}

async function retryWithFreshToken(url: string, options: RequestOptions, version: number): Promise<Response> {
  assertCurrentSession(version);
  // Concurrent requests reuse a refreshed token or share one refresh call.
  const token = accessToken && accessToken !== options.token ? accessToken : await refreshAccessToken();
  assertCurrentSession(version);
  const response = await sendRequest(url, { ...options, token });
  if (response.status === 401 && version === sessionVersion) expireSession();
  return response;
}

export async function request<T = unknown>(url: string, { token = accessToken, ...options }: RequestOptions = {}): Promise<T> {
  const version = sessionVersion;
  const requestOptions = { ...options, token };
  const response = await sendRequest(url, requestOptions);
  if (response.status !== 401 || !token) return parseResponse<T>(response);

  const retriedResponse = await retryWithFreshToken(url, requestOptions, version);
  return parseResponse<T>(retriedResponse);
}

async function login(username: string, password: string): Promise<TokenResponse> {
  clearSession();
  const version = sessionVersion;
  const result = await request<TokenResponse>(`${AUTH_URL}/login`, {
    method: "POST", body: { username, password }, token: null,
  });
  assertCurrentSession(version);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
  setAccessToken(result.accessToken);
  return result;
}

async function logout(): Promise<void> {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) await request<void>(`${AUTH_URL}/logout`, { method: "POST", body: { refreshToken }, token: null });
  expireSession();
}

function changePassword(body: PasswordChange): Promise<void> {
  return request<void>(`${AUTH_URL}/reset-password`, { method: "POST", body });
}

function register(username: string, password: string, role: "USER" | "SUPERVISOR" = "USER"): Promise<RegisterResponse> {
  return request<RegisterResponse>(`${AUTH_URL}/register`, {
    method: "POST", body: { username, password, role }, token: null,
  });
}

export type RefreshTokenInfo = { id: number; userId: number; expiresAt: string; revoked: boolean; current: boolean };
export type TokenPage = { content: RefreshTokenInfo[]; page: number; size: number; totalElements: number; totalPages: number };

function listTokens(page = 0, size = 20): Promise<TokenPage> {
  return request<TokenPage>(`${AUTH_URL}/tokens?page=${page}&size=${size}`, { headers: currentTokenHeader() });
}

// Optional metadata to mark the current token; authorization still uses the access token.
function currentTokenHeader(): Record<string, string> {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  return refreshToken ? { "X-Refresh-Token": refreshToken } : {};
}

async function revokeToken(id: number): Promise<void> {
  const version = sessionVersion;
  const result = await request<{ current: boolean }>(`${AUTH_URL}/tokens/${id}`, { method: "DELETE", headers: currentTokenHeader() });
  assertCurrentSession(version);
  if (result.current) expireSession();
}

function listRolePermissions(): Promise<Record<string, string[]>> {
  return request<Record<string, string[]>>(`${AUTH_URL}/permissions`);
}

function listPermissions(): Promise<string[]> {
  return request<string[]>(`${AUTH_URL}/permissions/catalog`);
}

function updateRolePermissions(role: string, permissions: string[]): Promise<void> {
  return request<void>(`${AUTH_URL}/permissions/${encodeURIComponent(role)}`, { method: "PUT", body: { permissions } });
}

export const accountApi = { login, logout, changePassword, register, listTokens, revokeToken, listRolePermissions, updateRolePermissions, listPermissions };
