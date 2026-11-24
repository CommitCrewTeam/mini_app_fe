import { useState } from "react";
import PhoneImports from "./PhoneImports";
import PhoneImportList from "./PhoneImportList";

const TABS = [
  { id: "list", label: "Danh sách import" },
  { id: "import", label: "New import" },
];

export default function ImportScreen() {
  const [tab, setTab] = useState("list");
  return <div className="space-y-6">
    <div className="flex gap-2 border-b border-[var(--color-border)] pb-0">
      {TABS.map(({ id, label }) => (
        <button key={id} type="button" aria-pressed={tab === id}
          onClick={() => setTab(id)}
          className={`pb-2 px-1 text-sm font-medium transition-colors ${tab === id ? "text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
          {label}
        </button>
      ))}
    </div>
    {tab === "list" ? <PhoneImportList /> : <PhoneImports />}
  </div>;
}
