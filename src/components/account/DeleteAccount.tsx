"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Input } from "@/components/ui/Field";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function DeleteAccount({ openApplications, activeShares }: { openApplications: number; activeShares: number }) {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = phrase.trim().toLowerCase() === "delete my account";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: phrase }) });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Your account was not deleted. Try again.");
        setBusy(false);
        return;
      }
      await createBrowserSupabaseClient().auth.signOut().catch(() => undefined);
      window.location.assign("/account-deleted");
    } catch {
      setError("Couldn't reach Fydell. Your account was not deleted.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-[60ch] gap-4">
      <ul className="space-y-1.5 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        <li className="list-inside list-disc">Your Passport, projects, Builder Reports, notes and profile are erased.</li>
        <li className="list-inside list-disc">
          {activeShares ? `${activeShares} active share link${activeShares === 1 ? " stops" : "s stop"} working.` : "Any share links stop working."}
        </li>
        <li className="list-inside list-disc">
          {openApplications ? `${openApplications} open application${openApplications === 1 ? " is" : "s are"} withdrawn.` : "Open applications are withdrawn."}
        </li>
        <li className="list-inside list-disc">Employers keep decisions and notes they already recorded, and anything they downloaded.</li>
      </ul>
      <Field label="Type “delete my account” to confirm" htmlFor="delete-confirm">
        <Input id="delete-confirm" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" spellCheck={false} />
      </Field>
      <div>
        <Button type="submit" variant="destructive" size="sm" disabled={!ready} loading={busy}>
          Delete my account
        </Button>
      </div>
      <FormError>{error}</FormError>
    </form>
  );
}
