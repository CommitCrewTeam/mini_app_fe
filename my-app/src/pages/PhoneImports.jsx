import { useEffect, useRef, useState } from "react";
import { phoneImportApi } from "../api/phoneImports";

const running = new Set(["PENDING", "VALIDATING", "APPROVING"]);
const statusColors = {
  DONE: "success", VALIDATED: "success", FAILED: "danger",
  PENDING: "warning", VALIDATING: "warning", APPROVING: "warning",
};

export default function PhoneImports() {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("CREATE");
  const [lookup, setLookup] = useState("");
  const [importId, setImportId] = useState("");
  const [job, setJob] = useState(null);
  const [stat, setStat] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!importId || busy) return;
    let disposed = false;
    let timer;
    let controller;
    async function refresh() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      setLoading(true);
      try {
        const data = await phoneImportApi.stat(importId, controller.signal);
        if (disposed) return;
        setStat(data);
        setUpdatedAt(new Date());
        if (running.has(data.status)) timer = setTimeout(refresh, 3000);
      } catch (err) {
        if (!disposed) setError(err.name === "AbortError" ? "Tra cứu quá thời gian. Hãy tải lại thống kê." : err.message);
      } finally {
        clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    }
    refresh();
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); };
  }, [importId, reload, busy]);

  async function submit(action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(action);
    setError("");
    setNotice("");
    try {
      if (action === "upload") {
        const submission = await phoneImportApi.upload(file, mode);
        setImportId(String(submission.importId));
        setLookup(String(submission.importId));
        setJob(submission.jobExecutionId);
        setStat(null);
        setUpdatedAt(null);
        setNotice(`Đã nhận import #${submission.importId}. File đang được xử lý.`);
      } else {
        const submission = await phoneImportApi[action](importId);
        setJob(action === "validate" ? submission : submission.jobExecutionId);
        setStat(current => ({ ...current, status: action === "validate" ? "VALIDATING" : "APPROVING" }));
        setNotice(action === "validate" ? "Đã gửi yêu cầu kiểm tra dữ liệu." : "Đã gửi yêu cầu duyệt import.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      inFlight.current = false;
      setBusy("");
    }
  }

  function upload(event) {
    event.preventDefault();
    if (!file || !file.name.toLowerCase().endsWith(".csv") || file.size === 0) {
      setError("Vui lòng chọn file .csv có dữ liệu.");
      return;
    }
    submit("upload");
  }

  function findImport(event) {
    event.preventDefault();
    const id = lookup.trim();
    if (!/^[1-9]\d*$/.test(id) || BigInt(id) > 9223372036854775807n) {
      setError("Import ID phải là số nguyên dương hợp lệ.");
      return;
    }
    setImportId(id);
    setStat(null);
    setJob(null);
    setUpdatedAt(null);
    setError("");
    setNotice("");
    setReload(value => value + 1);
  }

  const actionsDisabled = !!busy || loading || !!error;
  return <div className="space-y-6">
    <section className="panel">
      <h2 className="text-lg font-semibold">Import điện thoại</h2>
      <p className="mt-1 mb-6 text-[var(--color-text-secondary)]">Tải file CSV để tạo mới, cập nhật hoặc nhập thêm tồn kho điện thoại.</p>
      <form onSubmit={upload} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">File CSV
            <input className="table-input w-full" type="file" accept=".csv,text/csv" required disabled={!!busy} onChange={event => setFile(event.target.files?.[0] || null)} />
          </label>
          <label className="flex flex-col gap-2">Chế độ import
            <select className="table-input" value={mode} disabled={!!busy} onChange={event => setMode(event.target.value)}>
              <option value="CREATE">CREATE — Tạo mới</option>
              <option value="UPDATE">UPDATE — Cập nhật</option>
              <option value="RESTOCK">RESTOCK — Nhập thêm tồn kho</option>
            </select>
          </label>
        </div>
        <button className="action-button" type="submit" disabled={!!busy || !file}>{busy === "upload" ? "Đang tải lên…" : "Tải lên và import"}</button>
      </form>
    </section>

    {error && <p role="alert" className="text-red-600">{error}</p>}
    {notice && <p role="status" className="text-[var(--color-success-text)]">{notice}</p>}

    <section className="panel" aria-labelledby="import-stat-title">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div><h2 id="import-stat-title" className="text-lg font-semibold">Thống kê import</h2>
          <p className="text-[var(--color-text-secondary)]">Tra cứu import đã có hoặc theo dõi file vừa tải lên.</p>
        </div>
        <form onSubmit={findImport} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">Import ID
            <input className="table-input w-44" inputMode="numeric" required value={lookup} disabled={!!busy} onChange={event => setLookup(event.target.value)} placeholder="Ví dụ: 123" />
          </label>
          <button className="action-button" disabled={!!busy}>Tra cứu</button>
          <button type="button" className="action-button" disabled={!!busy || loading || !importId} onClick={() => { setError(""); setReload(value => value + 1); }}>Tải lại</button>
        </form>
      </div>
      {importId && <p className="mb-3 text-sm">Import #{importId}{job != null && ` · Job execution #${job}`}</p>}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Import ID</th><th>Mode</th><th>Trạng thái</th><th>Tổng dòng</th><th>Hợp lệ</th><th>Lỗi</th></tr></thead>
          <tbody>{stat ? <tr>
            <td>{importId}</td><td>{stat.mode}</td>
            <td><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `var(--color-${statusColors[stat.status] || "user"}-bg)`, color: `var(--color-${statusColors[stat.status] || "user"}-text)` }}>{stat.status}</span></td>
            <td>{stat.total_count}</td><td>{stat.valid_count}</td><td>{stat.fail_count}</td>
          </tr> : <tr><td colSpan={6} className="text-center text-[var(--color-text-secondary)]">{loading ? "Đang tải thống kê…" : "Chưa có thống kê. Tải file hoặc nhập Import ID để tra cứu."}</td></tr>}</tbody>
        </table>
      </div>
      {stat && <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]" role="status">
          {loading ? "Đang cập nhật…" : updatedAt ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN")}. ` : ""}
          {running.has(stat.status) && !error && "Tự cập nhật mỗi 3 giây khi job đang chạy."}
        </p>
        <div className="flex gap-2">
          <button className="action-button" disabled={actionsDisabled || stat.status !== "READY"} onClick={() => submit("validate")}>{busy === "validate" ? "Đang gửi…" : "Validate"}</button>
          <button className="action-button" disabled={actionsDisabled || !["READY", "VALIDATED"].includes(stat.status)} onClick={() => submit("approve")}>{busy === "approve" ? "Đang gửi…" : "Approve"}</button>
        </div>
      </div>}
      <p className="mt-4 text-xs text-[var(--color-text-secondary)]">Validate khi READY. Approve khi READY hoặc VALIDATED. DONE và FAILED là trạng thái kết thúc.</p>
    </section>
  </div>;
}
