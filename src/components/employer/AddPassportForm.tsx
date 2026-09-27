"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddPassportForm() {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/employer/passport-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareUrl, roleTitle }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.id) return setError(data.error ?? "Could not add this passport.");
    router.push(`/app/employer/passports/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-end">
      <div>
        <label htmlFor="share-url" className="text-app-meta font-medium text-[var(--text-primary)]">Passport link from the candidate</label>
        <input id="share-url" value={shareUrl} onChange={(e) => setShareUrl(e.target.value)} placeholder="https://…/p/…" className="platform-input mt-1.5 font-mono text-[13px]" aria-invalid={error ? true : undefined} />
      </div>
      <div>
        <label htmlFor="role-title" className="text-app-meta font-medium text-[var(--text-primary)]">Role</label>
        <input id="role-title" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} maxLength={120} placeholder="Backend Engineer" className="platform-input mt-1.5" />
      </div>
      <button type="submit" disabled={busy || !shareUrl.trim()} className="h-[42px] rounded-[8px] bg-[var(--control-solid)] px-4 text-[13.5px] font-medium text-[var(--control-solid-ink)] disabled:opacity-50">
        {busy ? "Adding" : "Add to review"}
      </button>
      {error ? <p role="alert" className="text-[13px] text-[var(--evidence-counter)] md:col-span-3">{error}</p> : null}
    </form>
  );
}
