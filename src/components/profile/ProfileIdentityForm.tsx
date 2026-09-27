"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EngineerProfile } from "@/lib/profile/types";

const inputClass =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-canvas)] px-3 py-2 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--text-tertiary)] focus:outline-none";

export default function ProfileIdentityForm({ initial }: { initial: EngineerProfile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [headline, setHeadline] = useState(initial.headline);
  const [role, setRole] = useState(initial.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, headline, role }),
      });
      const data = (await res.json()) as { profile?: EngineerProfile; error?: string };
      if (!res.ok || !data.profile) {
        setError(data.error ?? "Could not save your profile.");
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch {
      setError("Fydell could not be reached. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="profile-display-name" className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
          Display name
        </label>
        <input
          id="profile-display-name"
          className={inputClass}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          placeholder="Ada Lovelace"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="profile-headline" className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
          Headline
        </label>
        <input
          id="profile-headline"
          className={inputClass}
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={160}
          placeholder="Backend engineer who ships reliable systems"
        />
      </div>
      <div>
        <label htmlFor="profile-role" className="mb-1 block text-[13px] font-medium text-[var(--text-secondary)]">
          Role
        </label>
        <input
          id="profile-role"
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          maxLength={120}
          placeholder="Senior Backend Engineer"
          autoComplete="organization-title"
        />
      </div>
      {error ? <p className="text-[13px] text-[var(--status-attention-ink)]">{error}</p> : null}
      {saved ? <p className="text-[13px] text-[var(--text-secondary)]">Saved.</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-[8px] bg-[var(--text-primary)] px-4 py-2 text-[13.5px] font-medium text-[var(--surface-canvas)] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
