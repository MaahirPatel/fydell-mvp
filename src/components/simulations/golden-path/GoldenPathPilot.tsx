"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Circle, LoaderCircle, RotateCcw } from "lucide-react";
import type {
  EvidenceWorkerResult,
  GoldenPathRun,
} from "@/lib/sim-engine/golden-path/contracts";
import {
  acceptInvite,
  acceptWorkerResult,
  approveClaim,
  buildWorkerSnapshot,
  completeSimulation,
  createGoldenPathRun,
  rejectClaim,
  submitDefense,
  submitPreliminaryRecommendation,
} from "@/lib/sim-engine/golden-path/workflow";

const STORAGE_KEY = "fydell.sim-engine.dev.golden-path";
const DEFAULT_PRELIMINARY =
  "Recommend the OAuth proxy endpoint so Northstar can preserve its existing browser authentication flow.";
const DEFAULT_REVISION =
  "Replace the incompatible OAuth proxy endpoint with the supported server-to-server API using a scoped service account. Preserve the existing field mapping, validate in a sandbox, and require a successful production-shaped request before committing.";

const STAGES = [
  { key: "INVITED", label: "Invite" },
  { key: "IN_PROGRESS", label: "Simulation" },
  { key: "COMPLETED", label: "Pass A" },
  { key: "DEFENSE_REQUIRED", label: "Oral defense" },
  { key: "DEFENSE_COMPLETED", label: "Pass B" },
  { key: "REVIEW_REQUIRED", label: "Human review" },
  { key: "PUBLISHED", label: "Decision brief" },
] as const;

