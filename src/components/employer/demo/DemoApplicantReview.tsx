"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { DiffView, TestList } from "@/components/sandbox/demo/ui";
import { WrittenEvidencePanel } from "@/components/sandbox/demo/ReportView";
import { runFiles } from "@/components/sandbox/demo/useTestRun";
import { DEMO_HOME, DEMO_TASK_PATH, demoScenarioOrThrow, type DemoProject } from "@/lib/employer-demo/fixtures";
import { CRITERION_STATE_LABEL, deriveReport, type CriterionOutcome, type CriterionState, type Report } from "@/lib/sandbox-demo/report";
import { DECISIONS, type DecisionValue, type Handoff } from "@/lib/sandbox-demo/state";
import type { RunRecord } from "@/lib/sandbox-demo/types";

export type ReviewApplicant = {
  key: string;
  name: string;
  headline: string;
  source: "fixture" | "sample";
  files: Record<string, string>;
  handoff: Handoff;
  submittedAt: string;
  projects: DemoProject[];
};
export type ReviewDecision = { id: string; decision: DecisionValue; privateNote: string | null; decidedByYou: boolean; decidedAt: string };
export type ReviewMessage = { id: string; author: "reviewer" | "applicant"; requirementId: string | null; body: string; createdAt: string };

const DECISION_LABEL: Record<DecisionValue, string> = { advance: "Advance", hold: "Hold", decline: "Decline" };
const STATE_TONE: Record<CriterionState, StatusTone> = {
  demonstrated: "good",
  partially_demonstrated: "changed",
  concern_observed: "risk",
  not_assessed: "neutral",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Server and browser time zones differ, so the browser's local rendering wins without a hydration error. */
function Timestamp({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {when(iso)}
    </time>
  );
}

type RunState = { kind: "running" } | { kind: "done"; run: RunRecord; report: Report } | { kind: "failed"; message: string };

export default function DemoApplicantReview({
  applicant,
  decisions,
  messages,
}: {
  applicant: ReviewApplicant;
  decisions: ReviewDecision[];
  messages: ReviewMessage[];
}) {
  const scenario = useMemo(() => demoScenarioOrThrow(), []);
  const [attempt, setAttempt] = useState(0);
  const [runState, setRunState] = useState<RunState>({ kind: "running" });

  useEffect(() => {
    let live = true;
    runFiles(scenario, applicant.files, "all").then(
      (run) => {
        if (live) setRunState({ kind: "done", run, report: deriveReport(scenario, applicant.files, run.results) });
      },
      (error: unknown) => {
        if (live) setRunState({ kind: "failed", message: error instanceof Error ? error.message : "The test runner stopped unexpectedly." });
      },
    );
    return () => {
      live = false;
    };
  }, [scenario, applicant.files, attempt]);

  const rerun = () => {
    setRunState({ kind: "running" });
    setAttempt((n) => n + 1);
  };

  const reviewPath = `${DEMO_HOME}/applicants/${applicant.key}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid min-w-0 content-start gap-6">
        <Panel>
          <PanelSection
            title="Test run"
            description={`The submitted files below were run against the ${scenario.tests.length} public and protected tests in your browser when you opened this page. Change the submission and this report changes with it.`}
            action={
              <Button variant="secondary" size="sm" onClick={rerun} loading={runState.kind === "running"}>
                Run the tests again
              </Button>
            }
          >
            {runState.kind === "running" ? <p role="status" className="text-app-body text-[var(--text-secondary)]">Running the tests in your browser.</p> : null}
            {runState.kind === "failed" ? (
              <p role="alert" className="text-app-body text-[var(--fydell-risk)]">
                The tests did not finish: {runState.message} Run them again; the submission is unchanged.
              </p>
            ) : null}
            {runState.kind === "done" ? (
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-app-body text-[var(--text-primary)]">
                <span>Public tests: {runState.report.publicTests.passed} of {runState.report.publicTests.total} passed</span>
                <span>Protected tests: {runState.report.protectedTests.passed} of {runState.report.protectedTests.total} passed</span>
                <span className="text-[var(--text-secondary)]">Finished {when(runState.run.at)} in {runState.run.durationMs} ms</span>
                {runState.run.outcomeMessage ? <span className="text-[var(--fydell-risk)]">{runState.run.outcomeMessage}</span> : null}
              </div>
            ) : null}
          </PanelSection>
        </Panel>

        <Panel aria-label="Requirement evidence">
          <PanelSection title="Requirement evidence" description="Each state comes from the tests listed under it. There are no scores." />
          {scenario.criteria.map((c) => {
            const outcome = runState.kind === "done" ? runState.report.criteria.find((o) => o.criterion.id === c.id) : undefined;
            const thread = messages.filter((m) => m.requirementId === c.id);
            return (
              <PanelSection
                key={c.id}
                title={c.text}
                action={outcome ? <StatusTag tone={STATE_TONE[outcome.state]}>{CRITERION_STATE_LABEL[outcome.state]}</StatusTag> : null}
              >
                {outcome ? (
                  <div className="grid gap-3">
                    <p className="text-app-body text-[var(--text-secondary)]">{outcome.reason}</p>
                    {outcome.tests.length > 0 ? <TestList audience="evaluator" rows={outcome.tests} /> : null}
                    {thread.length > 0 ? (
                      <p className="text-app-meta text-[var(--text-secondary)]">
                        {thread.length === 1 ? "One message" : `${thread.length} messages`} in the follow-up thread about this requirement.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-app-body text-[var(--text-tertiary)]">Waiting for the test run.</p>
                )}
              </PanelSection>
            );
          })}
        </Panel>

        <WrittenEvidencePanel scenario={scenario} handoff={applicant.handoff} transcript={[]} />

        <Panel>
          <PanelSection title="Submitted changes" description="Compared with the starter code the applicant received.">
            {runState.kind === "done" ? (
              runState.report.diffs.length > 0 ? (
                <div className="max-h-[560px] overflow-auto rounded-[var(--radius-frame)] border border-[var(--border-subtle)]">
                  <DiffView diffs={runState.report.diffs} />
                </div>
              ) : (
                <p className="text-app-body text-[var(--text-secondary)]">The starter code was submitted unchanged.</p>
              )
            ) : (
              <p className="text-app-body text-[var(--text-tertiary)]">Shown once the tests have run.</p>
            )}
          </PanelSection>
        </Panel>

        {applicant.projects.length > 0 ? (
          <Panel>
            <PanelSection title="Projects" description="Listed by the applicant. Fictional, like everything in this workspace.">
              <ul className="grid gap-4">
                {applicant.projects.map((p) => (
                  <li key={p.name} className="grid gap-1">
                    <span className="text-app-body font-medium text-[var(--text-primary)]">{p.name}</span>
                    <span className="text-app-body text-[var(--text-secondary)]">{p.summary}</span>
                    <span className="text-app-meta text-[var(--text-tertiary)]">
                      {p.stack}. Evidence offered: {p.evidence}.
                    </span>
                  </li>
                ))}
              </ul>
            </PanelSection>
          </Panel>
        ) : null}
      </div>

      <aside className="grid min-w-0 content-start gap-6 xl:sticky xl:top-6 xl:self-start">
        <DecisionBrief runState={runState} handoff={applicant.handoff} messages={messages} />
        <DecisionForm applicantKey={applicant.key} decisions={decisions} />
        <FollowUpThread applicantKey={applicant.key} messages={messages} />
        {applicant.source === "sample" ? (
          <Panel>
            <PanelSection title="Your sample submission" description="Open the task again as the applicant. Your next submission replaces this one and its decisions.">
              <Link href={`${DEMO_TASK_PATH}?return=${encodeURIComponent(reviewPath)}`} className="text-app-body font-medium text-[var(--text-primary)] underline underline-offset-2">
                Open the task as the applicant
              </Link>
            </PanelSection>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}

function DecisionBrief({ runState, handoff, messages }: { runState: RunState; handoff: Handoff; messages: ReviewMessage[] }) {
  const scenario = useMemo(() => demoScenarioOrThrow(), []);
  if (runState.kind !== "done") {
    return (
      <Panel>
        <PanelSection title="Decision brief" description="Written from the test run once it finishes." />
      </Panel>
    );
  }
  const by = (states: CriterionState[]) => runState.report.criteria.filter((o) => states.includes(o.state));
  const strong = by(["demonstrated"]);
  const gaps = by(["partially_demonstrated", "concern_observed"]);
  const unknown = by(["not_assessed"]);
  const answered = new Set(messages.filter((m) => m.author === "applicant").map((m) => m.requirementId));
  const open = messages.filter((m) => m.author === "reviewer" && !answered.has(m.requirementId));
  const name = (id: string | null) => scenario.criteria.find((c) => c.id === id)?.text ?? "General question";

  const list = (items: CriterionOutcome[]) => (
    <ul className="mt-1.5 grid gap-1.5">
      {items.map((o) => (
        <li key={o.criterion.id} className="text-app-body text-[var(--text-primary)]">
          {o.criterion.text}
        </li>
      ))}
    </ul>
  );

  return (
    <Panel>
      <PanelSection title="Decision brief" description="Assembled from the evidence on this page. It does not recommend an outcome.">
        <div className="grid gap-4">
          <div>
            <PanelLabel>Demonstrated</PanelLabel>
            {strong.length > 0 ? list(strong) : <p className="mt-1.5 text-app-body text-[var(--text-secondary)]">No requirement was fully demonstrated.</p>}
          </div>
          {gaps.length > 0 ? (
            <div>
              <PanelLabel>Partial or concerning</PanelLabel>
              {list(gaps)}
            </div>
          ) : null}
          {unknown.length > 0 ? (
            <div>
              <PanelLabel>Not assessed</PanelLabel>
              {list(unknown)}
            </div>
          ) : null}
          {handoff.unresolved.trim() ? (
            <div>
              <PanelLabel>What the applicant left open</PanelLabel>
              <p className="mt-1.5 text-app-body text-[var(--text-primary)]">{handoff.unresolved}</p>
            </div>
          ) : null}
          <div>
            <PanelLabel>Unanswered follow-up questions</PanelLabel>
            {open.length > 0 ? (
              <ul className="mt-1.5 grid gap-1.5">
                {open.map((m) => (
                  <li key={m.id} className="text-app-body text-[var(--text-primary)]">
                    {name(m.requirementId)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-app-body text-[var(--text-secondary)]">None.</p>
            )}
          </div>
        </div>
      </PanelSection>
    </Panel>
  );
}

function DecisionForm({ applicantKey, decisions }: { applicantKey: string; decisions: ReviewDecision[] }) {
  const router = useRouter();
  const [decision, setDecision] = useState<DecisionValue | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!decision) {
      setError("Choose Advance, Hold or Decline.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/demo/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantKey, decision, privateNote: note.trim() || null }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "The decision was not saved.");
        return;
      }
      setSaved(true);
      setDecision(null);
      setNote("");
      router.refresh();
    } catch {
      setError("The decision could not reach the server. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <PanelSection title="Sandbox decision" description="Saved to this demo workspace only. The applicant is fictional and is not notified.">
        <fieldset className="grid gap-3">
          <legend className="sr-only">Decision</legend>
          <div className="flex flex-wrap gap-2">
            {DECISIONS.map((d) => (
              <Button
                key={d}
                variant={decision === d ? "primary" : "secondary"}
                size="sm"
                aria-pressed={decision === d}
                onClick={() => {
                  setDecision(d);
                  setSaved(false);
                }}
              >
                {DECISION_LABEL[d]}
              </Button>
            ))}
          </div>
          <Field label="Private note" htmlFor="demo-private-note" optional help="Visible only to you in this demo workspace.">
            <Textarea id="demo-private-note" rows={3} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={() => void save()} loading={saving}>
              Save decision
            </Button>
            {saved ? <span role="status" className="text-app-meta text-[var(--text-secondary)]">Saved. Nobody was notified.</span> : null}
          </div>
          {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
        </fieldset>
        {decisions.length > 0 ? (
          <div className="mt-5">
            <PanelLabel>History</PanelLabel>
            <ul className="mt-2 grid gap-2.5">
              {decisions.map((d) => (
                <li key={d.id} className="text-app-body">
                  <span className="font-medium text-[var(--text-primary)]">{DECISION_LABEL[d.decision]}</span>
                  <span className="text-[var(--text-secondary)]">
                    {" "}by {d.decidedByYou ? "you" : "another reviewer"}, <Timestamp iso={d.decidedAt} />
                  </span>
                  {d.privateNote ? <span className="mt-0.5 block text-[var(--text-secondary)]">{d.privateNote}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </PanelSection>
    </Panel>
  );
}

function FollowUpThread({ applicantKey, messages }: { applicantKey: string; messages: ReviewMessage[] }) {
  const router = useRouter();
  const scenario = useMemo(() => demoScenarioOrThrow(), []);
  const [body, setBody] = useState("");
  const [requirementId, setRequirementId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const name = (id: string | null) => scenario.criteria.find((c) => c.id === id)?.text ?? null;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/demo/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantKey, body, requirementId: requirementId || null }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "The question was not saved.");
        return;
      }
      setBody("");
      setSent(true);
      router.refresh();
    } catch {
      setError("The question could not reach the server. Your text is still here.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel>
      <PanelSection title="Follow-up thread" description="Simulated. Questions are saved to this demo; nobody is emailed and the fictional applicants do not reply to new questions.">
        {messages.length > 0 ? (
          <ul className="grid gap-3">
            {messages.map((m) => (
              <li key={m.id} className="rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 py-2.5">
                <p className="text-app-meta text-[var(--text-secondary)]">
                  {m.author === "reviewer" ? "Reviewer" : "Applicant"}, <Timestamp iso={m.createdAt} />
                  {name(m.requirementId) ? `. About: ${name(m.requirementId)}` : ""}
                </p>
                <p className="mt-1 text-app-body text-[var(--text-primary)]">{m.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-app-body text-[var(--text-secondary)]">No questions yet.</p>
        )}
        <div className="mt-4 grid gap-3">
          <Field label="Requirement" htmlFor="demo-thread-requirement" optional>
            <Select id="demo-thread-requirement" value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
              <option value="">General question</option>
              {scenario.criteria.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.text}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Question" htmlFor="demo-thread-body">
            <Textarea
              id="demo-thread-body"
              rows={3}
              maxLength={2000}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setSent(false);
              }}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void send()} loading={sending} disabled={!body.trim()}>
              Add to thread
            </Button>
            {sent ? <span role="status" className="text-app-meta text-[var(--text-secondary)]">Added. No email was sent.</span> : null}
          </div>
          {error ? <p role="alert" className="text-app-meta text-[var(--fydell-risk)]">{error}</p> : null}
        </div>
      </PanelSection>
    </Panel>
  );
}
