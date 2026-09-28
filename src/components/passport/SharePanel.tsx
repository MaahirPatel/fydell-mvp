"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import type { ShareField } from "@/lib/passport/view";

type Share = { id: string; label: string; fields: ShareField[]; createdAt: string; revokedAt: string | null; lastAccessedAt: string | null };

const FIELD_LABEL: Record<ShareField, string> = {
  projects: "Projects and contribution statements",
  evidence: "Source-linked findings",
  roles: "Role suggestions and gaps",
  capabilities: "Demonstrated-in-code summary",
};

export default function SharePanel({ initialShares }: { initialShares: Share[] }) {
  const [shares, setShares] = useState(initialShares);
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<ShareField[]>(["projects", "evidence", "roles", "capabilities"]);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/passport/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, fields }),
    });
    const data = (await res.json()) as { url?: string; shares?: Share[]; error?: string };
    setBusy(false);
    if (!res.ok || !data.url) return setError(data.error ?? "Could not create the link.");
    setCreated(data.url);
    setCopied(false);
    setShares(data.shares ?? shares);
    setLabel("");
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/passport/shares/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { shares?: Share[]; error?: string };
    if (!res.ok) return setError(data.error ?? "Could not revoke the link.");
    setShares(data.shares ?? shares);
  }

  return (
    <section aria-labelledby="sharing-heading" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--shadow-2)]">
      <div className="border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
        <h2 id="sharing-heading" className="text-app-body font-medium">Sharing</h2>
        <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
          Your passport is private. Create a link for one employer; anyone with the link can view the fields you choose until you revoke it.
        </p>
      </div>
      <form onSubmit={create} className="space-y-3 px-5 py-4 sm:px-6">
        <div>
          <label htmlFor="share-label" className="text-app-meta font-medium">Who is this link for?</label>
          <input id="share-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="e.g. Platform team, backend role" className="platform-input mt-1.5" />
        </div>
        <fieldset>
          <legend className="text-app-meta font-medium">Include</legend>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(FIELD_LABEL) as ShareField[]).map((f) => (
              <label key={f} className="flex items-center gap-2 text-app-body">
                <input
                  type="checkbox"
                  checked={fields.includes(f)}
                  disabled={f === "projects"}
                  onChange={() => setFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
                  className="h-4 w-4 accent-[var(--brand-teal)]"
                />
                {FIELD_LABEL[f]}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <p role="alert" className="text-app-meta text-[var(--evidence-counter)]">{error}</p> : null}
        <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--control-solid)] px-4 text-app-body font-medium text-[var(--control-solid-ink)] disabled:opacity-50">
          <Link2 className="h-4 w-4" aria-hidden /> {busy ? "Creating" : "Create share link"}
        </button>
        {created ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-[var(--field-teal)] p-3">
            <code className="min-w-0 flex-1 truncate text-app-meta text-[var(--ink-teal)]">{created}</code>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(created).then(() => setCopied(true))}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-app-meta font-medium"
            >
              {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <p className="w-full text-app-meta text-[var(--ink-teal)]">This is the only time the full link is shown. Fydell stores only a hash of it.</p>
          </div>
        ) : null}
      </form>
      {shares.length ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
          {shares.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
              <span className="min-w-0 flex-1">
                <span className="block text-app-body font-medium">{s.label || "Untitled link"}</span>
                <span className="block text-app-meta text-[var(--text-tertiary)]">
                  Created {new Date(s.createdAt).toLocaleDateString()}
                  {s.lastAccessedAt ? ` · last opened ${new Date(s.lastAccessedAt).toLocaleDateString()}` : " · not opened yet"}
                </span>
              </span>
              {s.revokedAt ? (
                <span className="badge badge-neutral">Revoked</span>
              ) : (
                <button type="button" onClick={() => void revoke(s.id)} className="text-app-meta font-medium text-[var(--evidence-counter)] underline underline-offset-4">
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
