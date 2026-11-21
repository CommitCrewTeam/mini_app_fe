import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
export default function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { state } = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (isLoading) return <p role="status">Loading...</p>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    const result = await login(username, password);
    if (!result.success) setError(result.message);
    setBusy(false);
  }
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 space-y-5 shadow-sm">
      <h1 className="text-2xl font-bold">Sign in</h1>
      {state?.message && <p role="status" className="text-green-700">{state.message}</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">Username<input className="table-input w-full mt-2" autoComplete="username" required maxLength={100} value={username} onChange={e => setUsername(e.target.value)} /></label>
      <label className="block">Password<input className="table-input w-full mt-2" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button className="action-button w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      <p className="text-sm text-center">Don't have an account? <Link className="underline" to="/register">Create account</Link></p>
    </form>
  </main>;
}
