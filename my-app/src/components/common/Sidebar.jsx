import { NavLink } from "react-router-dom";
import { ShieldCheck, Package, LogOut, User, KeyRound, Monitor, Upload } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { useState } from "react";
const items = [
  { to: "/", label: "Import điện thoại", icon: Upload },
  { to: "/account", label: "My account", icon: User },
  { to: "/change-password", label: "Change password", icon: KeyRound },
  { to: "/tokens", label: "Quản lý token", icon: Monitor, permission: "tokens:read" },
  { to: "/authorization", label: "Authorization", icon: ShieldCheck, adminOnly: true },
  { to: "/products", label: "Product", icon: Package, permission: "product:read" },
];
export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    const result = await logout();
    if (!result.success) setLogoutError(result.message);
    setLoggingOut(false);
  }
  return <>
    {isOpen && <button aria-label="Close navigation" className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />}
    <aside className={`fixed md:static inset-y-0 left-0 z-50 w-[248px] shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col transition-transform ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <div className="h-16 flex items-center px-6 border-b border-[var(--color-border)] font-bold text-lg">AuthPortal</div>
      <nav className="flex-1 p-3 space-y-2" aria-label="Main navigation">
        {items.filter(item => (!item.adminOnly || user?.role === "admin") && (!item.permission || can(item.permission))).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl ${isActive ? "bg-[var(--color-accent)] text-white" : "hover:bg-[var(--color-bg)]"}`}><Icon size={18} />{label}</NavLink>)}
      </nav>
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="font-medium truncate">{user?.username}</p>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{user?.role?.toUpperCase()}</p>
        <button onClick={handleLogout} disabled={loggingOut} className="flex items-center gap-2 mt-4 p-2"><LogOut size={16} />{loggingOut ? "Logging out..." : "Log out"}</button>
        {logoutError && <p role="alert" className="text-sm text-red-600">{logoutError}</p>}
      </div>
    </aside>
  </>;
}
