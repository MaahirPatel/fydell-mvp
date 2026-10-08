"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { engFetch } from "@/components/eng/api";

/** Shares the automated report with the candidate, with an optional note. */
export function ReleaseAuthoredReport({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const release = async () => {
    setBusy(true);
    setError(null);
    const res = await engFetch<{ reportId: string }>(`/api/eng/org/attempts/${attemptId}/authored-release`, { body: { note } });
    setBusy(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="grid gap-3">
      <label htmlFor="authored-release-note" className="text-app-body font-medium text-[var(--text-primary)]">
        Note to the candidate (optional)
      </label>
      <textarea
        id="authored-release-note"
        rows={3}
        maxLength={2000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-app-body text-[var(--text-primary)]"
      />
      <p className="text-app-meta text-[var(--text-secondary)]">
        The candidate sees which acceptance criteria the tests confirmed, public test names, and your note. Protected test names, runner output and the reference solution are not shared.
      </p>
      {error ? (
        <p role="alert" className="text-app-body text-[var(--fy-red-ink)]">
          {error}
        </p>
      ) : null}
      <div>
        <Button onClick={release} loading={busy}>
          Release report to candidate
        </Button>
      </div>
    </div>
  );
}
