import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { accountApi } from "../../api/client";

function validateRegistration(username, password, confirmPassword) {
  if (!/^[a-zA-Z][a-zA-Z0-9]{1,29}$/.test(username)) {
    return "Username must be 2–30 letters or numbers and start with a letter.";
  }
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (new TextEncoder().encode(password).length > 72) return "Password must not exceed 72 UTF-8 bytes.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
}

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  async function handleRegister(event) {
    event.preventDefault();
    if (submitting.current) return;
    const normalizedUsername = username.trim();
    const validationError = validateRegistration(normalizedUsername, password, confirmPassword);
    setError(validationError);
    if (validationError) return;

    submitting.current = true;
    setBusy(true);
    try {
      await accountApi.register(normalizedUsername, password, role);
      navigate("/login", {
        replace: true,
        state: { message: "Account created. Sign in with your new account." },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <form onSubmit={handleRegister} className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 space-y-5 shadow-sm">
      <h1 className="text-2xl font-bold">Create account</h1>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">Username
        <input className="table-input w-full mt-2" autoComplete="username" required maxLength={30}
          aria-describedby="username-help" disabled={busy} value={username} onChange={event => setUsername(event.target.value)} />
      </label>
      <p id="username-help" className="text-sm text-slate-500">2–30 letters or numbers, starting with a letter.</p>
      <label className="block">Password
        <input className="table-input w-full mt-2" type="password" autoComplete="new-password" required minLength={8}
          disabled={busy} value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      <label className="block">Confirm password
        <input className="table-input w-full mt-2" type="password" autoComplete="new-password" required minLength={8}
          disabled={busy} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
      </label>
      <label className="block">Role
        <select className="table-input w-full mt-2" required disabled={busy}
          value={role} onChange={event => setRole(event.target.value)}>
          <option value="USER">USER</option>
          <option value="SUPERVISOR">SUPERVISOR</option>
        </select>
      </label>
      <button className="action-button w-full" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
      <p className="text-sm text-center">Already have an account? <Link className="underline" to="/login">Sign in</Link></p>
    </form>
  </main>;
}
