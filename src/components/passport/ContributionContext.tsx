"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Byline, Notice, SectionHeader, SourceRef } from "@/components/ui/report";
import {
  COLLABORATION_LABEL,
  hasContribution,
  type Collaboration,
  type ContributionContext,
  type DecisionRecord,
  type EvidenceRef,
} from "@/lib/passport/context-contract";
import { formatDate } from "@/lib/passport/record-states";
import type { PassportEvidence } from "@/lib/passport/view";

type Finding = Pick<PassportEvidence, "id" | "finding" | "path" | "startLine" | "endLine">;

const field =
  "w-full rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-[14px] text-[var(--text-primary)] shadow-[0_1px_1px_rgba(16,24,40,0.03)] placeholder:text-[var(--text-quaternary)] focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-soft)]";

function TextArea({ id, label, hint, value, onChange, rows = 3 }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13.5px] font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-app-meta text-[var(--text-tertiary)]">
          {hint}
        </p>
      ) : null}
      <textarea id={id} aria-describedby={hint ? `${id}-hint` : undefined} rows={rows} maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} className={`${field} mt-1.5 resize-y`} />
    </div>
  );
}

/** Lets the engineer tie a statement to findings from this snapshot. */
function EvidencePicker({ projectId, findings, refs, onChange }: { projectId: string; findings: Finding[]; refs: EvidenceRef[]; onChange: (r: EvidenceRef[]) => void }) {
  if (findings.length === 0) return <p className="text-app-meta text-[var(--text-tertiary)]">This version has no findings to link.</p>;
  const linked = new Set(refs.filter((r) => r.projectId === projectId).map((r) => r.findingId));
  const toggle = (f: Finding) => {
    if (linked.has(f.id)) onChange(refs.filter((r) => !(r.projectId === projectId && r.findingId === f.id)));
    else if (refs.length < 12) onChange([...refs, { projectId, findingId: f.id, path: f.path, startLine: f.startLine, endLine: f.endLine }]);
  };
  const elsewhere = refs.filter((r) => r.projectId !== projectId).length;
  return (
    <fieldset>
      <legend className="text-[13.5px] font-medium text-[var(--text-primary)]">Supporting evidence</legend>
      <p className="text-app-meta text-[var(--text-tertiary)]">Link the findings that back this up.</p>
      <ul className="mt-2 max-h-56 divide-y divide-[var(--border-subtle)] overflow-auto rounded-[8px] border border-[var(--border-default)]">
        {findings.map((f) => (
          <li key={f.id}>
            <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-[var(--surface-hover)]">
              <input type="checkbox" checked={linked.has(f.id)} onChange={() => toggle(f)} className="mt-[3px] accent-[var(--accent)]" />
              <span className="min-w-0">
                <span className="block text-[13.5px] leading-snug text-[var(--text-primary)]">{f.finding}</span>
                <span className="block truncate font-mono text-[13px] text-[var(--text-tertiary)]">
                  {f.path}:{f.startLine}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {elsewhere ? (
        <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">
          {elsewhere} link{elsewhere === 1 ? "" : "s"} to another version kept.
        </p>
      ) : null}
    </fieldset>
  );
}

function RefList({ refs, findings, projectId, onOpen }: { refs: EvidenceRef[]; findings: Finding[]; projectId: string; onOpen: (findingId: string) => void }) {
  if (refs.length === 0) return null;
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-[var(--text-tertiary)]">
      <span>Evidence</span>
      {refs.map((r) => {
        const here = r.projectId === projectId && r.findingId && findings.some((f) => f.id === r.findingId);
        const key = `${r.projectId}-${r.findingId ?? r.path}`;
        return here ? (
          <SourceRef key={key} path={r.path} line={r.startLine} onClick={() => onOpen(r.findingId as string)} />
        ) : (
          <SourceRef key={key} path={r.path} line={r.startLine} className="text-[var(--text-secondary)]" href={`/app/candidate/projects/${r.projectId}${r.findingId ? `?finding=${r.findingId}` : ""}`} />
        );
      })}
    </p>
  );
}

async function send(method: string, payload: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch("/api/passport/context", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Fydell could not be reached. Your text is kept; try again." } };
  }
}

/** Contribution statement: a compact summary for the report rail, edited in a sheet. */
export function ContributionSection({
  projectId,
  findings,
  initial,
  onOpenFinding,
}: {
  projectId: string;
  findings: Finding[];
  initial: ContributionContext;
  onOpenFinding: (id: string) => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ContributionContext | null>(null);
  const set = <K extends keyof ContributionContext>(k: K, v: ContributionContext[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const close = useCallback(() => setEditing(false), []);
  const stated = hasContribution(saved);

  async function save() {
    setBusy(true);
    setError(null);
    const r = await send("PUT", { projectId, expectedVersion: saved.version, contribution: draft });
    setBusy(false);
    if (r.ok && r.data.contribution) {
      const next = r.data.contribution as ContributionContext;
      setSaved(next);
      setDraft(next);
      setConflict(null);
      setEditing(false);
      return;
    }
    setError(typeof r.data.error === "string" ? r.data.error : "Could not save. Your text is kept; try again.");
    if (r.status === 409 && r.data.current) setConflict(r.data.current as ContributionContext);
  }

  function takeNewer() {
    if (!conflict) return;
    setSaved(conflict);
    setDraft({ ...draft, version: conflict.version });
    setConflict(null);
    setError("Your edits now sit on top of the newer version. Review, then save again.");
  }

  const rows = [
    { k: "Built or changed", v: saved.workedOn },
    { k: "Already there", v: saved.inherited },
    { k: "Constraints", v: saved.constraintsFaced },
    { k: "Results", v: saved.results },
    { k: "Would improve", v: saved.improvements },
  ].filter((r) => r.v);

  return (
    <section aria-labelledby="contribution-heading">
      <SectionHeader
        id="contribution-heading"
        title="Your contribution"
        actions={
          stated ? (
            <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </Button>
          ) : null
        }
      />

      {stated ? (
        <div>
          <Byline
            className="mt-1"
            at={[saved.updatedAt ? formatDate(saved.updatedAt) : null, saved.collaboration !== "unspecified" ? COLLABORATION_LABEL[saved.collaboration] : null].filter(Boolean).join(" · ") || null}
            title={saved.collaborationNote || undefined}
          />
          <dl className="mt-4 space-y-4">
            {rows.map((r) => (
              <div key={r.k}>
                <dt className="text-[13px] font-medium text-[var(--text-secondary)]">{r.k}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.6] text-[var(--text-body)]">{r.v}</dd>
              </div>
            ))}
          </dl>
          <RefList refs={saved.evidenceRefs} findings={findings} projectId={projectId} onOpen={onOpenFinding} />
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-[15px] leading-[1.6] text-[var(--text-secondary)]">Explain what you built, changed, or maintained.</p>
          <Button size="md" variant="secondary" className="mt-3" onClick={() => setEditing(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add contribution
          </Button>
        </div>
      )}

      <Sheet
        open={editing}
        onClose={close}
        title="Your contribution"
        description="Reviewers see this as your statement, beside the findings."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="quiet"
              disabled={busy}
              onClick={() => {
                setDraft(saved);
                setError(null);
                setConflict(null);
                setEditing(false);
              }}
            >
              Discard changes
            </Button>
            <Button size="sm" variant="primary" onClick={() => void save()} loading={busy}>
              Save contribution
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <TextArea id="c-worked" label="What did you build or change?" hint="The parts that were yours." value={draft.workedOn} onChange={(v) => set("workedOn", v)} rows={4} />
          <TextArea id="c-inherited" label="What was already there?" hint="Code, design or infrastructure you inherited." value={draft.inherited} onChange={(v) => set("inherited", v)} rows={2} />
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <div>
              <label htmlFor="c-collab" className="text-[13.5px] font-medium">
                Collaboration
              </label>
              <select id="c-collab" value={draft.collaboration} onChange={(e) => set("collaboration", e.target.value as Collaboration)} className={`${field} mt-1.5`}>
                {(Object.keys(COLLABORATION_LABEL) as Collaboration[]).map((k) => (
                  <option key={k} value={k}>
                    {COLLABORATION_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-collab-note" className="text-[13.5px] font-medium">
                Who else was involved
              </label>
              <input id="c-collab-note" maxLength={500} value={draft.collaborationNote} onChange={(e) => set("collaborationNote", e.target.value)} className={`${field} mt-1.5`} placeholder="Paired with one engineer on the API" />
            </div>
          </div>
          <TextArea id="c-constraints" label="Constraints" hint="Time, scale, legacy or team limits." value={draft.constraintsFaced} onChange={(v) => set("constraintsFaced", v)} rows={2} />
          <TextArea id="c-results" label="Results" hint="Only what you can back up." value={draft.results} onChange={(v) => set("results", v)} rows={2} />
          <TextArea id="c-improve" label="What would you improve?" value={draft.improvements} onChange={(v) => set("improvements", v)} rows={2} />
          <EvidencePicker projectId={projectId} findings={findings} refs={draft.evidenceRefs} onChange={(r) => set("evidenceRefs", r)} />
          {error ? (
            <Notice
              tone="error"
              action={
                conflict ? (
                  <button type="button" onClick={takeNewer} className="font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                    Keep my edits on the newer version
                  </button>
                ) : undefined
              }
            >
              {error}
            </Notice>
          ) : null}
        </div>
      </Sheet>
    </section>
  );
}

type DecisionDraft = Pick<DecisionRecord, "title" | "problem" | "constraintsFaced" | "alternatives" | "choice" | "tradeoffs" | "outcome" | "evidenceRefs">;
const EMPTY_DECISION: DecisionDraft = { title: "", problem: "", constraintsFaced: "", alternatives: "", choice: "", tradeoffs: "", outcome: "", evidenceRefs: [] };

function DecisionForm({
  projectId,
  findings,
  initial,
  onSubmit,
  onCancel,
}: {
  projectId: string;
  findings: Finding[];
  initial: DecisionDraft;
  onSubmit: (d: DecisionDraft) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof DecisionDraft>(k: K, v: DecisionDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="my-4 space-y-4 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <div>
        <label htmlFor="d-title" className="text-[13.5px] font-medium">
          Decision
        </label>
        <input id="d-title" maxLength={160} value={d.title} onChange={(e) => set("title", e.target.value)} className={`${field} mt-1.5`} placeholder="Queue webhook deliveries instead of sending inline" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextArea id="d-problem" label="Problem" hint="Required." value={d.problem} onChange={(v) => set("problem", v)} rows={3} />
        <TextArea id="d-choice" label="What you chose, and why" hint="Required." value={d.choice} onChange={(v) => set("choice", v)} rows={3} />
        <TextArea id="d-constraints" label="Constraints" value={d.constraintsFaced} onChange={(v) => set("constraintsFaced", v)} rows={2} />
        <TextArea id="d-alts" label="Alternatives considered" value={d.alternatives} onChange={(v) => set("alternatives", v)} rows={2} />
        <TextArea id="d-tradeoffs" label="Trade-offs" value={d.tradeoffs} onChange={(v) => set("tradeoffs", v)} rows={2} />
        <TextArea id="d-outcome" label="Outcome" hint="If known." value={d.outcome} onChange={(v) => set("outcome", v)} rows={2} />
      </div>
      <EvidencePicker projectId={projectId} findings={findings} refs={d.evidenceRefs} onChange={(r) => set("evidenceRefs", r)} />
      {error ? (
        <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="quiet" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            setError(await onSubmit(d));
            setBusy(false);
          }}
        >
          Save decision
        </Button>
      </div>
    </div>
  );
}

export function DecisionsSection({
  projectId,
  findings,
  initial,
  onOpenFinding,
}: {
  projectId: string;
  findings: Finding[];
  initial: DecisionRecord[];
  onOpenFinding: (id: string) => void;
}) {
  const [decisions, setDecisions] = useState(initial);
  const [mode, setMode] = useState<{ kind: "idle" } | { kind: "new" } | { kind: "edit"; id: string }>({ kind: "idle" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const active = decisions.filter((d) => !d.withdrawnAt);
  const withdrawn = decisions.length - active.length;

  async function create(d: DecisionDraft): Promise<string | null> {
    const r = await send("POST", { projectId, decision: d });
    if (!r.ok || !r.data.decision) return typeof r.data.error === "string" ? r.data.error : "Could not save. Your text is kept; try again.";
    setDecisions((list) => [r.data.decision as DecisionRecord, ...list]);
    setMode({ kind: "idle" });
    return null;
  }

  async function update(existing: DecisionRecord, d: DecisionDraft): Promise<string | null> {
    const r = await send("PATCH", { decisionId: existing.id, expectedVersion: existing.version, decision: d });
    if (r.ok && r.data.decision) {
      const next = r.data.decision as DecisionRecord;
      setDecisions((list) => list.map((x) => (x.id === next.id ? next : x)));
      setMode({ kind: "idle" });
      return null;
    }
    if (r.status === 409 && r.data.current) {
      const current = r.data.current as DecisionRecord;
      setDecisions((list) => list.map((x) => (x.id === current.id ? current : x)));
    }
    return typeof r.data.error === "string" ? r.data.error : "Could not save. Your text is kept; try again.";
  }

  async function withdraw(id: string) {
    setBusyId(id);
    const r = await send("PATCH", { decisionId: id, action: "withdraw" });
    setBusyId(null);
    if (r.ok) setDecisions((list) => list.map((x) => (x.id === id ? { ...x, withdrawnAt: new Date().toISOString() } : x)));
  }

  return (
    <section aria-labelledby="decisions-heading">
      <SectionHeader
        id="decisions-heading"
        title="Engineering decisions"
        actions={
          mode.kind === "idle" && active.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setMode({ kind: "new" })}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Record a decision
            </Button>
          ) : null
        }
      />

      <div className="mt-4 border-y border-[var(--border-subtle)]">
        {mode.kind === "new" ? <DecisionForm projectId={projectId} findings={findings} initial={EMPTY_DECISION} onSubmit={create} onCancel={() => setMode({ kind: "idle" })} /> : null}

        {active.length === 0 && mode.kind !== "new" ? (
          <div className="py-8">
            <p className="max-w-[60ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">Record a problem you solved, the options you weighed, and what the choice cost.</p>
            <Button size="md" variant="secondary" className="mt-3" onClick={() => setMode({ kind: "new" })}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Record a decision
            </Button>
          </div>
        ) : null}

        <ul className="divide-y divide-[var(--border-subtle)]">
        {active.map((d) =>
          mode.kind === "edit" && mode.id === d.id ? (
            <li key={d.id}>
              <DecisionForm projectId={projectId} findings={findings} initial={d} onSubmit={(x) => update(d, x)} onCancel={() => setMode({ kind: "idle" })} />
            </li>
          ) : (
            <li key={d.id} className="py-5">
              <div className="flex flex-wrap items-start gap-2">
                <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug">{d.title}</h3>
                <span className="flex gap-1 text-app-meta">
                  <button type="button" className="rounded-[6px] px-2 py-0.5 font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]" onClick={() => setMode({ kind: "edit", id: d.id })}>
                    Edit
                  </button>
                  <button type="button" className="rounded-[6px] px-2 py-0.5 font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-counter)] hover:text-[var(--fydell-risk)] disabled:opacity-50" disabled={busyId === d.id} onClick={() => void withdraw(d.id)}>
                    {busyId === d.id ? "Withdrawing…" : "Withdraw"}
                  </button>
                </span>
              </div>
              <dl className="mt-3 grid gap-x-8 gap-y-3 md:grid-cols-2">
                {[
                  { k: "Problem", v: d.problem },
                  { k: "Chose", v: d.choice },
                  { k: "Constraints", v: d.constraintsFaced },
                  { k: "Alternatives", v: d.alternatives },
                  { k: "Trade-offs", v: d.tradeoffs },
                  { k: "Outcome", v: d.outcome },
                ]
                  .filter((r) => r.v)
                  .map((r) => (
                    <div key={r.k}>
                      <dt className="text-[13px] font-medium text-[var(--text-secondary)]">{r.k}</dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[15px] leading-[1.6] text-[var(--text-body)]">{r.v}</dd>
                    </div>
                  ))}
              </dl>
              <RefList refs={d.evidenceRefs} findings={findings} projectId={projectId} onOpen={onOpenFinding} />
              <Byline className="mt-3" at={formatDate(d.createdAt)} />
            </li>
          ),
        )}
        </ul>
      </div>
      {withdrawn ? (
        <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">
          {withdrawn} withdrawn decision{withdrawn === 1 ? "" : "s"} hidden from reviewers.
        </p>
      ) : null}
    </section>
  );
}
