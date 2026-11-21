import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-6 h-12 w-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center">
          <ShieldOff size={20} className="text-[var(--color-text-secondary)]" />
        </div>

        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          Access restricted
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Your account role doesn't have permission to view this page.
          If you believe this is a mistake, contact an administrator.
        </p>

        <Link
          to="/products"
          className="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
        >
          Back to Product
        </Link>
      </div>
    </div>
  );
}