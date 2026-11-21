import { useEffect, useRef, useState } from "react";
import { productApi } from "../api/products";
import { usePermissions } from "../context/PermissionContext";

const validProduct = product => product.name.trim().length > 0 && product.name.length <= 255
  && String(product.quantity).trim() !== "" && Number.isInteger(Number(product.quantity))
  && Number(product.quantity) >= 0 && Number(product.quantity) <= 2147483647;
const payload = product => ({ name: product.name.trim(), quantity: Number(product.quantity) });

export default function Products() {
  const { can } = usePermissions();
  const canWrite = can("product:write");
  const [showCreate, setShowCreate] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", quantity: "" });
  const [products, setProducts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const disabled = loading || loadFailed || busy || !canWrite;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), 15000);
    setLoading(true);
    setLoadFailed(false);
    setError("");
    productApi.list(controller.signal).then(data => {
      if (!controller.signal.aborted) setProducts(data);
    }).catch(error => {
      if (error.name !== "AbortError") {
        setError(error.message);
        setLoadFailed(true);
      }
    }).finally(() => {
      clearTimeout(timeout);
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setLoading(false);
    });
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [reload]);

  async function mutate(action) {
    if (inFlight.current || loading || loadFailed || !canWrite) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try { await action(); }
    catch (error) { setError(error.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function clearDraft(id) {
    setDrafts(current => { const next = { ...current }; delete next[id]; return next; });
  }
  function editOrSave(product) {
    if (disabled) return;
    setError("");
    const draft = drafts[product.productId];
    if (!draft) { setDrafts({ ...drafts, [product.productId]: { ...product } }); return; }
    if (!validProduct(draft)) {
      setError("Name must contain 1-255 characters. Quantity must be a whole number from 0 to 2147483647."); return;
    }
    mutate(async () => {
      const updated = await productApi.update(product.productId, payload(draft));
      setProducts(current => current.map(p => p.productId === updated.productId ? updated : p));
      clearDraft(product.productId);
    });
  }
  function remove(product) {
    if (disabled || !window.confirm(`Delete ${product.name} (${product.productId})?`)) return;
    mutate(async () => {
      await productApi.remove(product.productId);
      setProducts(current => current.filter(p => p.productId !== product.productId));
      clearDraft(product.productId);
    });
  }
  function createProduct(event) {
    event.preventDefault();
    if (disabled) return;
    if (!validProduct(newProduct)) {
      setError("Name must contain 1-255 characters. Quantity must be a whole number from 0 to 2147483647."); return;
    }
    mutate(async () => {
      const created = await productApi.create(payload(newProduct));
      setProducts(current => [...current, created]);
      setNewProduct({ name: "", quantity: "" });
      setShowCreate(false);
    });
  }
  function resetProducts() {
    if (disabled || !window.confirm("Reset all products? This deletes the current list, including added products and edits, and restores the 5 sample products. Unsaved changes will be discarded.")) return;
    mutate(async () => {
      const restored = await productApi.reset();
      setProducts(restored);
      setDrafts({});
      setNewProduct({ name: "", quantity: "" });
      setShowCreate(false);
    });
  }
  function change(id, field, value) { setDrafts(current => ({ ...current, [id]: { ...current[id], [field]: value } })); }
  return <section className="panel">
    <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
      Quyền product:read cho phép xem; product:write cho phép thêm, sửa, xóa và khôi phục sản phẩm.
    </p>
    <div className="flex flex-wrap justify-end gap-2 mb-4">
      <button disabled={disabled} className="action-button" onClick={() => { setShowCreate(true); setError(""); }}>Create product</button>
      <button disabled={disabled} className="action-button text-red-600" onClick={resetProducts}>Reset products</button>
    </div>
    {showCreate && <form onSubmit={createProduct} className="mb-6 p-4 border border-[var(--color-border)] rounded-lg space-y-4">
      <h2 className="font-semibold">Create product</h2>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 flex-1 min-w-48">Name
          <input disabled={disabled} autoFocus required maxLength={255} className="table-input" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">Quantity
          <input disabled={disabled} required type="number" min="0" max="2147483647" step="1" className="table-input w-40" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} />
        </label>
      </div>
      <div className="flex gap-2">
        <button disabled={disabled} type="submit" className="action-button">Create</button>
        <button disabled={busy} type="button" className="action-button" onClick={() => { setShowCreate(false); setNewProduct({ name: "", quantity: "" }); setError(""); }}>Cancel</button>
      </div>
    </form>}
    {error && <p role="alert" className="mb-4 text-red-600">{error}</p>}
    {loading && <p role="status" className="mb-4">Loading products...</p>}
    {busy && <p role="status" className="mb-4">Saving changes...</p>}
    {loadFailed && <button className="action-button mb-4" onClick={() => setReload(value => value + 1)}>Retry</button>}
    <div className="overflow-x-auto"><table className="data-table">
      <thead><tr><th>Product ID</th><th>Name</th><th>Quantity</th><th className="text-right">Actions</th></tr></thead>
      <tbody>{products.map(product => {
        const draft = drafts[product.productId];
        const editing = !!draft;
        return <tr key={product.productId}>
          <td>{product.productId}</td>
          <td>{editing ? <input disabled={disabled} className="table-input" maxLength={255} aria-label={`Name ${product.productId}`} value={draft.name} onChange={e => change(product.productId, "name", e.target.value)} /> : product.name}</td>
          <td>{editing ? <input disabled={disabled} className="table-input w-28" type="number" min="0" max="2147483647" step="1" aria-label={`Quantity ${product.productId}`} value={draft.quantity} onChange={e => change(product.productId, "quantity", e.target.value)} /> : product.quantity}</td>
          <td><div className="flex justify-end gap-2">
            <button className="action-button" disabled={disabled} onClick={() => editOrSave(product)}>{editing ? "Save" : "Edit"}</button>
            <button className="action-button text-red-600" disabled={disabled} onClick={() => remove(product)}>Delete</button>
          </div></td>
        </tr>;
      })}{!loading && !loadFailed && products.length === 0 && <tr><td colSpan={4} className="text-center">No products.</td></tr>}</tbody>
    </table></div>
  </section>;
}
