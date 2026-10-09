"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Field = { name: string; label: string; options?: readonly string[]; multiline?: boolean; defaultValue?: string };
export type CaseFormSpec = { action: string; title: string; description: string; fields: readonly Field[]; idempotent?: boolean };

function newKey(): string {
  return `adm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function CaseForm({ spec }: { spec: CaseFormSpec }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(spec.fields.map((f) => [f.name, f.defaultValue ?? f.options?.[0] ?? ""])),
  );
  const [key, setKey] = useState(newKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, unknown> = { action: spec.action, ...values };
      if (spec.idempotent) payload.idempotencyKey = key;
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (!res.ok) {
        setError(typeof record.error === "string" ? record.error : "The action failed.");
        return;
      }
      setResult(JSON.stringify(record.result ?? record, null, 2));
      setKey(newKey());
      router.refresh();
    } catch {
      setError("The request did not reach the server. Your earlier attempt is safe to repeat: it carries the same key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
      <div>
        <h3 className="text-app-body font-medium text-[var(--text-primary)]">{spec.title}</h3>
        <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{spec.description}</p>
      </div>
      {spec.fields.map((f) => (
        <label key={f.name} className="block text-app-meta font-medium text-[var(--text-primary)]">
          {f.label}
          {f.options ? (
            <select
              className="platform-input mt-1.5"
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            >
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : f.multiline ? (
            <textarea
              className="platform-input mt-1.5 min-h-[72px]"
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          ) : (
            <input
              className="platform-input mt-1.5"
              value={values[f.name] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          )}
        </label>
      ))}
      <Button type="submit" variant="primary" size="cta" disabled={busy}>
        {busy ? "Working…" : spec.title}
      </Button>
      {error ? <p className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
      {result ? (
        <pre className="overflow-auto rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-band)] p-3 text-app-caption text-[var(--text-secondary)]">
          {result}
        </pre>
      ) : null}
    </form>
  );
}

export default function CasesConsole({ forms }: { forms: readonly CaseFormSpec[] }) {
  if (forms.length === 0) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {forms.map((spec) => (
        <CaseForm key={spec.action} spec={spec} />
      ))}
    </div>
  );
}
