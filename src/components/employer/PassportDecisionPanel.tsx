"use client";

import { useState } from "react";
import { LocalTime } from "@/components/eng/LocalTime";
import { Button } from "@/components/ui/Button";

type Decision = "none" | "advance" | "hold" | "decline";
const OPTIONS: Array<{ value: Exclude<Decision, "none">; label: string }> = [
  { value: "advance", label: "Advance to interview" },
  { value: "hold", label: "Hold" },
  { value: "decline", label: "Decline" },
];

type SavedState = { decision: Decision; privateNote: string; decidedAt: string | null; version: string };

function savedStateOf(value: unknown): SavedState | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const decision = ["none", "advance", "hold", "decline"].find((d) => d === v.decision) as Decision | undefined;
  if (!decision || typeof v.privateNote !== "string" || typeof v.version !== "string") return null;
  return { decision, privateNote: v.privateNote, decidedAt: typeof v.decidedAt === "string" ? v.decidedAt : null, version: v.version };
}

export default function PassportDecisionPanel({
  reviewId,
  endpoint,
  initialDecision,
  initialNote,
  decidedAt,
  version,
}: {
  reviewId: string;
  /** Defaults to the Passport review; applications without a review save to their own decision. */
  endpoint?: string;
  initialDecision: Decision;
  initialNote: string;
  decidedAt: string | null;
  version: string | null;
}) {
  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [note, setNote] = useState(initialNote);
  const [savedAt, setSavedAt] = useState<string | null>(decidedAt);
  const [savedVersion, setSavedVersion] = useState<string | null>(version);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [conflict, setConflict] = useState<{ theirs: SavedState; yourNote: string } | null>(null);

  async function save(next: Decision) {
    setStatus("saving");
    const res = await fetch(endpoint ?? `/api/employer/passport-reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: next, note, expectedVersion: savedVersion }),
    });
    const payload: unknown = await res.json().catch(() => null);
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (res.status === 409) {
      const theirs = savedStateOf(body.current);
      if (theirs) {
        setConflict({ theirs, yourNote: note });
        setDecision(theirs.decision);
        setNote(theirs.privateNote);
        setSavedAt(theirs.decidedAt);
        setSavedVersion(theirs.version);
      }
      return setStatus("error");
    }
    const state = savedStateOf(body.state);
    if (!res.ok || !state) return setStatus("error");
    setConflict(null);
    setDecision(state.decision);
    setSavedAt(state.decidedAt);
    setSavedVersion(state.version);
    setStatus("saved");
  }

  return (
    <section aria-labelledby="decision-heading" className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-2)]">
      <h2 id="decision-heading" className="text-app-section font-medium">Team decision</h2>
      <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
        Recorded for your workspace only. Nothing is sent to the candidate, and no interview is scheduled.
      </p>
      {conflict ? (
        <div role="alert" className="mt-4 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-2.5 text-app-meta">
          <p className="text-[var(--text-primary)]">
            A teammate saved a change first. Their decision and note are shown below; nothing of yours was saved.
          </p>
          {conflict.yourNote.trim() && conflict.yourNote !== conflict.theirs.privateNote ? (
            <>
              <p className="mt-2 text-[var(--text-secondary)]">Your unsaved note:</p>
              <p className="mt-1 whitespace-pre-wrap text-[var(--text-body)]">{conflict.yourNote}</p>
              <Button className="mt-2" size="sm" variant="secondary" type="button" onClick={() => setNote(conflict.yourNote)}>
                Use my note instead
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
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
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => void save(decision)}
          disabled={status === "saving"}
        >
          Save note
        </Button>
        <p aria-live="polite" className="text-app-meta text-[var(--text-tertiary)]">
          {status === "saving" && "Saving"}
          {status === "error" && !conflict && <span className="text-[var(--evidence-counter)]">Could not save. Try again.</span>}
          {(status === "saved" || status === "idle" || conflict) && savedAt ? (
            <>
              Decision recorded <LocalTime iso={savedAt} />
            </>
          ) : null}
          {(status === "saved" || status === "idle" || conflict) && !savedAt ? "No decision recorded" : null}
        </p>
      </div>
    </section>
  );
}
