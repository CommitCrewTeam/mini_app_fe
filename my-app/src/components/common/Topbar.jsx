import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AccessTokenCountdown } from "./TokenSessionStatus";
export default function Topbar({ onMenuClick }) {
  const { pathname: currentPath } = useLocation();
  const pathname = currentPath === "/" ? "/phone-imports" : currentPath;
  return <header className="h-16 flex items-center gap-3 px-4 md:px-6 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
    <button onClick={onMenuClick} aria-label="Open navigation menu" className="md:hidden p-2"><Menu size={20} /></button>
    <h1 className="text-xl font-semibold">{{ "/phone-imports": "Import điện thoại", "/authorization": "Authorization", "/account": "My account", "/change-password": "Change password", "/tokens": "Quản lý token" }[pathname] || "Product"}</h1>
    <AccessTokenCountdown />
  </header>;
}
