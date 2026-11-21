import { useEffect, useRef, useState } from "react";
import { getAccessToken, refreshAccessToken } from "../../api/client";
import type { RefreshStatus } from "../../api/client";

function tokenExpiration(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload));
    return typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AccessTokenCountdown() {
  const [expiresAt, setExpiresAt] = useState(() => tokenExpiration(getAccessToken()));
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    function updateToken() {
      setExpiresAt(tokenExpiration(getAccessToken()));
      setNow(Date.now());
    }
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    window.addEventListener("access-token-changed", updateToken);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("access-token-changed", updateToken);
    };
  }, []);

  if (expiresAt === null) return null;
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  return <span className={`ml-auto rounded-lg px-3 py-1 text-sm tabular-nums ${remaining <= 5 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
    Access token: <strong>{remaining}s</strong>
  </span>;
}

// Mounted above routes so refresh failures stay visible after redirecting to login.
export function TokenRefreshNotifications() {
  const [notice, setNotice] = useState<RefreshStatus | null>(null);
  const attemptedToken = useRef<string | null>(null);

  useEffect(() => {
    function checkExpiration() {
      const token = getAccessToken();
      if (!token) {
        attemptedToken.current = null;
        return;
      }
      const expiresAt = tokenExpiration(token);
      if (expiresAt === null || Date.now() < expiresAt || attemptedToken.current === token) return;
      // One automatic attempt per token; failures must not create a request loop.
      attemptedToken.current = token;
      void refreshAccessToken().catch(() => { /* Client emits the error toast. */ });
    }

    function handleRefresh(event: Event) {
      setNotice((event as CustomEvent<RefreshStatus>).detail);
    }

    window.addEventListener("token-refresh", handleRefresh);
    window.addEventListener("focus", checkExpiration);
    document.addEventListener("visibilitychange", checkExpiration);
    const timer = window.setInterval(checkExpiration, 250);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("token-refresh", handleRefresh);
      window.removeEventListener("focus", checkExpiration);
      document.removeEventListener("visibilitychange", checkExpiration);
    };
  }, []);

  useEffect(() => {
    if (!notice || notice.state === "loading") return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  const color = notice.state === "error" ? "border-red-300 text-red-700" :
    notice.state === "success" ? "border-green-300 text-green-700" : "border-blue-300 text-blue-700";
  return <div role={notice.state === "error" ? "alert" : "status"}
    className={`fixed right-4 top-20 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg token-toast ${color}`}>
    {notice.state === "loading" && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    <span className="text-sm">{notice.message}</span>
    <button type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)} className="shrink-0 px-1">×</button>
  </div>;
}
