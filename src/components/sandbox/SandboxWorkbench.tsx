"use client";

import { useState } from "react";
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

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section>
        <p className="text-app-meta text-[var(--text-tertiary)]">
          {session.step} · {saveState} · {session.fixture.candidate.label}
        </p>
        <h1 className="mt-2 text-app-page">Acme technical discovery and rollout</h1>
        {fields.map(([key, label]) => (
          <label key={key} className="mt-4 block">
            <span className="text-app-meta text-[var(--text-tertiary)]">{label}</span>
            <textarea
              className="mt-1 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3 text-app-body"
              rows={key === "recommendation" ? 5 : 3}
              value={draft[key]}
              disabled={session.step === "finalized" || busy}
              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              onBlur={() => {
                setSaveState("Saving");
                onAction({ type: "save_work", artifact: draft, idempotencyKey: `save:${session.revision}:${key}` });
                setSaveState("Saved");
              }}
            />
          </label>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]" disabled={busy} onClick={() => onAction({ type: "commit_initial", artifact: draft })}>
            Submit initial recommendation
          </button>
          <button type="button" className="rounded-full border border-[var(--border-default)] px-4 py-2 text-[13px]" disabled={busy} onClick={() => onAction({ type: "deliver_constraint" })}>
            Receive changed information
          </button>
          <button type="button" className="rounded-full border border-[var(--border-default)] px-4 py-2 text-[13px]" disabled={busy} onClick={() => onAction({ type: "submit_revised", artifact: draft })}>
            Submit revised plan
          </button>
        </div>
        {session.defense && (session.step === "defense_ready" || session.step === "defense_in_progress") ? (
          <form
            className="mt-8"
            onSubmit={(e) => {
              e.preventDefault();
              onAction({ type: "submit_defense", answer: defense });
            }}
          >
            <h2 className="text-app-section">Oral defense</h2>
            <p className="mt-2 text-app-body text-[var(--text-secondary)]">{session.defense.prompt}</p>
            <textarea className="mt-3 w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-panel)] p-3" rows={4} value={defense} onChange={(e) => setDefense(e.target.value)} />
            <button type="submit" className="mt-3 rounded-full bg-[var(--surface-paper)] px-4 py-2 text-[13px] text-[#111]">
              Submit defense
            </button>
          </form>
        ) : null}
      </section>
      <aside>
        <h2 className="text-app-section">Resources</h2>
        {session.fixture.resources.map((resource) => (
          <article key={resource.id} className="mt-4">
            <p className="text-app-meta text-[var(--text-tertiary)]">{resource.title}</p>
            <p className="mt-1 text-app-body text-[var(--text-secondary)]">{resource.body}</p>
          </article>
        ))}
        {session.constraintDelivered ? (
          <article className="mt-6 rounded-[10px] border border-[var(--border-default)] p-3">
            <p className="text-app-meta text-[var(--color-changed)]">Changed information</p>
            <p className="mt-2 text-app-body">{session.fixture.changedFact.body}</p>
          </article>
        ) : null}
      </aside>
    </div>
  );
}