export function GoldenPathPilot() {
  const [run, setRun] = useState<GoldenPathRun>(() => createGoldenPathRun());
  const [hydrated, setHydrated] = useState(false);
  const [preliminary, setPreliminary] = useState(DEFAULT_PRELIMINARY);
  const [revision, setRevision] = useState(DEFAULT_REVISION);
  const [reviewerNote, setReviewerNote] = useState("Evidence links and before/after revision checked.");
  const [defenseAnswers, setDefenseAnswers] = useState<Record<string, string>>({});
  const [analysisState, setAnalysisState] = useState<"idle" | "running" | "error">("idle");
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (process.env.NODE_ENV !== "production") {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            setRun(JSON.parse(raw) as GoldenPathRun);
          } catch {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hydrated && process.env.NODE_ENV !== "production") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    }
  }, [hydrated, run]);

  const stageIndex = STAGES.findIndex((stage) => stage.key === run.status);
  const factReleased = run.events.some((event) => event.eventType === "FACT_RELEASED");
  const evidenceEvents = useMemo(() => {
    const ids = new Set([
      ...(run.claim?.supportingEventIds ?? []),
      ...(run.claim?.counterEventIds ?? []),
    ]);
    return run.events.filter((event) => ids.has(event.id));
  }, [run.claim, run.events]);

  async function runAnalysis() {
    setAnalysisState("running");
    setAnalysisError("");
    try {
      const response = await fetch("/api/lab/sim-engine/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildWorkerSnapshot(run)),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isWorkerResult(payload)) {
        const detail =
          isRecord(payload) && typeof payload.detail === "string"
            ? payload.detail
            : "The worker did not return a valid claim.";
        throw new Error(detail);
      }
      setRun((current) => acceptWorkerResult(current, payload));
      setAnalysisState("idle");
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : String(error));
      setAnalysisState("error");
    }
  }

  function reset() {
    if (process.env.NODE_ENV !== "production") window.localStorage.removeItem(STORAGE_KEY);
    setRun(createGoldenPathRun());
    setPreliminary(DEFAULT_PRELIMINARY);
    setRevision(DEFAULT_REVISION);
    setDefenseAnswers({});
    setAnalysisState("idle");
    setAnalysisError("");
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface-canvas)]">
        <LoaderCircle className="h-4 w-4 animate-spin text-[var(--text-tertiary)]" aria-hidden />
        <span className="ml-2 text-[13px] text-[var(--text-secondary)]">Loading pilot run</span>
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--surface-canvas)] px-4 py-8 text-[var(--text-primary)] sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-[560] tracking-[-0.02em]">Solutions Engineer pilot</h1>
            <p className="mt-2 max-w-[68ch] text-[14px] leading-6 text-[var(--text-secondary)]">
              One candidate, one changed fact, one evidence-backed claim. This isolated lab path does
              not write to production simulation tables.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset local lab state
          </button>
        </header>

        <div className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[var(--shadow-panel)]">
          <nav aria-label="Pilot progress" className="border-b border-[var(--border-subtle)]">
            <ol className="grid grid-cols-1 sm:grid-cols-5">
              {STAGES.map((stage, index) => {
                const complete = index < stageIndex || run.status === "PUBLISHED";
                const active = index === stageIndex;
                return (
                  <li
                    key={stage.key}
                    aria-current={active ? "step" : undefined}
                    className="flex min-h-11 items-center gap-2 border-b border-[var(--border-subtle)] px-3 last:border-b-0 sm:min-h-14 sm:border-b-0 sm:border-r sm:last:border-r-0"
                  >
                    {complete ? (
                      <Check className="h-3.5 w-3.5 text-[var(--fydell-good)]" aria-hidden />
                    ) : (
                      <Circle
                        className={`h-3.5 w-3.5 ${
                          active ? "fill-[var(--fydell-evidence)] text-[var(--fydell-evidence)]" : "text-[var(--text-disabled)]"
                        }`}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`text-[12px] ${
                        active ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {stage.label}
                      <span className="sr-only">
                        {complete ? ", complete" : active ? ", current step" : ", not started"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="p-5 sm:p-7">
              {run.status === "INVITED" ? (
                <InviteStep run={run} onAccept={() => setRun((current) => acceptInvite(current))} />
              ) : null}

              {run.status === "IN_PROGRESS" && !factReleased ? (
                <WorkStep
                  title="Commit a preliminary recommendation"
                  description="The material constraint releases only after this decision is committed."
                  value={preliminary}
                  onChange={setPreliminary}
                  actionLabel="Commit recommendation"
                  onAction={() =>
                    setRun((current) => submitPreliminaryRecommendation(current, preliminary))
                  }
                />
              ) : null}

              {run.status === "IN_PROGRESS" && factReleased ? (
                <WorkStep
                  title="The customer facts changed"
                  description="Northstar cannot use the selected OAuth proxy endpoint with its authentication setup. Revise the recommendation without discarding valid work."
                  value={revision}
                  onChange={setRevision}
                  actionLabel="Submit final artifact"
                  onAction={() => setRun((current) => completeSimulation(current, revision))}
                  changed
                />
              ) : null}

              {run.status === "COMPLETED" || run.status === "DEFENSE_COMPLETED" ? (
                <AnalysisStep
                  run={run}
                  state={analysisState}
                  error={analysisError}
                  onRun={runAnalysis}
                />
              ) : null}

              {run.status === "DEFENSE_REQUIRED" ? (
                <DefenseStep
                  run={run}
                  answers={defenseAnswers}
                  onAnswer={(questionId, value) =>
                    setDefenseAnswers((current) => ({ ...current, [questionId]: value }))
                  }
                  onSubmit={() => setRun((current) => submitDefense(current, defenseAnswers))}
                />
              ) : null}

              {run.status === "REVIEW_REQUIRED" && run.claim ? (
                <ReviewStep
                  run={run}
                  reviewerNote={reviewerNote}
                  onReviewerNote={setReviewerNote}
                  onApprove={() => setRun((current) => approveClaim(current, reviewerNote))}
                  onReject={() => setRun((current) => rejectClaim(current, reviewerNote))}
                />
              ) : null}

              {run.status === "PUBLISHED" && run.brief && run.claim ? (
                <BriefStep run={run} />
              ) : null}
            </section>

            <aside className="border-t border-[var(--border-subtle)] bg-[var(--surface-deep)] lg:border-l lg:border-t-0">
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <h2 className="text-[13px] font-medium">Ordered evidence ledger</h2>
                <p className="mt-1 text-[11px] leading-5 text-[var(--text-tertiary)]">
                  Sequence is assigned by this isolated lab workflow. Production DB durability is not
                  enabled in this phase.
                </p>
              </div>
              <ol className="max-h-[560px] overflow-y-auto">
                {run.events.length ? (
                  run.events.map((event) => {
                    const linked = evidenceEvents.some((item) => item.id === event.id);
                    return (
                      <li
                        key={event.id}
                        className={`grid grid-cols-[28px_1fr] gap-2 border-b border-[var(--border-subtle)] px-4 py-3 ${
                          linked ? "bg-[var(--surface-selected)]" : ""
                        }`}
                      >
                        <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                          {String(event.sequence).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <div className="break-words text-[11px] font-medium text-[var(--text-primary)]">
                            {event.eventType.replaceAll("_", " ")}
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                            {event.source} · {event.id.slice(0, 18)}
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="px-4 py-8 text-center text-[12px] text-[var(--text-tertiary)]">
                    No events recorded yet.
                  </li>
                )}
              </ol>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}

function InviteStep({ run, onAccept }: { run: GoldenPathRun; onAccept: () => void }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-[20px] font-[520] tracking-[-0.02em]">Candidate invitation ready</h2>
      <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
        {run.candidateLabel} has been invited to investigate a customer integration decision for the
        Solutions Engineer pilot.
      </p>
      <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <FactRow label="Role" value="Solutions Engineer" />
        <FactRow label="Scenario version" value={run.scenarioVersion} mono />
        <FactRow label="Recording" value="Work actions, artifact revisions, and world events" />
      </div>
      <PrimaryAction onClick={onAccept}>Accept invite and begin</PrimaryAction>
    </div>
  );
}

function WorkStep(props: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  actionLabel: string;
  onAction: () => void;
  changed?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <div className={props.changed ? "rounded-[var(--radius-panel)] border border-[var(--fydell-changed)]/40 bg-[var(--surface-panel)] p-4" : ""}>
        <h2 className="text-[20px] font-[520] tracking-[-0.02em]">{props.title}</h2>
        <p className="mt-2 max-w-[65ch] text-[14px] leading-6 text-[var(--text-secondary)]">
          {props.description}
        </p>
      </div>
      <label className="mt-6 block text-[12px] font-medium text-[var(--text-secondary)]" htmlFor="recommendation">
        Recommendation artifact
      </label>
      <textarea
        id="recommendation"
        className="platform-input mt-2 min-h-52 resize-y"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <PrimaryAction onClick={props.onAction} disabled={!props.value.trim()}>
        {props.actionLabel}
      </PrimaryAction>
    </div>
  );
}

function AnalysisStep(props: {
  run: GoldenPathRun;
  state: "idle" | "running" | "error";
  error: string;
  onRun: () => void;
}) {
  const pass = props.run.status === "COMPLETED" ? "A" : "B";
  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-[520] tracking-[-0.02em]">
        {pass === "A" ? "Analysis job queued" : "Final analysis job queued"}
      </h2>
      <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
        {pass === "A"
          ? "The worker receives a permitted snapshot: ordered events, both artifact revisions, scenario version, rubric version, and the canonical changed fact."
          : "Pass B receives everything pass A saw, plus the initial claim and the candidate's defense responses, and decides whether the explanation strengthens or weakens the claim."}
      </p>
      <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <FactRow label="Job type" value={props.run.analysisJob?.jobType ?? ""} mono />
        <FactRow label="Status" value={props.run.analysisJob?.status ?? ""} />
        <FactRow label="Idempotency key" value={props.run.analysisJob?.idempotencyKey ?? ""} mono />
      </div>
      {props.state === "error" ? (
        <p role="alert" className="mt-4 text-[12px] leading-5 text-[var(--fydell-risk)]">
          {props.error} Check that Python is available, then retry.
        </p>
      ) : null}
      <PrimaryAction onClick={props.onRun} disabled={props.state === "running"}>
        {props.state === "running" ? `Running Python pass ${pass}…` : `Run Python pass ${pass}`}
      </PrimaryAction>
    </div>
  );
}

function DefenseStep(props: {
  run: GoldenPathRun;
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void;
}) {
  const claim = props.run.initialClaim;
  const questions = props.run.defenseQuestions;
  if (!claim || questions.length === 0) return null;
  const complete = questions.every((question) => props.answers[question.id]?.trim());
  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-[520] tracking-[-0.02em]">Defend the decision</h2>
      <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
        Pass A read the work and produced a provisional claim. Before it becomes evidence, the
        candidate explains the judgement behind it. The answers are recorded as candidate events and
        re-analysed in pass B.
      </p>
      <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <FactRow label="Provisional claim" value={claim.statement} />
        <FactRow label="Direction" value={claim.direction} />
        <FactRow label="Confidence" value={claim.confidence} />
      </div>
      {questions.map((question, index) => (
        <div key={question.id} className="mt-6">
          <label
            className="block text-[12px] font-medium text-[var(--text-secondary)]"
            htmlFor={`defense-${question.id}`}
          >
            Question {index + 1} · {question.target}
          </label>
          <p className="defense-question mt-2 text-[var(--text-primary)]">{question.prompt}</p>
          <textarea
            id={`defense-${question.id}`}
            className="platform-input mt-3 min-h-32 resize-y"
            value={props.answers[question.id] ?? ""}
            onChange={(event) => props.onAnswer(question.id, event.target.value)}
          />
        </div>
      ))}
      <PrimaryAction onClick={props.onSubmit} disabled={!complete}>
        Submit defense
      </PrimaryAction>
    </div>
  );
}

function ReviewStep(props: {
  run: GoldenPathRun;
  reviewerNote: string;
  onReviewerNote: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const claim = props.run.claim;
  if (!claim) return null;
  return (
    <div className="max-w-3xl">
      <h2 className="text-[20px] font-[520] tracking-[-0.02em]">Review the generated claim</h2>
      <p className="mt-3 text-[15px] leading-7 text-[var(--text-primary)]">{claim.statement}</p>
      <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
        <FactRow label="Competency" value={claim.competency} />
        <FactRow label="Direction" value={claim.direction} />
        <FactRow label="Confidence" value={claim.confidence} />
        <FactRow label="Evidence links" value={`${claim.supportingEventIds.length} supporting · ${claim.counterEventIds.length} counter`} />
      </div>
      <label className="mt-6 block text-[12px] font-medium text-[var(--text-secondary)]" htmlFor="review-note">
        Reviewer note
      </label>
      <textarea
        id="review-note"
        className="platform-input mt-2 min-h-24 resize-y"
        value={props.reviewerNote}
        onChange={(event) => props.onReviewerNote(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <PrimaryAction onClick={props.onApprove} disabled={!props.reviewerNote.trim()}>
          Approve claim and publish brief
        </PrimaryAction>
        <button
          type="button"
          onClick={props.onReject}
          disabled={!props.reviewerNote.trim()}
          className="mt-6 inline-flex h-10 items-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 text-[13px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Do not approve · publish insufficient evidence
        </button>
      </div>
    </div>
  );
}

function BriefStep({ run }: { run: GoldenPathRun }) {
  if (!run.brief || !run.claim) return null;
  return (
    <article className="max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-[520] tracking-[-0.02em]">Decision brief</h2>
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {run.candidateLabel} · Solutions Engineer
          </p>
        </div>
        <span className="rounded-[var(--radius-tag)] border border-[var(--fydell-changed)]/40 px-2 py-1 text-[11px] text-[var(--fydell-changed)]">
          Synthetic lab brief
        </span>
      </div>
      <div className="mt-8 border-y border-[var(--border-subtle)] py-6">
        <div className="text-[12px] text-[var(--text-tertiary)]">Recommendation</div>
        <div className="mt-2 text-[17px] font-medium">
          {run.brief.recommendation === "WORTH_INTERVIEWING"
            ? "Lab recommendation · worth interviewing"
            : "More evidence needed"}
        </div>
        <p className="mt-4 text-[14px] leading-7 text-[var(--text-secondary)]">{run.brief.why}</p>
      </div>
      <section className="mt-8">
        <h3 className="text-[15px] font-medium">Structured interview probes</h3>
        <ol className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {run.brief.interviewProbes.map((probe, index) => (
            <li key={probe} className="grid grid-cols-[28px_1fr] gap-3 py-3 text-[13px] leading-6 text-[var(--text-secondary)]">
              <span className="font-mono text-[11px] tabular-nums text-[var(--text-tertiary)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              {probe}
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-6 text-[11px] leading-5 text-[var(--text-tertiary)]">
        Claim {run.claim.id} · {run.claim.supportingEventIds.length} supporting events ·{" "}
        {run.claim.sourceArtifactIds.length} artifact revisions ·{" "}
        {run.claim.reviewStatus === "PUBLISHED" ? "human approved" : "not approved"}
      </p>
    </article>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr]">
      <div className="text-[12px] text-[var(--text-tertiary)]">{label}</div>
      <div className={`${mono ? "font-mono" : ""} break-words text-[12px] text-[var(--text-primary)]`}>
        {value}
      </div>
    </div>
  );
}

function PrimaryAction({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-6 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--control-solid)] px-4 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors hover:bg-[var(--control-solid-hover)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function isWorkerResult(value: unknown): value is EvidenceWorkerResult {
  return (
    isRecord(value) &&
    value.resultVersion === "1" &&
    typeof value.runId === "string" &&
    isRecord(value.claim) &&
    value.claim.competency === "ADAPTATION" &&
    typeof value.claim.statement === "string" &&
    Array.isArray(value.claim.supportingEventIds) &&
    Array.isArray(value.claim.counterEventIds) &&
    Array.isArray(value.claim.sourceArtifactIds)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
