import { useAuth } from "../context/AuthContext";
export default function Account() {
  const { user } = useAuth();
  return <section className="panel space-y-4">
    <h2 className="text-lg font-semibold">Account information</h2>
    <dl className="space-y-3">
      <div><dt className="text-slate-500">Username</dt><dd>{user.username}</dd></div>
      <div><dt className="text-slate-500">Account ID</dt><dd className="break-all">{user.id}</dd></div>
      <div><dt className="text-slate-500">Role</dt><dd>{user.role.toUpperCase()}</dd></div>
    </dl>
  </section>;
}
