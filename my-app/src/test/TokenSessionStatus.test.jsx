import { act, render, screen } from "@testing-library/react";
import { AccessTokenCountdown, TokenRefreshNotifications } from "../components/common/TokenSessionStatus";
import { accountApi, clearSession } from "../api/client";

function token(exp) {
  return `header.${btoa(JSON.stringify({ exp }))}.signature`;
}

function response(status, body) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-19T00:00:00Z"));
  clearSession();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  clearSession();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function loginWithCountdown() {
  fetch.mockResolvedValueOnce(response(200, { accessToken: token(Date.now() / 1000 + 15), expiresIn: 15 }));
  await accountApi.login("demo", "password");
  render(<><AccessTokenCountdown /><TokenRefreshNotifications /></>);
}

test("counts down and refreshes at expiry, then shows success and the new lifetime", async () => {
  await loginWithCountdown();
  expect(screen.getByText("15s")).toBeInTheDocument();
  let finishRefresh;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(screen.getByText("0s")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Đang làm mới access token");
  expect(fetch.mock.calls[1][0]).toBe("/auth_service/api/v1/auth/refresh");
  await act(async () => {
    finishRefresh(response(200, { accessToken: token(Date.now() / 1000 + 15), expiresIn: 15 }));
  });
  expect(screen.getByText("15s")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Đã làm mới access token.");
});

test("shows refresh failure without repeatedly calling the missing endpoint", async () => {
  await loginWithCountdown();
  fetch.mockResolvedValueOnce(response(404, { message: "Refresh endpoint unavailable" }));
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(screen.getByRole("alert")).toHaveTextContent("Refresh endpoint unavailable");
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("clearing the session removes the countdown and cancels automatic refresh", async () => {
  await loginWithCountdown();
  act(() => clearSession());
  expect(screen.queryByText("15s")).not.toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
  expect(fetch).toHaveBeenCalledTimes(1);
});
