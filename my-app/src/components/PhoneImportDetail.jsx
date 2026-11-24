import { useEffect, useRef, useState } from "react";
import { phoneImportApi } from "../api/phoneImports";

const colors = {
  VALID: "success", APPLIED: "success", VALIDATE_SUCCEEDED: "success", APPROVE_SUCCEEDED: "success",
  WARNING: "warning", PENDING: "warning", UPLOAD_IN_PROGRESS: "warning", VALIDATE_IN_PROGRESS: "warning", APPROVE_IN_PROGRESS: "warning",
  INVALID: "danger", UPLOAD_FAILED: "danger", VALIDATE_FAILED: "danger", APPROVE_FAILED: "danger", APPROVE_VALIDATION_FAILED: "danger",
};
function Status({ value }) {
  const color = colors[value] || "user";
  return <span className="rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap"
    style={{ background: `var(--color-${color}-bg)`, color: `var(--color-${color}-text)` }}>{value ?? "—"}</span>;
}
const date = value => value ? new Date(value).toLocaleString("vi-VN") : "—";
const validatableStatuses = new Set(["VALIDATE_SUCCEEDED", "VALIDATE_FAILED", "APPROVE_VALIDATION_FAILED"]);

export default function PhoneImportDetail({ importId, onClose }) {
  const dialog = useRef(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let poll;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError("");
    phoneImportApi.detail(importId, page, size, controller.signal).then(result => {
      if (disposed) return;
      setData(result);
      if (result.header.status.endsWith("_IN_PROGRESS")) poll = setTimeout(() => setReload(value => value + 1), 3000);
    }).catch(err => {
      if (!disposed) setError(err.name === "AbortError" ? "Tải chi tiết quá thời gian. Vui lòng thử lại." : err.message);
    }).finally(() => {
      clearTimeout(timeout);
      if (!disposed) setLoading(false);
    });
    return () => { disposed = true; controller.abort(); clearTimeout(timeout); clearTimeout(poll); };
  }, [importId, page, size, reload]);

  const header = data?.header;
  const canValidate = validatableStatuses.has(header?.status);
  function changePage(next) { setData(null); setPage(next); }

  async function validateImport() {
    if (inFlight.current || !canValidate) return;
    inFlight.current = true;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await phoneImportApi.validate(importId);
      setData(current => ({ ...current, header: { ...current.header, status: "VALIDATE_IN_PROGRESS" } }));
      setNotice("Đã gửi yêu cầu validate toàn import.");
    } catch (err) { setActionError(err.message); }
    finally { inFlight.current = false; setBusy(false); setReload(value => value + 1); }
  }

  return <dialog ref={dialog} aria-labelledby="import-detail-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
    className="rounded-xl border border-[var(--color-border)] p-6 shadow-xl backdrop:bg-black/50"
    style={{ margin: "auto", width: "min(1400px, 95vw)", maxHeight: "90vh", overflow: "auto", background: "var(--color-bg)", color: "var(--color-text-primary)" }}>
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 id="import-detail-title" className="text-xl font-semibold">Chi tiết import #{importId}</h2>
      <button type="button" className="action-button" disabled={busy} onClick={onClose} autoFocus>Đóng</button>
    </div>
    {header && <>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div><dt>Import ID</dt><dd>{header.id}</dd></div>
        <div><dt>Trạng thái</dt><dd><Status value={header.status} /></dd></div>
        <div><dt>Version</dt><dd>{header.version ?? "—"}</dd></div>
        <div><dt>Ngày tạo</dt><dd>{date(header.createdAt)}</dd></div>
        <div><dt>Cập nhật lần cuối</dt><dd>{date(header.updatedAt)}</dd></div>
      </dl>
      <p className="mb-3 whitespace-pre-wrap break-words">Lỗi import: {header.error || "Không có"}</p>
    </>}
    {header && <div className="mb-3">
      <div className="flex items-center gap-2 text-sm">
        <span>Mode: <strong>{header.mode}</strong></span>
        <button type="button" className="action-button" aria-label="Giải thích dữ liệu import"
          aria-expanded={showExplanation} aria-controls="import-data-explanation"
          onClick={() => setShowExplanation(value => !value)}>…</button>
      </div>
      {showExplanation && <p id="import-data-explanation" className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Dữ liệu của các dòng trong lần import này. CREATE tạo điện thoại mới; UPDATE thay thông tin; RESTOCK cộng số lượng. Không phải bản so sánh trước/sau của Phone.
      </p>}
    </div>}
    <div className="flex items-center gap-3 mb-3">
      <button type="button" className="action-button" disabled={loading || busy} onClick={() => setReload(value => value + 1)}>Tải lại chi tiết</button>
      <button type="button" className="action-button" disabled={loading || busy || !canValidate} onClick={validateImport}>Validate</button>
      {data && <span>{data.totalElements} dòng</span>}
      {loading && <span role="status">Đang tải…</span>}
    </div>
    {error && <p role="alert" className="mb-3">{error}</p>}
    {actionError && <p role="alert" className="mb-3">{actionError}</p>}
    {notice && <p role="status" className="mb-3">{notice}</p>}
    {data && <>
      <div className="overflow-x-auto" aria-busy={loading}>
        <table className="data-table">
          <thead><tr><th>Dòng CSV</th><th>Draft ID</th><th>Key</th><th>Detail</th><th>Quantity</th><th>Status</th><th>Lỗi / cảnh báo</th><th>Draft version</th><th>Phone version lúc validate</th><th>Thao tác</th></tr></thead>
          <tbody>{data.content.map(row => <tr key={row.id}>
            <td>{row.rowNumber}</td><td>{row.id}</td><td className="break-words">{row.key ?? "—"}</td>
            <td><pre className="min-w-64 whitespace-pre-wrap break-words text-xs">{row.detail == null ? "—" : JSON.stringify(row.detail, null, 2)}</pre></td>
            <td>{row.quantity ?? "—"}</td><td><Status value={row.status} /></td>
            <td className="min-w-48 whitespace-pre-wrap break-words">{row.errorMessage || "—"}</td>
            <td>{row.version ?? "—"}</td><td>{row.matchedVersion ?? "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      {data.content.length === 0 && <p className="my-4">Chưa có dòng dữ liệu ở trang này.</p>}
    </>}
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
      <label>Số dòng mỗi trang <select className="table-input" value={size} disabled={loading || busy}
        onChange={event => { setData(null); setSize(Number(event.target.value)); setPage(0); }}>
        {[20, 50, 100].map(value => <option key={value} value={value}>{value}</option>)}
      </select></label>
      <div className="flex items-center gap-3">
        <button type="button" className="action-button" disabled={loading || busy || page === 0} onClick={() => changePage(page - 1)}>Trang trước</button>
        <span>Trang {page + 1} / {Math.max(1, data?.totalPages || 0)}</span>
        <button type="button" className="action-button" disabled={loading || busy || !data || page + 1 >= data.totalPages} onClick={() => changePage(page + 1)}>Trang sau</button>
      </div>
    </div>
  </dialog>;
}
