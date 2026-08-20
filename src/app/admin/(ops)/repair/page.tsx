"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const ACTIONS = [
  { id: "approve_organization", label: "Approve organization", fields: ["organizationId"] },
  { id: "connect_user_to_org", label: "Connect user to org", fields: ["userId", "organizationId"] },
  { id: "extend_invitation", label: "Extend invitation", fields: ["invitationId", "days"] },
  { id: "revoke_invitation", label: "Revoke invitation", fields: ["invitationId"] },
  { id: "cancel_session", label: "Cancel unsubmitted session", fields: ["sessionId", "reason"] },
  { id: "retry_email", label: "Retry failed email", fields: ["outboxId"] },
  { id: "requeue_report", label: "Requeue report review", fields: ["reportId"] },
  { id: "explain_setup_required", label: "Explain setup-required routing", fields: ["userId"] },
];

export default function AdminRepairPage() {
  const [action, setAction] = useState(ACTIONS[0].id);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setResult("");
    const res = await fetch("/api/admin/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...fields }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Failed");
    else setResult(JSON.stringify(data, null, 2));
  }

  const meta = ACTIONS.find((a) => a.id === action)!;

  return (
    <div>
      <h1 className="text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
        Repair console
      </h1>
      <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
        Audited recovery tools for pilot edge cases. Never assigns passwords.
      </p>
      <div className="mt-8 max-w-xl space-y-3">
        <select
          className="platform-input"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setFields({});
          }}
        >
          {ACTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        {meta.fields.map((f) => (
          <label key={f} className="block text-[13px] font-medium text-[var(--text-primary)]">
            {f.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}
            <input
              className="platform-input mt-1.5"
              value={fields[f] || ""}
              onChange={(e) => setFields((prev) => ({ ...prev, [f]: e.target.value }))}
            />
          </label>
        ))}
        <Button type="button" variant="primary" size="cta" onClick={run}>
          Run repair
        </Button>
        {error ? <p className="text-[13px] text-[var(--fydell-risk)]">{error}</p> : null}
        {result ? (
          <pre className="overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-band)] p-3 text-[11px] text-[var(--text-secondary)]">
            {result}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
