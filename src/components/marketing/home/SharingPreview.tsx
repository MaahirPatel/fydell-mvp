"use client";

import { useState } from "react";
import { Eye, Lock } from "lucide-react";
import { DEMO_CANDIDATE, DEMO_LABEL } from "@/lib/marketing/demo-fixture";

type View = "owner" | "recipient";

const ITEMS = [
  { label: "receipts-service", detail: "Python · 2 findings · contribution statement", shared: true, kind: "project" },
  { label: "ledger-cli", detail: "Go · structure only, not analyzed", shared: false, kind: "project" },
  { label: "retry-safe-jobs v0.3", detail: "Simulation · 4 of 5 tests passed", shared: true, kind: "simulation" },
  { label: "Role suggestion: Backend", detail: "Supported by 3 findings · gaps listed", shared: true, kind: "role" },
  { label: "Email address", detail: "Contact details", shared: false, kind: "contact" },
] as const;

const DOT: Record<(typeof ITEMS)[number]["kind"], string> = {
  project: "bg-[var(--brand-teal)]",
  simulation: "bg-[var(--brand-violet)]",
  role: "bg-[var(--text-primary)]",
  contact: "bg-[var(--text-tertiary)]",
};

export default function SharingPreview() {
  const [view, setView] = useState<View>("owner");
  const visible = view === "owner" ? ITEMS : ITEMS.filter((i) => i.shared);

  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-float)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
        <div role="group" aria-label="Preview as" className="inline-flex rounded-full bg-[var(--surface-deep)] p-1">
          {(
            [
              ["owner", "Your passport"],
              ["recipient", "What Employer A sees"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`h-8 rounded-full px-3 text-app-meta font-medium transition-colors duration-150 ${
                view === key ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-app-meta text-[var(--text-tertiary)]">{DEMO_LABEL}</span>
      </div>

      <div className="px-4 pb-2 pt-4">
        <p className="text-app-body font-medium text-[var(--text-primary)]">{DEMO_CANDIDATE.name}</p>
        <p className="text-app-meta text-[var(--text-secondary)]">
          {view === "owner" ? "Everything in your record. You decide what leaves it." : "Shared by the candidate · revocable at any time"}
        </p>
      </div>

      <ul className="divide-y divide-[var(--border-subtle)] px-4" aria-live="polite">
        {visible.map((item) => (
          <li key={item.label} className="flex items-center gap-3 py-3">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${DOT[item.kind]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-app-body text-[var(--text-primary)]">{item.label}</span>
              <span className="block truncate text-app-meta text-[var(--text-tertiary)]">{item.detail}</span>
            </span>
            {view === "owner" ? (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-app-caption font-medium ${
                  item.shared ? "bg-[var(--field-teal)] text-[var(--ink-teal)]" : "bg-[var(--surface-selected)] text-[var(--text-secondary)]"
                }`}
              >
                {item.shared ? <Eye className="h-3 w-3" aria-hidden /> : <Lock className="h-3 w-3" aria-hidden />}
                {item.shared ? "Shared" : "Private"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-app-meta leading-[1.5] text-[var(--text-secondary)]">
        {view === "owner"
          ? "Employer notes and hiring decisions never enter your record."
          : "Private projects and contact details are not included in this view."}
      </p>
    </div>
  );
}
