import { useEffect, useState } from "react";
import { accountApi } from "../api/client";

export default function Authorization() {
  const [permissions, setPermissions] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [roles, available] = await Promise.all([accountApi.listRolePermissions(), accountApi.listPermissions()]);
      setPermissions(roles);
      setCatalog(available);
    }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(role, permission, checked) {
    const next = new Set(permissions[role]);
    if (checked) next.add(permission); else next.delete(permission);
    setBusy(role);
    setError("");
    setMessage("");
    try {
      await accountApi.updateRolePermissions(role, [...next]);
      setPermissions(previous => ({ ...previous, [role]: [...next] }));
      setMessage(`Đã lưu quyền cho ${role}. Quyền mới áp dụng khi tài khoản nhận access token mới.`);
    } catch (error) { setError(error.message); }
    finally { setBusy(null); }
  }

  return <section className="panel space-y-4">
    <h2 className="text-lg font-semibold">Phân quyền theo role</h2>
    <p>ADMIN có toàn quyền và là role duy nhất được chỉnh phân quyền cho USER, SUPERVISOR.</p>
    <p className="text-sm text-slate-500">Chọn quyền để cấp hoặc bỏ chọn để thu hồi. Các thay đổi được lưu tự động.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    {loading ? <p role="status">Đang tải quyền…</p> : <div className="overflow-x-auto"><table className="data-table">
      <thead><tr><th>Role</th>{catalog.map(permission => <th key={permission}>{permission}</th>)}<th>Chỉnh phân quyền</th></tr></thead>
      <tbody>{Object.entries(permissions).map(([role, granted]) => <tr key={role}>
        <td className="font-semibold">{role}</td>
        {catalog.map(permission => <td key={permission}>
          <input type="checkbox" aria-label={`${role} ${permission}`} checked={granted.includes(permission)}
            disabled={role === "ADMIN" || busy !== null} onChange={event => toggle(role, permission, event.target.checked)} />
        </td>)}
        <td>{role === "ADMIN" ? "Có" : "Không"}</td>
      </tr>)}</tbody>
    </table></div>}
    <button className="action-button" disabled={loading || busy !== null} onClick={load}>Tải lại</button>
  </section>;
}
