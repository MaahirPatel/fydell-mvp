"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormError, Select, Textarea } from "@/components/ui/Field";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import type { CandidateCitation, CandidateReport as Report, CandidateResponse } from "@/lib/eng/candidate-report";
import { engFetch } from "./api";
import { FileViewer, type FileTarget } from "./EvidenceViews";

const STATE_TONE: Record<string, StatusTone> = {
  demonstrated_additional: "good",
  demonstrated: "good",
  partially_demonstrated: "active",
  concern_observed: "risk",
  not_assessed: "neutral",
};

const OUTCOME_LABEL: Record<string, string> = {
  passed: "passed",
  failed: "failed",
  candidate_error: "raised an error",
  timeout: "timed out",
  output_limit: "hit the output limit",
  no_result: "produced no result",
};

const HANDOFF_LABEL: Record<string, string> = {
  what_changed: "Handoff: what changed",
  testing: "Handoff: what you tested",
  risks: "Handoff: what remains unresolved",
  ai_use: "AI use note",
};

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" }) : "";
}

function newRequestId(): string {
  return `r_${crypto.randomUUID().replace(/-/g, "")}`;
}

export type ResponseTarget = { kind: CandidateResponse["targetKind"]; id: string; label: string };
type Target = ResponseTarget;

export function RespondForm({
  attemptId,
  target,
  onDone,
  onCancel,
  endpoint = `/api/eng/attempts/${attemptId}/report`,
}: {
  attemptId: string;
  target: Target;
  onDone: (r: CandidateResponse) => void;
  onCancel: () => void;
  endpoint?: string;
}) {
  const [kind, setKind] = useState<CandidateResponse["kind"]>("context");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(newRequestId);
  return (
    <div className="mt-2 grid gap-2 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3">
      <FormError>{error}</FormError>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Type of response" value={kind} onChange={(e) => setKind(e.target.value as CandidateResponse["kind"])} className="w-[200px]">
          <option value="context">Add context</option>
          <option value="inaccurate">Flag an error</option>
        </Select>
        <span className="text-app-meta text-[var(--text-tertiary)]">On: {target.label}</span>
      </div>
      <Textarea
        aria-label="Your response"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder={kind === "inaccurate" ? "What is wrong, and what in your submission shows it" : "What the reviewer could not see, such as a constraint or an assumption you made"}
      />
      <p className="text-app-meta text-[var(--text-tertiary)]">
        Your response is attributed to you and shown to the hiring team. It is added beside the report; it does not change it. If they agree, they release a corrected version.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          loading={busy}
          disabled={!text.trim()}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await engFetch<{ response: CandidateResponse }>(endpoint, {
              body: { targetKind: target.kind, targetId: target.id, kind, body: text, clientRequestId: requestId },
            });
            setBusy(false);
            if (res.ok === false) setError(res.status === 0 ? res.error : `${res.error} Your text is kept.`);
            else onDone(res.data.response);
          }}
        >
          Send to the hiring team
        </Button>
        <Button size="sm" variant="quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ResponseList({ items }: { items: CandidateResponse[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 grid gap-2">
      {items.map((r) => (
        <li key={r.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag tone={r.status === "open" ? "changed" : "neutral"}>{r.status === "open" ? "Open, with the hiring team" : "Resolved"}</StatusTag>
            <span className="text-app-meta text-[var(--text-tertiary)]">
              {r.kind === "inaccurate" ? "You flagged an error" : "You added context"} on report v{r.reportVersion}, {when(r.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-app-body text-[var(--text-primary)]">{r.body}</p>
          {r.resolution ? <p className="mt-1.5 text-app-meta text-[var(--text-secondary)]">Hiring team reply: {r.resolution}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function Citation({ c, onOpen }: { c: CandidateCitation; onOpen: (t: FileTarget) => void }) {
  const chip = "inline-flex items-center rounded-[6px] border border-[var(--border-subtle)] px-2 py-0.5 text-app-meta text-[var(--text-secondary)]";
  switch (c.kind) {
    case "file":
      return (
        <button type="button" className={`${chip} font-mono hover:bg-[var(--surface-hover)]`} onClick={() => onOpen({ path: c.path, lineStart: c.lineStart ?? undefined, lineEnd: c.lineEnd ?? undefined })}>
          {c.path}
          {c.lineStart ? `:${c.lineStart}${c.lineEnd && c.lineEnd !== c.lineStart ? `-${c.lineEnd}` : ""}` : ""}
        </button>
      );
    case "message":
      return <span className={chip}>A message in your team thread</span>;
    case "handoff":
      return <span className={chip}>{HANDOFF_LABEL[c.field] ?? "Your handoff"}</span>;
    case "public_check":
      return (
        <span className={chip}>
          Public test {c.id} {OUTCOME_LABEL[c.outcome]}
        </span>
      );
    case "hidden_check":
      return <span className={chip}>A hidden check {OUTCOME_LABEL[c.outcome]}</span>;
  }
}

export default function CandidateReport({ attemptId, organizationName, initial }: { attemptId: string; organizationName: string; initial: Report }) {
  const [responses, setResponses] = useState(initial.responses);
  const [responding, setResponding] = useState<Target | null>(null);
  const [file, setFile] = useState<FileTarget | null>(null);
  const r = initial;
  const openCount = responses.filter((x) => x.status === "open").length;

  function respondButton(target: Target) {
    return (
      <Button size="sm" variant="quiet" onClick={() => setResponding(target)} aria-label={`Respond to ${target.label}`}>
        Add context or flag an error
      </Button>
    );
  }

  function formFor(kind: Target["kind"], id: string) {
    if (!responding || responding.kind !== kind || responding.id !== id) return null;
    return (
      <RespondForm
        attemptId={attemptId}
        target={responding}
        onCancel={() => setResponding(null)}
        onDone={(created) => {
          setResponses((prev) => (prev.some((p) => p.id === created.id) ? prev : [...prev, created]));
          setResponding(null);
        }}
      />
    );
  }

  const responsesFor = (kind: Target["kind"], id: string) => responses.filter((x) => x.targetKind === kind && x.targetId === id);

  return (
    <Panel>
      <PanelSection
        title="Your report"
        description={`Version ${r.version}${r.releasedAt ? `, released ${when(r.releasedAt)}` : ""}. Written by the hiring team at ${organizationName}. You see what they see, except their private notes and interview questions. The hiring decision is theirs and is not part of this report.`}
      >
        {r.changeReason ? (
          <p className="mb-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2 text-app-meta text-[var(--text-secondary)]">
            This is a corrected version. What changed: {r.changeReason}
          </p>
        ) : null}
        <p className="max-w-[72ch] text-app-body leading-[1.65] text-[var(--text-primary)]">{r.summary}</p>
        <div className="mt-3">{respondButton({ kind: "report", id: "report", label: "the report as a whole" })}</div>
        {formFor("report", "report")}
        <ResponseList items={responsesFor("report", "report")} />
      </PanelSection>

      {r.improvements.length ? (
        <PanelSection
          title="What would strengthen this submission"
          description="Built from the criteria this submission did not fully demonstrate. Hidden test inputs are not shown, so the task stays fair for other candidates."
        >
          <ol className="grid gap-4">
            {r.improvements.map((item, i) => (
              <li key={item.criterionId} className="grid gap-1.5">
                <p className="text-app-body font-medium text-[var(--text-primary)]">
                  {i + 1}. {item.label}
                </p>
                <dl className="grid gap-1 text-app-body text-[var(--text-secondary)] sm:grid-cols-[140px_minmax(0,1fr)]">
                  <dt className="text-[var(--text-tertiary)]">What we saw</dt>
                  <dd>{item.observation}</dd>
                  <dt className="text-[var(--text-tertiary)]">Why it matters</dt>
                  <dd>{item.whyItMatters}</dd>
                  <dt className="text-[var(--text-tertiary)]">Next step</dt>
                  <dd>{item.nextStep}</dd>
                  {item.recheck ? (
                    <>
                      <dt className="text-[var(--text-tertiary)]">Check it yourself</dt>
                      <dd>{item.recheck}</dd>
                    </>
                  ) : null}
                  <dt className="text-[var(--text-tertiary)]">Limit</dt>
                  <dd>{item.limit}</dd>
                </dl>
              </li>
            ))}
          </ol>
          {r.notAssessed.length ? (
            <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">
              Not assessed, with no evidence either way: {r.notAssessed.join(", ")}. These are not counted against you.
            </p>
          ) : null}
        </PanelSection>
      ) : r.notAssessed.length ? (
        <PanelSection title="What would strengthen this submission">
          <p className="text-app-body text-[var(--text-secondary)]">
            Every criterion that could be judged was demonstrated. Not assessed, with no evidence either way: {r.notAssessed.join(", ")}. These are not counted against you.
          </p>
        </PanelSection>
      ) : null}

      {r.criteria.length ? (
        <PanelSection title="Criteria for this task" description="Each state describes this submission against one defined criterion. Not assessed means there was no opportunity to judge, not a low result. There is no overall score.">
          <ul className="grid gap-3">
            {r.criteria.map((c) => (
              <li key={c.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">{c.label}</p>
                  <StatusTag tone={STATE_TONE[c.stateKey] ?? "neutral"}>{c.state}</StatusTag>
                </div>
                <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{c.requirement}</p>
                {c.observed ? <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{c.observed}</p> : null}
                {c.rationale ? <p className="mt-1 text-app-body text-[var(--text-primary)]">{c.rationale}</p> : null}
                <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Not covered: {c.notCovered}</p>
                <div className="mt-1">{respondButton({ kind: "criterion", id: c.id, label: c.label })}</div>
                {formFor("criterion", c.id)}
                <ResponseList items={responsesFor("criterion", c.id)} />
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : r.dimensions.length ? (
        <PanelSection title="Rubric">
          <ul className="grid gap-3 sm:grid-cols-2">
            {r.dimensions.map((d) => (
              <li key={d.label} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">{d.label}</p>
                  <StatusTag>{d.level}</StatusTag>
                </div>
                <p className="mt-1 text-app-meta text-[var(--text-secondary)]">{d.rationale}</p>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      <PanelSection title="Findings and their evidence" description="Open a file reference to see the exact lines in what you submitted.">
        <ul className="grid gap-3">
          {r.findings.map((f) => (
            <li key={f.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag tone={f.kind === "strength" ? "good" : f.kind === "gap" ? "risk" : "neutral"}>{f.kind === "strength" ? "Strength" : f.kind === "gap" ? "Gap" : "Observation"}</StatusTag>
                <span className="text-app-meta text-[var(--text-tertiary)]">
                  {f.dimension} · {f.basis === "observed" ? "Observed" : "Reviewer interpretation, not observed directly"}
                </span>
              </div>
              <p className="mt-1.5 text-app-body leading-[1.6] text-[var(--text-primary)]">{f.statement}</p>
              {f.citations.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {f.citations.map((c, i) => (
                    <Citation key={i} c={c} onOpen={setFile} />
                  ))}
                </div>
              ) : null}
              <div className="mt-1">{respondButton({ kind: "finding", id: f.id, label: `finding ${f.id}` })}</div>
              {formFor("finding", f.id)}
              <ResponseList items={responsesFor("finding", f.id)} />
            </li>
          ))}
        </ul>
        {file ? (
          <div className="mt-3">
            <FileViewer endpoint={`/api/eng/attempts/${attemptId}/file`} target={file} onClose={() => setFile(null)} />
          </div>
        ) : null}
      </PanelSection>

      <PanelSection title="Checks that ran">
        <ul className="grid gap-1 text-app-body text-[var(--text-secondary)]">
          {r.publicChecks.map((c) => (
            <li key={c.id}>
              Public test {c.id}, {c.title}: {OUTCOME_LABEL[c.outcome]}
            </li>
          ))}
          {r.hiddenChecks ? (
            <li>
              Hidden checks: {r.hiddenChecks.passed} of {r.hiddenChecks.total} passed. Their inputs stay private; the criteria above say which behavior each group covers.
            </li>
          ) : null}
        </ul>
      </PanelSection>

      <PanelSection>
        <div className="grid gap-5 sm:grid-cols-3">
          {(
            [
              ["Strengths", r.strengths],
              ["Gaps", r.gaps],
              ["Limits of this evidence", r.limitations],
            ] as const
          ).map(([label, items]) =>
            items.length ? (
              <div key={label}>
                <PanelLabel>{label}</PanelLabel>
                <ul className="mt-2 grid list-disc gap-1.5 pl-4 text-app-body leading-[1.55] text-[var(--text-secondary)]">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null
          )}
        </div>
      </PanelSection>

      <PanelSection
        title="Versions"
        description={openCount ? `${openCount} of your responses ${openCount === 1 ? "is" : "are"} open with the hiring team.` : "Earlier versions stay on record when the team releases a correction."}
      >
        <ul className="grid gap-1 text-app-body text-[var(--text-secondary)]">
          {r.versions.map((v) => (
            <li key={v.version}>
              v{v.version}
              {v.releasedAt ? `, released ${when(v.releasedAt)}` : ""}
              {v.current ? " (current)" : " (superseded)"}
              {v.changeReason ? `. What changed: ${v.changeReason}` : ""}
            </li>
          ))}
        </ul>
      </PanelSection>
    </Panel>
  );
}
