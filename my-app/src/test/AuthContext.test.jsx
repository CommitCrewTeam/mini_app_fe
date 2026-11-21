import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { clearSession, getAccessToken } from "../api/client";

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
function json(status, data) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status });
}
function tokenFor(role) {
  const payload = btoa(JSON.stringify({ sub: "1", username: "demo", roles: [role] }));
  return `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`;
}
beforeEach(() => {
  clearSession();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

test("reads refreshed user from JWT without a profile request", async () => {
  fetch.mockResolvedValueOnce(json(200, { accessToken: tokenFor("ADMIN") }));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.user.role).toBe("admin");
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    "/auth_service/api/v1/auth/refresh",
  ]);
});

test("missing refresh cookie leaves user signed out", async () => {
  fetch.mockResolvedValueOnce(json(401, {}));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.user).toBeNull();
});

test("login and logout use server endpoints and clear memory", async () => {
  fetch.mockResolvedValueOnce(json(401, {}));
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  fetch.mockClear();
  fetch.mockResolvedValueOnce(json(200, { accessToken: tokenFor("USER") }));
  await act(async () => { expect(await result.current.login(" demo ", "password", true)).toEqual({ success: true }); });
  expect(result.current.isAuthenticated).toBe(true);
  expect(result.current.user.username).toBe("demo");
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe("/auth_service/api/v1/auth/login");
  fetch.mockResolvedValueOnce(json(204));
  await act(async () => { expect(await result.current.logout()).toEqual({ success: true }); });
  expect(result.current.user).toBeNull();
  expect(getAccessToken()).toBeNull();
});
