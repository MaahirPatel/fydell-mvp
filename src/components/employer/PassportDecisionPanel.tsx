"use client";

import { useState } from "react";

type Decision = "none" | "advance" | "hold" | "decline";
const OPTIONS: Array<{ value: Exclude<Decision, "none">; label: string }> = [
  { value: "advance", label: "Advance to interview" },
  { value: "hold", label: "Hold" },
  { value: "decline", label: "Decline" },
];

export default function PassportDecisionPanel({
  reviewId,
  initialDecision,
  initialNote,
  decidedAt,
}: {
  reviewId: string;
  initialDecision: Decision;
  initialNote: string;
  decidedAt: string | null;
}) {
  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [note, setNote] = useState(initialNote);
  const [savedAt, setSavedAt] = useState<string | null>(decidedAt);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(next: Decision) {
    setStatus("saving");
    const res = await fetch(`/api/employer/passport-reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next, note }),
    });
    if (!res.ok) return setStatus("error");
    setDecision(next);
    setSavedAt(next === "none" ? null : new Date().toISOString());
    setStatus("saved");
  }

  return (
    <section aria-labelledby="decision-heading" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-2)]">
      <h2 id="decision-heading" className="text-app-section font-medium">Team decision</h2>
      <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
        Recorded for your workspace only. Nothing is sent to the candidate, and no interview is scheduled.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={decision === o.value}
            disabled={status === "saving"}
            onClick={() => void save(o.value)}
            className={`h-9 rounded-full px-3.5 text-app-meta font-medium transition-colors duration-150 ${
              decision === o.value
                ? "bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
                : "border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <label htmlFor="private-note" className="mt-5 block text-app-meta font-medium">Private note</label>
      <textarea
        id="private-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={4000}
        rows={4}
        placeholder="What to ask in the interview. Visible to your team, never to the candidate."
        className="platform-input mt-1.5"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void save(decision)}
          disabled={status === "saving"}
          className="text-app-meta font-medium underline underline-offset-4"
        >
          Save note
        </button>
        <p aria-live="polite" className="text-app-meta text-[var(--text-tertiary)]">
          {status === "saving" && "Saving"}
          {status === "error" && <span className="text-[var(--evidence-counter)]">Could not save. Try again.</span>}
          {(status === "saved" || status === "idle") && savedAt ? `Decision recorded ${new Date(savedAt).toLocaleString()}` : null}
          {(status === "saved" || status === "idle") && !savedAt ? "No decision recorded" : null}
        </p>
      </div>
    </section>
  );
}
