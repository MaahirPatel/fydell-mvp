"use client";

import { useState } from "react";

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
      <p className="mt-2 text-[14px] text-white/55">
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
          <input
            key={f}
            className="platform-input"
            placeholder={f}
            value={fields[f] || ""}
            onChange={(e) => setFields((prev) => ({ ...prev, [f]: e.target.value }))}
          />
        ))}
        <button
          type="button"
          onClick={run}
          className="inline-flex h-10 items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C]"
        >
          Run repair
        </button>
        {error ? <p className="text-[13px] text-[#fda4b0]">{error}</p> : null}
        {result ? (
          <pre className="overflow-auto rounded-[12px] border border-white/10 bg-black/30 p-3 text-[11px] text-white/70">
            {result}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
