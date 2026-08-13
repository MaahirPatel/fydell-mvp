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
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-[15px] font-semibold text-emerald-800">Thank you. Your feedback is saved.</p>
        <p className="mt-1 text-[13px] text-emerald-700">
          It goes directly into how we shape role-specific pilots.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Help shape Fydell</h2>
      <p className="mt-1 text-[13px] text-slate-500">
        Seven quick questions. This directly shapes what we build next.
      </p>

      <div className="mt-5 space-y-6">
        {/* 1 realism */}
        <div>
          <p className="text-[13.5px] font-medium text-slate-800">1. How realistic did this evaluation feel?</p>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Realism rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRealism(n)}
                aria-pressed={realism === n}
                className={`h-10 w-10 rounded-lg border text-[14px] font-semibold ${
                  realism === n
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-violet-400"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">1 = not realistic · 5 = very realistic</p>
        </div>

        {/* 2 reveals */}
        <div>
          <p className="text-[13.5px] font-medium text-slate-800">
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
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-violet-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 3 evidence */}
        <div>
          <p className="text-[13.5px] font-medium text-slate-800">
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
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium ${
                    on
                      ? "border-violet-600 bg-violet-50 text-violet-700"
                      : "border-slate-300 text-slate-600 hover:border-violet-400"
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
          <label className="text-[13.5px] font-medium text-slate-800" htmlFor="fb-unrealistic">
            4. What felt unrealistic or unnecessary?
          </label>
          <textarea
            id="fb-unrealistic"
            value={unrealistic}
            onChange={(e) => setUnrealistic(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[13.5px] font-medium text-slate-800" htmlFor="fb-additions">
            5. What would you add before using this with candidates?
          </label>
          <textarea
            id="fb-additions"
            value={additions}
            onChange={(e) => setAdditions(e.target.value)}
            rows={2}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-violet-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[13.5px] font-medium text-slate-800" htmlFor="fb-roles">
            6. Which roles does your team hire most frequently?
          </label>
          <input
            id="fb-roles"
            value={rolesHired}
            onChange={(e) => setRolesHired(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* 7 pilot */}
        <div>
          <p className="text-[13.5px] font-medium text-slate-800">
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
                    ? "border-violet-600 bg-violet-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-violet-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
      <button
        onClick={() => void submit()}
        disabled={busy}
        className="mt-5 rounded-xl bg-violet-600 px-6 py-3 text-[14px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Submit feedback"}
      </button>
    </div>
  );
}
