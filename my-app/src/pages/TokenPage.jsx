import { useEffect, useState } from "react";
import { accountApi } from "../api/client";
import RevokeToken from "../components/common/RevokeToken";

export default function TokenPage() {
  const [tokens, setTokens] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  async function load(targetPage = page) {
    setLoading(true);
    setError("");
    try {
      const result = await accountApi.listTokens(targetPage, 20);
      setTokens(result.content);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
    }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleRevokeToken(token) {
    setBusy(token.id);
    setError("");
    setMessage("");
    try {
      await accountApi.revokeToken(token.id);
      setTokens(previous => previous.map(item => item.id === token.id ? { ...item, revoked: true } : item));
      setMessage(`Đã thu hồi token #${token.id}.`);
    } catch (error) { setError(error.message); }
    finally { setBusy(null); }
  }

  return <section className="panel space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Quản lý refresh token</h2>
      <button className="action-button" disabled={loading || busy !== null} onClick={() => load()}>Tải lại</button>
    </div>
    <p className="text-sm text-slate-500">Toàn bộ refresh token trong hệ thống. Thu hồi sẽ ngăn phiên tiếp tục làm mới token; access token đã cấp vẫn có hiệu lực đến khi hết hạn.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {loading ? <p role="status">Đang tải token…</p> : tokens.length === 0 ?
      <p>Chưa có token.</p> : <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr className="border-b border-[var(--color-border)]">
            <th className="p-3">Token ID</th><th className="p-3">User ID</th><th className="p-3">Hết hạn</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th>
          </tr></thead>
          <tbody>{tokens.map(token => {
            const expired = new Date(token.expiresAt).getTime() <= now;
            return <tr key={token.id} className="border-b border-[var(--color-border)]">
              <td className="p-3 font-medium">#{token.id}{token.current && <span className="ml-2 text-blue-600">(Hiện tại)</span>}</td>
              <td className="p-3">{token.userId}</td>
              <td className="p-3 whitespace-nowrap">{new Date(token.expiresAt).toLocaleString("vi-VN")}</td>
              <td className="p-3">{token.revoked ? "Đã thu hồi" : expired ? "Đã hết hạn" : "Còn hiệu lực"}</td>
              <td className="p-3"><RevokeToken token={token} busy={busy} onRevoke={handleRevokeToken} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>{totalElements} token · Trang {totalPages === 0 ? 0 : page + 1}/{totalPages} · 20 dòng/trang</span>
      <div className="flex gap-3">
        <button className="action-button disabled:opacity-50" disabled={loading || busy !== null || page === 0} onClick={() => load(page - 1)}>Trước</button>
        <button className="action-button disabled:opacity-50" disabled={loading || busy !== null || page + 1 >= totalPages} onClick={() => load(page + 1)}>Sau</button>
      </div>
    </div>
  </section>;
}
