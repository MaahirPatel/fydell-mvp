"use client";

import { useEffect, useState } from "react";
import type { SandboxSessionView } from "@/lib/sim-engine/proof/sandbox/view";

export function SandboxWorkbench({
  session,
  busy,
  onAction,
  onEnsure,
}: {
  session: SandboxSessionView | null;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
  onEnsure: () => void;
}) {
  const artifact = session?.artifact;
  const [draft, setDraft] = useState({
    diagnosis: artifact?.diagnosis ?? "",
    recommendation: artifact?.recommendation ?? "",
    customer_message: artifact?.customer_message ?? "",
    internal_note: artifact?.internal_note ?? "",
    assumptions: artifact?.assumptions ?? "",
    limitations: artifact?.limitations ?? "",
  });
  const [defense, setDefense] = useState(session?.defense?.answer ?? "");
  const [saveState, setSaveState] = useState("Saved");

  useEffect(() => {
    if (!artifact) return;
    const id = window.setTimeout(() => setDraft(artifact), 0);
    return () => window.clearTimeout(id);
  }, [artifact]);

  useEffect(() => {
    if (!session?.defense?.answer) return;
    const id = window.setTimeout(() => setDefense(session.defense?.answer ?? ""), 0);
    return () => window.clearTimeout(id);
  }, [session?.defense?.answer]);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-app-body text-[var(--text-secondary)]">Create a sandbox to open the candidate workbench.</p>
        <button type="button" className="mt-4 rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]" onClick={onEnsure}>
          Create sandbox
        </button>
      </div>
    );
  }

  const fields = [
    ["diagnosis", "Discovery notes"],
    ["recommendation", "Rollout recommendation"],
    ["internal_note", "Architecture brief"],
    ["customer_message", "Customer email"],
    ["assumptions", "Assumptions"],
    ["limitations", "Limitations"],
  ] as const;
  const committedInitial = session.events.some(
    (event) => event.eventType === "DECISION_COMMITTED",
  );
  const canEdit = session.step === "active";
  const canCommitInitial = canEdit && !committedInitial;
  const canReceiveConstraint = canEdit && committedInitial && !session.constraintDelivered;
  const canSubmitRevision = canEdit && session.constraintDelivered;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <div className="border-b border-[var(--border-subtle)] pb-5">
          <p className="text-app-meta text-[var(--text-tertiary)]">
            Demo candidate · {session.fixture.candidate.label} · {saveState}
          </p>
          <h1 className="mt-2 text-app-page">Acme technical discovery and rollout</h1>
          <p className="mt-2 max-w-[72ch] text-app-body text-[var(--text-secondary)]">
            Recommend a rollout that creates near-term customer value without treating an unverified assumption as fact.
          </p>
        </div>
        <div className="mt-5 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
          {fields.map(([key, label]) => (
            <label key={key} className="grid gap-2 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0 sm:grid-cols-[160px_minmax(0,1fr)]">
              <span className="pt-2 text-app-meta font-medium text-[var(--text-secondary)]">{label}</span>
              <textarea
                className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-app-body outline-none focus:border-[var(--action-ink)]"
                rows={key === "recommendation" ? 4 : 2}
                value={draft[key]}
                disabled={!canEdit || busy}
                onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                onBlur={() => {
                  if (!canEdit) return;
                  setSaveState("Saving");
                  onAction({ type: "save_work", artifact: draft, idempotencyKey: `save:${session.revision}:${key}` });
                  setSaveState("Saved");
                }}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {session.step === "invited" ? (
            <button
              type="button"
              className="h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-[13px] font-medium text-[var(--control-solid-ink)]"
              disabled={busy}
              onClick={() => onAction({ type: "start" })}
            >
              Start candidate work
            </button>
          ) : null}
          {canCommitInitial ? (
            <button type="button" className="h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-[13px] font-medium text-[var(--control-solid-ink)]" disabled={busy} onClick={() => onAction({ type: "commit_initial", artifact: draft })}>
              Commit recommendation
            </button>
          ) : null}
          {canReceiveConstraint ? (
            <button type="button" className="h-9 rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3.5 text-[13px] font-medium" disabled={busy} onClick={() => onAction({ type: "deliver_constraint" })}>
              Receive engineering update
            </button>
          ) : null}
          {canSubmitRevision ? (
            <button type="button" className="h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-[13px] font-medium text-[var(--control-solid-ink)]" disabled={busy} onClick={() => onAction({ type: "submit_revised", artifact: draft })}>
              Submit revised recommendation
            </button>
          ) : null}
        </div>
        {session.constraintDelivered ? (
          <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            <div className="border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="text-app-section">What changed</p>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="border-b border-[var(--border-subtle)] px-4 py-3 md:border-b-0 md:border-r">
                <p className="text-app-meta text-[var(--text-tertiary)]">Before</p>
                <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                  Single production launch in six weeks.
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-app-meta text-[var(--text-tertiary)]">After</p>
                <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                  Sandbox enablement now. Production deployment after security approval.
                </p>
              </div>
            </div>
          </div>
        ) : null}
        {session.defense && (session.step === "defense_ready" || session.step === "defense_in_progress") ? (
          <form
            className="mt-8 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] p-5"
            onSubmit={(e) => {
              e.preventDefault();
              onAction({ type: "submit_defense", answer: defense });
            }}
          >
            <h2 className="text-app-section">Oral defense</h2>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">{session.defense.prompt}</p>
            <textarea className="mt-3 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3" rows={4} value={defense} onChange={(e) => setDefense(e.target.value)} />
            <button type="submit" className="mt-3 h-9 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3.5 text-[13px] font-medium text-[var(--control-solid-ink)]">
              Submit defense
            </button>
          </form>
        ) : null}
      </section>
      <aside>
        <h2 className="text-app-section">Resources</h2>
        {session.fixture.resources.map((resource) => (
          <details key={resource.id} className="mt-2 rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-3 py-2.5">
            <summary className="cursor-pointer text-app-body font-medium text-[var(--text-primary)]">{resource.title}</summary>
            <p className="mt-2 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{resource.body}</p>
          </details>
        ))}
        {session.constraintDelivered ? (
          <article className="mt-6 rounded-[var(--radius-panel)] border border-[var(--border-default)] p-3">
            <p className="text-app-meta text-[var(--color-changed)]">Changed information</p>
            <p className="mt-2 text-app-body">{session.fixture.changedFact.body}</p>
          </article>
        ) : null}
      </aside>
    </div>
  );
}
