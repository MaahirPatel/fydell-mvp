"use client";

import { useState } from "react";

const EVIDENCE_OPTIONS = [
  "Objective correctness",
  "Reasoning",
  "Questions asked",
  "Communication",
  "AI usage",
  "Final deliverable",
  "Other",
];

export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const [realism, setRealism] = useState<number | null>(null);
  const [reveals, setReveals] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [unrealistic, setUnrealistic] = useState("");
  const [additions, setAdditions] = useState("");
  const [rolesHired, setRolesHired] = useState("");
  const [pilotInterest, setPilotInterest] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!realism) {
      setError("Please rate how realistic the evaluation felt (question 1).");
      return;
    }
    if (!reveals) {
      setError("Please answer question 2.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sim/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          realism,
          revealsBeyondResume: reveals,
          usefulEvidence: evidence,
          unrealistic,
          additions,
          rolesHired,
          pilotInterest,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save your feedback");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your feedback");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-[var(--status-positive-line)] bg-[var(--status-positive-bg)] p-6 text-center">
        <p className="text-[15px] font-semibold text-[var(--status-positive-ink)]">Thank you. Your feedback is saved.</p>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          It goes directly into how we shape role-specific pilots.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6">
      <h2 className="text-app-section font-semibold text-[var(--text-primary)]">Help shape Fydell</h2>
      <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
        Seven quick questions. This directly shapes what we build next.
      </p>

      <div className="mt-5 space-y-6">
        {/* 1 realism */}
        <div>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">1. How realistic did this evaluation feel?</p>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Realism rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRealism(n)}
                aria-pressed={realism === n}
                className={`h-10 w-10 rounded-lg border text-[14px] font-semibold ${
                  realism === n
                    ? "border-[var(--border-strong)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--text-tertiary)]">1 = not realistic · 5 = very realistic</p>
        </div>

        {/* 2 reveals */}
        <div>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            2. Did this reveal anything a résumé or interview might miss?
          </p>
          <div className="mt-2 flex gap-2">
            {[
              ["yes", "Yes"],
              ["somewhat", "Somewhat"],
              ["no", "No"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setReveals(value)}
                aria-pressed={reveals === value}
                className={`rounded-lg border px-4 py-2 text-[13px] font-medium ${
                  reveals === value
                    ? "border-[var(--border-strong)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 evidence */}
        <div>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            3. Which evidence would be useful in an actual hiring decision?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EVIDENCE_OPTIONS.map((o) => {
              const on = evidence.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => setEvidence((e) => (on ? e.filter((x) => x !== o) : [...e, o]))}
                  aria-pressed={on}
                  className={`rounded-[8px] border px-3.5 py-1.5 text-[12.5px] font-medium ${
                    on
                      ? "border-[var(--border-strong)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4-6 free text */}
        <div>
          <label className="text-[13.5px] font-medium text-[var(--text-primary)]" htmlFor="fb-unrealistic">
            4. What felt unrealistic or unnecessary?
          </label>
          <textarea
            id="fb-unrealistic"
            value={unrealistic}
            onChange={(e) => setUnrealistic(e.target.value)}
            rows={2}
            className="platform-input mt-1.5"
          />
        </div>
        <div>
          <label className="text-[13.5px] font-medium text-[var(--text-primary)]" htmlFor="fb-additions">
            5. What would you add before using this with candidates?
          </label>
          <textarea
            id="fb-additions"
            value={additions}
            onChange={(e) => setAdditions(e.target.value)}
            rows={2}
            className="platform-input mt-1.5"
          />
        </div>
        <div>
          <label className="text-[13.5px] font-medium text-[var(--text-primary)]" htmlFor="fb-roles">
            6. Which roles does your team hire most frequently?
          </label>
          <input
            id="fb-roles"
            value={rolesHired}
            onChange={(e) => setRolesHired(e.target.value)}
            className="platform-input mt-1.5"
          />
        </div>

        {/* 7 pilot */}
        <div>
          <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
            7. Would you review a longer role-specific pilot with real candidates?
          </p>
          <div className="mt-2 flex gap-2">
            {[
              ["yes", "Yes"],
              ["maybe", "Maybe"],
              ["no", "No"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPilotInterest(value)}
                aria-pressed={pilotInterest === value}
                className={`rounded-lg border px-4 py-2 text-[13px] font-medium ${
                  pilotInterest === value
                    ? "border-[var(--border-strong)] bg-[var(--surface-selected)] text-[var(--text-primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-[var(--radius-control)] bg-[color-mix(in_srgb,var(--fydell-risk)_7%,transparent)] px-3 py-2 text-[13px] text-[var(--fydell-risk)]">{error}</p>}
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="mt-5 rounded-[8px] bg-[var(--control-solid)] px-6 py-3 text-[14px] font-semibold text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)] disabled:opacity-50"
      >
        {busy ? "Saving…" : "Submit feedback"}
      </button>
    </div>
  );
}
