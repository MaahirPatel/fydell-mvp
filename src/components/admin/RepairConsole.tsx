"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export type RepairActionOption = { id: string; label: string; fields: readonly string[] };

export default function RepairConsole({ actions }: { actions: readonly RepairActionOption[] }) {
  const [action, setAction] = useState(actions[0]?.id ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    setResult("");
    try {
      const res = await fetch("/api/admin/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...fields }),
      });
      const data: unknown = await res.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (!res.ok) setError(typeof record.error === "string" ? record.error : "The repair failed.");
      else setResult(JSON.stringify(record, null, 2));
    } catch {
      setError("The request did not reach the server. Check the record before retrying.");
    } finally {
      setRunning(false);
    }
  }

  const meta = actions.find((a) => a.id === action);
  if (!meta) {
    return <p className="mt-8 text-app-body text-[var(--text-secondary)]">Your role has no repair actions.</p>;
  }

  return (
    <div className="mt-8 max-w-xl space-y-3">
      <select
        className="platform-input"
        value={action}
        onChange={(e) => {
          setAction(e.target.value);
          setFields({});
        }}
      >
        {actions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
      {meta.fields.map((f) => (
        <label key={f} className="block text-app-meta font-medium text-[var(--text-primary)]">
          {f.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}
          <input
            className="platform-input mt-1.5"
            value={fields[f] || ""}
            onChange={(e) => setFields((prev) => ({ ...prev, [f]: e.target.value }))}
          />
        </label>
      ))}
      <Button type="button" variant="primary" size="cta" onClick={run} disabled={running}>
        {running ? "Running…" : "Run repair"}
      </Button>
      {error ? <p className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
      {result ? (
        <pre className="overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-band)] p-3 text-app-caption text-[var(--text-secondary)]">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
