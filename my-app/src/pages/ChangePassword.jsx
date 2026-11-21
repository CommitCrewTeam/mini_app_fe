import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { accountApi } from "../api/client";
export default function ChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError("");
    if (values.newPassword !== values.confirmPassword) { setError("Passwords do not match."); return; }
    if (new TextEncoder().encode(values.newPassword).length > 72) { setError("Password must not exceed 72 UTF-8 bytes."); return; }
    setBusy(true);
    try {
      await accountApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      const result = await logout();
      if (!result.success) throw new Error(`Password changed. Sign out failed: ${result.message}`);
      navigate("/login", { replace: true, state: { message: "Password changed. Sign in with your new password." } });
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <section className="panel max-w-xl">
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-lg font-semibold">Change password</h2>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {[["currentPassword", "Current password"], ["newPassword", "New password"], ["confirmPassword", "Confirm new password"]].map(([key, label]) =>
        <label key={key} className="block">{label}<input className="table-input w-full mt-2" type="password" required
          autoComplete={key === "currentPassword" ? "current-password" : "new-password"}
          minLength={key === "currentPassword" ? undefined : 8} maxLength={72} disabled={busy}
          value={values[key]} onChange={e => setValues({ ...values, [key]: e.target.value })} /></label>)}
      <p className="text-sm text-slate-500">Use at least 8 characters. You will sign in again after changing your password.</p>
      <button className="action-button" disabled={busy}>{busy ? "Saving..." : "Change password"}</button>
    </form>
  </section>;
}
