"use client";

import { useCallback, useRef, useState } from "react";
import type { CandidateInvite, Simulation } from "@/lib/mvp/types";

type Phase = "intro" | "running" | "done";

interface Props {
  token: string;
  invite: Pick<CandidateInvite, "id" | "candidate_name" | "status">;
  simulation: Simulation;
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({}));
}

export default function CandidateRunner({ token, invite, simulation }: Props) {
  const [phase, setPhase] = useState<Phase>(invite.status === "completed" ? "done" : "intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [openResources, setOpenResources] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recordEvent = useCallback(
    (id: string, eventType: string, payload: Record<string, unknown> = {}) => {
      void postJson(`/api/mvp/attempts/${id}/event`, { eventType, payload });
    },
    []
  );

  async function start() {
    setBusy(true);
    setError(null);
    const data = await postJson("/api/mvp/attempts/start", { token });
    setBusy(false);
    if (data.error || !data.attempt) {
      setError(data.error ?? "Could not start the simulation.");
      return;
    }
    setAttemptId(data.attempt.id);
    setPhase("running");
  }

  function toggleResource(id: string) {
    setOpenResources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (attemptId) recordEvent(attemptId, "resource_opened", { resource_id: id });
      }
      return next;
    });
  }

  function onNotesChange(value: string) {
    setNotes(value);
    if (!attemptId) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void postJson(`/api/mvp/attempts/${attemptId}/notes`, { notes: value });
    }, 800);
  }

  async function submit() {
    if (!attemptId) return;
    if (recommendation.trim().length < 1) {
      setError("Please write your final recommendation before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    if (notes) await postJson(`/api/mvp/attempts/${attemptId}/notes`, { notes });
    const data = await postJson(`/api/mvp/attempts/${attemptId}/submit`, { recommendation });
    setBusy(false);
    if (data.error) {
      setError(data.error);
      return;
    }
    setPhase("done");
  }

  if (phase === "done") {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-2xl">Submitted. Thank you</h1>
        <p className="mt-3 text-ink-2">
          Your work on <strong>{simulation.title}</strong> has been recorded. The hiring team
          will review your submission alongside the evidence from your session.
        </p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[var(--shadow-card)]">
        <div className="border-b border-line bg-navy px-8 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal">
            {simulation.role} · {simulation.industry}
          </p>
          <h1 className="mt-1 text-3xl text-white">{simulation.title}</h1>
        </div>
        <div className="space-y-5 px-8 py-9">
          <p className="text-lg leading-relaxed text-ink-2">{simulation.description}</p>
          {simulation.scenario_json?.business_problem && (
            <p className="text-ink-2">
              <strong>Your task:</strong> {simulation.scenario_json.business_problem}
            </p>
          )}
          <ul className="list-inside list-disc text-sm text-muted">
            {(simulation.scenario_json?.constraints ?? []).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={start}
            disabled={busy}
            className="inline-flex h-[52px] items-center justify-center rounded-xl bg-navy px-8 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start simulation"}
          </button>
          <p className="text-xs text-muted">
            {simulation.duration_minutes ?? 35} minutes · one sitting · this produces a
            preliminary simulation signal, not a pass/fail grade.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <h1 className="text-xl">{simulation.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Review the data room, take notes, then submit your recommendation.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">Data room</h2>
        <div className="mt-4 space-y-3">
          {simulation.resources_json.map((r) => (
            <div key={r.id} className="rounded-xl border border-line">
              <button
                onClick={() => toggleResource(r.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-muted">
                  {openResources.has(r.id) ? "Hide" : "Open"}
                </span>
              </button>
              {openResources.has(r.id) && (
                <div className="border-t border-line px-4 py-3 text-sm text-ink-2">
                  {r.summary && <p className="mb-2 font-medium">{r.summary}</p>}
                  <p>{r.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <label className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Working notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          placeholder="Jot down what you find as you work…"
          className="mt-2 w-full rounded-xl border border-line p-3 text-sm"
        />
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <label className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Final recommendation
        </label>
        <textarea
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value)}
          rows={8}
          placeholder="State your recommendation, the valuation view, key risks, assumptions, and tradeoffs."
          className="mt-2 w-full rounded-xl border border-line p-3 text-sm"
        />
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 inline-flex h-[52px] items-center justify-center rounded-xl bg-navy px-8 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Submit recommendation"}
        </button>
      </div>
    </div>
  );
}
