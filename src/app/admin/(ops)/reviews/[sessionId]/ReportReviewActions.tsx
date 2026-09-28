"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "pending" | "released" | "changes_requested";

const STATUS_COPY: Record<Status, string> = {
  pending: "Waiting for review. The employer cannot see this report yet.",
  changes_requested: "Changes requested. The employer cannot see this report yet.",
  released: "Released. The employer can see this report.",
};

export default function ReportReviewActions({
  sessionId,
  status,
  evaluationState,
}: {
  sessionId: string;
  status: Status;
  evaluationState: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "release" | "request_changes" | "reopen") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/report-reviews/${sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the decision");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the decision");
    } finally {
      setBusy(false);
    }
  }

  const cleanEvaluation = evaluationState === "completed";
  return (
    <section className="rounded-[var(--radius-panel)] border border-[var(--border-default)] px-5 py-4" aria-labelledby="review-h">
      <h2 id="review-h" className="text-app-section font-medium">
        Release decision
      </h2>
      <p className="mt-1 text-app-meta text-[var(--text-secondary)]" role="status">
        {STATUS_COPY[status]}
      </p>
      {!cleanEvaluation ? (
        <p className="mt-2 text-app-meta text-[var(--status-attention-ink)]">
          The code evaluation is &ldquo;{evaluationState.replace(/_/g, " ")}&rdquo;. Releasing requires a note explaining what
          the employer can rely on.
        </p>
      ) : null}
      <label htmlFor="review-notes" className="mt-3 block text-app-meta font-medium text-[var(--text-secondary)]">
        Reviewer note (kept in the review history; not shown to the candidate)
      </label>
      <textarea
        id="review-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        maxLength={4000}
        className="mt-1 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-transparent px-3 py-2 text-app-body"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "released" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => act("release")}
              className="rounded-full bg-[var(--text-primary)] px-4 py-2 text-app-meta font-medium text-[var(--surface-base,#fff)] disabled:opacity-60"
            >
              Release to employer
            </button>
            {status === "pending" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => act("request_changes")}
                className="rounded-full border border-[var(--border-default)] px-4 py-2 text-app-meta font-medium disabled:opacity-60"
              >
                Request changes
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => act("reopen")}
            className="rounded-full border border-[var(--border-default)] px-4 py-2 text-app-meta font-medium disabled:opacity-60"
          >
            Reopen for correction
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-2 text-app-meta text-[var(--status-attention-ink)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
