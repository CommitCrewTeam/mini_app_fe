import { accountApi, clearSession, getAccessToken, refreshAccessToken, request } from "../api/client";

function response(status, data) {
  return new Response(status === 204 ? null : JSON.stringify(data), { status });
}

beforeEach(() => {
  clearSession();
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

test("login sends rememberMe through gateway and only stores access token in memory", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "access", expiresIn: 900 }));
  await accountApi.login("demo", "password", true);
  expect(fetch).toHaveBeenCalledWith("/auth_service/api/v1/auth/login", expect.objectContaining({
    credentials: "same-origin",
    body: JSON.stringify({ username: "demo", password: "password", rememberMe: true }),
  }));
  expect(getAccessToken()).toBe("access");
  expect(localStorage.getItem("auth_dashboard_session")).toBeNull();
  expect(sessionStorage.getItem("auth_dashboard_session")).toBeNull();
});

test("restores a session using the cookie without an Authorization header", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "restored" }));
  await refreshAccessToken();
  expect(getAccessToken()).toBe("restored");
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(fetch.mock.calls[0][1].headers["X-Requested-With"]).toBe("XMLHttpRequest");
});

test("concurrent expired requests share one refresh and retry with the new token", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "old" }));
  await accountApi.login("demo", "password");
  fetch.mockImplementation(async (url, options) => {
    if (url.endsWith("/refresh")) return response(200, { accessToken: "new" });
    return options.headers.Authorization === "Bearer old" ? response(401, {}) : response(200, []);
  });
  await Promise.all([request("/backend_service/api/v1/products"), request("/backend_service/api/v1/products")]);
  expect(fetch.mock.calls.filter(([url]) => url.endsWith("/refresh"))).toHaveLength(1);
  expect(fetch.mock.calls.filter(([, options]) => options.headers.Authorization === "Bearer new")).toHaveLength(2);
});

test("invalid refresh ends the session without retry loops", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "old" }));
  await accountApi.login("demo", "password");
  fetch.mockResolvedValueOnce(response(401, {})).mockResolvedValueOnce(response(401, {}));
  await expect(request("/backend_service/api/v1/products")).rejects.toMatchObject({ status: 401 });
  expect(getAccessToken()).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("a second 401 after refresh stops instead of refreshing repeatedly", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "old" }));
  await accountApi.login("demo", "password");
  fetch.mockResolvedValueOnce(response(401, {}))
    .mockResolvedValueOnce(response(200, { accessToken: "new" }))
    .mockResolvedValueOnce(response(401, {}));
  await expect(request("/backend_service/api/v1/products")).rejects.toMatchObject({ status: 401 });
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(getAccessToken()).toBeNull();
});

test("403 does not trigger a refresh", async () => {
  fetch.mockResolvedValueOnce(response(200, { accessToken: "old" }));
  await accountApi.login("demo", "password");
  fetch.mockResolvedValueOnce(response(403, {}));
  await expect(request("/backend_service/api/v1/products")).rejects.toMatchObject({ status: 403 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(getAccessToken()).toBe("old");
});

test("logout revokes the cookie session and a delayed refresh cannot restore it", async () => {
  let finishRefresh;
  fetch.mockReturnValueOnce(new Promise(resolve => { finishRefresh = resolve; }));
  const refreshing = refreshAccessToken();
  const rejectedRefresh = expect(refreshing).rejects.toMatchObject({ name: "AbortError" });
  fetch.mockResolvedValueOnce(response(204));
  await accountApi.logout();
  finishRefresh(response(200, { accessToken: "late" }));
  await rejectedRefresh;
  expect(getAccessToken()).toBeNull();
  expect(fetch.mock.calls[1][0]).toBe("/auth_service/api/v1/auth/logout");
});
