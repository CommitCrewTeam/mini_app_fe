import { useEffect, useRef, useState } from "react";
import { phoneImportApi } from "../api/phoneImports";
import PhoneImportDetail from "../components/PhoneImportDetail";

const statusColors = {
  VALIDATE_SUCCEEDED: "success",
  APPROVE_SUCCEEDED: "success",
  UPLOAD_FAILED: "danger", VALIDATE_FAILED: "danger",
  APPROVE_FAILED: "danger", APPROVE_VALIDATION_FAILED: "danger",
  UPLOAD_IN_PROGRESS: "warning", VALIDATE_IN_PROGRESS: "warning", APPROVE_IN_PROGRESS: "warning",
};
const statusOptions = Object.keys(statusColors);
const modeOptions = ["CREATE", "UPDATE", "RESTOCK"];
const pageSizes = [10, 20, 50];

export default function PhoneImportList() {
  const [imports, setImports] = useState([]);
  const [viewId, setViewId] = useState(null);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [approvingId, setApprovingId] = useState(null);
  const [acceptedWarnings, setAcceptedWarnings] = useState({});
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    let disposed = false;
    let refreshTimer;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    const filters = [];
    if (statusFilter) filters.push({ field: "status", operator: "EQ", value: statusFilter });
    if (modeFilter) filters.push({ field: "mode", operator: "EQ", value: modeFilter });
    phoneImportApi.list(page, size, filters, controller.signal).then(data => {
      if (disposed) return;
      setImports(data?.content || []);
      setTotalElements(Number(data?.totalElements || 0));
      if (data?.content?.some(item => item.status.endsWith("_IN_PROGRESS"))) {
        refreshTimer = setTimeout(() => setReload(value => value + 1), 3000);
      }
    }).catch(err => {
      if (!disposed && err.name !== "AbortError") setError(err.message);
    }).finally(() => {
      clearTimeout(timeout);
      if (!disposed) setLoading(false);
    });
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); clearTimeout(refreshTimer); };
  }, [page, size, statusFilter, modeFilter, reload]);

  const totalPages = totalElements > 0 ? Math.ceil(totalElements / size) : 0;

  async function approve(item) {
    if (submitting.current || item.status !== "VALIDATE_SUCCEEDED" || !/^\d+$/.test(String(item.id))) return;
    submitting.current = true;
    setApprovingId(item.id);
    setActionError("");
    setNotice("");
    try {
      await phoneImportApi.approve(item.id, acceptedWarnings[item.id] === true);
      setImports(current => current.map(row => row.id === item.id ? { ...row, status: "APPROVE_IN_PROGRESS" } : row));
      setAcceptedWarnings(current => ({ ...current, [item.id]: false }));
      setNotice(`Đã gửi yêu cầu approve import #${item.id}. Theo dõi trạng thái để xem kết quả.`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      submitting.current = false;
      setApprovingId(null);
      setReload(value => value + 1);
    }
  }

  return <section className="panel">
    <p className="mt-1 mb-4 text-[var(--color-text-secondary)]">Tra cứu lịch sử các file import đã tải, với filter theo trạng thái và chế độ.</p>
    {error && <p role="alert" className="text-red-600 mb-3">{error}</p>}
    {actionError && <p role="alert" className="text-red-600 mb-3">{actionError}</p>}
    {notice && <p role="status" className="mb-3">{notice}</p>}

    <div className="flex flex-wrap items-end gap-3 mb-4">
      <label className="flex flex-col gap-1">Trạng thái
        <select className="table-input w-44" aria-label="Trạng thái" value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(0); }}>
          <option value="">— Tất cả —</option>
          {statusOptions.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">Chế độ
        <select className="table-input w-40" aria-label="Chế độ" value={modeFilter} onChange={event => { setModeFilter(event.target.value); setPage(0); }}>
          <option value="">— Tất cả —</option>
          {modeOptions.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <button className="action-button" onClick={() => setReload(value => value + 1)} disabled={loading}>Tải lại</button>
      <span className="text-sm text-[var(--color-text-secondary)]">{totalElements} kết quả</span>
    </div>

    <div className="overflow-x-auto">
      <table className="data-table">
        <thead><tr><th>Import ID</th><th>File upload</th><th>Mode</th><th>Trạng thái</th><th>Version</th><th>Error</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
        <tbody>{imports.map(item => <tr key={item.id}>
          <td>{item.id}</td>
          <td className="max-w-64 truncate" title={item.uploadFileName || ""}>{item.uploadFileName || "—"}</td>
          <td>{item.mode}</td>
          <td><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `var(--color-${statusColors[item.status] || "user"}-bg)`, color: `var(--color-${statusColors[item.status] || "user"}-text)` }}>{item.status}</span></td>
          <td>{item.version ?? ""}</td>
          <td className="max-w-72 truncate" title={item.error || ""}>{item.error || ""}</td>
          <td>{item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : ""}</td>
          <td>
            <button type="button" className="action-button mr-2" aria-label={`Xem import #${item.id}`} onClick={() => setViewId(item.id)}>Xem</button>
            <button type="button" className="action-button" aria-label={`Approve import #${item.id}`}
              disabled={loading || approvingId !== null || item.status !== "VALIDATE_SUCCEEDED" || !/^\d+$/.test(String(item.id))}
              onClick={() => approve(item)}>{approvingId === item.id ? "Đang gửi…" : "Approve"}</button>
            {item.status === "VALIDATE_SUCCEEDED" && <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={acceptedWarnings[item.id] === true} disabled={approvingId !== null}
                onChange={event => setAcceptedWarnings(current => ({ ...current, [item.id]: event.target.checked }))} />
              Tôi đồng ý áp dụng cả dòng có cảnh báo
            </label>}
          </td>
        </tr>)}</tbody>
      </table>
    </div>

    {!loading && imports.length === 0 && <p className="mt-4 text-sm text-[var(--color-text-secondary)]">Không có import nào phù hợp với filter hiện tại.</p>}

    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-text-secondary)]">Mỗi trang</span>
        <select className="table-input w-20" aria-label="Mỗi trang" value={size} onChange={event => { setSize(Number(event.target.value)); setPage(0); }}>
          {pageSizes.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button className="action-button" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>Trước</button>
        <span className="text-sm">Trang {page + 1} / {Math.max(1, totalPages)}</span>
        <button className="action-button" disabled={loading || page >= totalPages - 1} onClick={() => setPage(value => value + 1)}>Sau</button>
      </div>
    </div>

    <p className="mt-2 text-xs text-[var(--color-text-secondary)]">Chỉ approve khi VALIDATE_SUCCEEDED. Nếu có cảnh báo, cần xác nhận áp dụng trước khi approve lại.</p>
    {viewId !== null && <PhoneImportDetail key={viewId} importId={viewId} onClose={() => { setViewId(null); setReload(value => value + 1); }} />}
  </section>;
}
