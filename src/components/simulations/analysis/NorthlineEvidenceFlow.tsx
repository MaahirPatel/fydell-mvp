"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SimulationAttempt, SimulationScenarioDefinition } from "@/lib/sim-engine/types";
import type {
  NorthlineEvidenceClaim,
  NorthlinePassAResult,
  NorthlinePassBResult,
} from "@/lib/sim-engine/analysis/northlineEvaluator";
import {
  acceptNorthlinePassB,
  createNorthlineEvidenceWorkflow,
  northlineWorkflowStorageKey,
  publishNorthlineBrief,
  recordNorthlineDefense,
  type NorthlineEvidenceWorkflow,
} from "@/lib/sim-engine/analysis/northlineWorkflow";
import type { LabEventStream } from "@/lib/sim-engine/events/labEventLedger";

type AnalysisState = "loading" | "ready" | "running" | "error";

const DIRECTION_LABEL = {
  STRENGTH: "Strength",
  CONCERN: "Concern",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
} as const;

const CONFIDENCE_LABEL = {
  HIGH: "High confidence",
  MODERATE: "Moderate confidence",
  LOW: "Low confidence",
} as const;

export function NorthlineEvidenceFlow({
  scenario,
  attempt,
}: {
  scenario: SimulationScenarioDefinition;
  attempt: SimulationAttempt;
}) {
  const [workflow, setWorkflow] = useState<NorthlineEvidenceWorkflow | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("loading");
  const [error, setError] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [reviewerNote, setReviewerNote] = useState(
    "Event links, changed-fact order, artifact revision, and defense responses reviewed."
  );
  const [activeStream, setActiveStream] = useState<LabEventStream>("WORLD");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const key = northlineWorkflowStorageKey(attempt.id);
      const saved = window.localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as NorthlineEvidenceWorkflow;
          if (!cancelled && parsed.attemptId === attempt.id) {
            setWorkflow(parsed);
            setResponses(parsed.defenseResponses);
            setAnalysisState("ready");
            return;
          }
        } catch {
          window.localStorage.removeItem(key);
        }
      }

      try {
        const passA = await requestNorthlineAnalysis<NorthlinePassAResult>(
          scenario,
          attempt,
          "A",
          []
        );
        if (cancelled) return;
        const created = createNorthlineEvidenceWorkflow(scenario, attempt, passA);
        window.localStorage.setItem(key, JSON.stringify(created));
        setWorkflow(created);
        setAnalysisState("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setAnalysisState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, scenario]);

  function persist(next: NorthlineEvidenceWorkflow) {
    window.localStorage.setItem(northlineWorkflowStorageKey(attempt.id), JSON.stringify(next));
    setWorkflow(next);
  }

  async function submitDefense() {
    if (!workflow) return;
    setAnalysisState("running");
    setError("");
    try {
      const recorded = recordNorthlineDefense(workflow, responses);
      const defenseEvents = recorded.ledger.candidate
        .filter((event) => event.eventType === "DEFENSE_RESPONSE_SUBMITTED")
        .map((event) => ({
          eventId: event.id,
          response:
            typeof event.payload.response === "string" ? event.payload.response : "",
        }));
      const passB = await requestNorthlineAnalysis<NorthlinePassBResult>(
        scenario,
        attempt,
        "B",
        defenseEvents
      );
      persist(acceptNorthlinePassB(recorded, passB));
      setAnalysisState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setAnalysisState("error");
    }
  }

  if (analysisState === "loading" || !workflow) {
    return (
      <div className="p-8 text-app-body text-[var(--text-secondary)]">
        Producing provisional observations and defense questions
      </div>
    );
  }

  const responseComplete = workflow.defenseQuestions.every(
    (question) => responses[question.id]?.trim()
  );
  const streamEvents = workflow.ledger[activeStream.toLowerCase() as "world" | "candidate" | "telemetry" | "system"];

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-8">
      <header className="mb-6">
        <h1 className="text-app-page font-medium text-[var(--text-primary)]">
          Northline evidence review
        </h1>
        <p className="mt-2 max-w-[70ch] text-app-body leading-6 text-[var(--text-secondary)]">
          Pass A is provisional. Candidate defense is analysed in Pass B, then a human decides
          whether the claims are fit to publish.
        </p>
      </header>

      {error ? (
        <p role="alert" className="mb-4 border-y border-[var(--fydell-risk)] py-3 text-app-meta text-[var(--fydell-risk)]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
          {workflow.stage === "DEFENSE_REQUIRED" ? (
            <>
              <h2 className="text-app-section font-medium text-[var(--text-primary)]">
                Pass A: provisional claims
              </h2>
              <ClaimList claims={workflow.passAClaims} />
              <div className="mt-8 border-t border-[var(--border-default)] pt-6">
                <h2 className="text-app-section font-medium text-[var(--text-primary)]">
                  Candidate defense
                </h2>
                <p className="mt-2 text-app-body text-[var(--text-secondary)]">
                  Answer in your own words. A hollow answer remains evidence and can weaken the
                  final claim.
                </p>
                {workflow.defenseQuestions.map((question, index) => (
                  <label key={question.id} className="mt-5 block text-app-meta text-[var(--text-secondary)]">
                    Question {index + 1}: {question.prompt}
                    <textarea
                      aria-label={`Defense answer ${index + 1}`}
                      className="platform-input mt-2 min-h-28 w-full resize-y p-3 text-app-body"
                      value={responses[question.id] ?? ""}
                      onChange={(event) =>
                        setResponses((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
                <Button
                  className="mt-5"
                  variant="primary"
                  disabled={!responseComplete || analysisState === "running"}
                  onClick={() => void submitDefense()}
                >
                  {analysisState === "running" ? "Producing Pass B" : "Submit defense"}
                </Button>
              </div>
            </>
          ) : null}

          {workflow.stage === "REVIEW_REQUIRED" ? (
            <>
              <h2 className="text-app-section font-medium text-[var(--text-primary)]">
                Pass B: final claims
              </h2>
              <ClaimList claims={workflow.passBClaims} />
              <div className="mt-8 border-t border-[var(--border-default)] pt-6">
                <h2 className="text-app-section font-medium text-[var(--text-primary)]">
                  Human approval
                </h2>
                <textarea
                  aria-label="Reviewer note"
                  className="platform-input mt-3 min-h-24 w-full resize-y p-3 text-app-body"
                  value={reviewerNote}
                  onChange={(event) => setReviewerNote(event.target.value)}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={!reviewerNote.trim()}
                    onClick={() => persist(publishNorthlineBrief(workflow, reviewerNote, true))}
                  >
                    Approve and publish brief
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!reviewerNote.trim()}
                    onClick={() => persist(publishNorthlineBrief(workflow, reviewerNote, false))}
                  >
                    Publish insufficient evidence
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          {workflow.stage === "PUBLISHED" && workflow.brief ? (
            <article>
              <h2 className="text-app-section font-medium text-[var(--text-primary)]">
                Published decision brief
              </h2>
              <p className="mt-2 text-app-meta text-[var(--text-tertiary)]">
                Candidate 1 · Data Analyst · human reviewed
              </p>
              <div className="mt-6 border-y border-[var(--border-default)] py-5">
                <p className="text-app-meta text-[var(--text-tertiary)]">Recommendation</p>
                <p className="mt-1 text-app-section font-medium text-[var(--text-primary)]">
                  {workflow.brief.recommendation === "WORTH_INTERVIEWING"
                    ? "Worth interviewing"
                    : "More evidence needed"}
                </p>
                <p className="mt-4 text-app-body leading-6 text-[var(--text-secondary)]">
                  {workflow.brief.why}
                </p>
              </div>
              <section className="mt-6">
                <h3 className="text-app-body font-medium text-[var(--text-primary)]">
                  Claims and evidence
                </h3>
                <ClaimList claims={workflow.passBClaims} />
              </section>
              <section className="mt-6 border-y border-[var(--border-subtle)] py-4">
                <h3 className="text-app-body font-medium text-[var(--text-primary)]">
                  Remaining uncertainty
                </h3>
                <p className="mt-2 text-app-body leading-6 text-[var(--text-secondary)]">
                  This run covers one bounded plant-analysis simulation and typed defense. It does
                  not establish repeated performance, live stakeholder communication, or a causal
                  explanation for the L2 Day residual.
                </p>
              </section>
              <h3 className="mt-6 text-app-body font-medium text-[var(--text-primary)]">
                Interview questions produced
              </h3>
              <ol className="mt-2 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                {workflow.brief.interviewProbes.map((probe, index) => (
                  <li key={probe} className="grid grid-cols-[24px_1fr] gap-2 py-3 text-app-body text-[var(--text-secondary)]">
                    <span className="font-mono text-app-meta text-[var(--text-tertiary)]">
                      {index + 1}
                    </span>
                    {probe}
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">
                Reviewer note: {workflow.brief.reviewerNote}
              </p>
            </article>
          ) : null}
        </section>

        <aside className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)]">
          <div className="border-b border-[var(--border-default)] p-3">
            <h2 className="text-app-body font-medium text-[var(--text-primary)]">
              Separated event streams
            </h2>
            <p className="mt-1 text-app-meta leading-5 text-[var(--text-tertiary)]">
              Browser-local sequence is a development stand-in. Production analysis requires
              Postgres-assigned canonical sequence.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] p-2">
            {(["WORLD", "CANDIDATE", "TELEMETRY", "SYSTEM"] as const).map((stream) => (
              <button
                key={stream}
                type="button"
                onClick={() => setActiveStream(stream)}
                className={
                  activeStream === stream
                    ? "rounded-[var(--radius-control)] bg-[var(--surface-selected)] px-2 py-1 text-app-meta text-[var(--text-primary)]"
                    : "rounded-[var(--radius-control)] px-2 py-1 text-app-meta text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                }
              >
                {stream[0] + stream.slice(1).toLowerCase()} (
                {workflow.ledger[stream.toLowerCase() as "world" | "candidate" | "telemetry" | "system"].length})
              </button>
            ))}
          </div>
          <ol className="max-h-[620px] overflow-auto">
            {streamEvents.map((event) => (
              <li key={event.id} className="grid grid-cols-[28px_1fr] gap-2 border-b border-[var(--border-subtle)] px-3 py-2.5">
                <span className="font-mono text-app-meta tabular-nums text-[var(--text-tertiary)]">
                  {event.localSequence}
                </span>
                <div>
                  <p className="break-words text-app-meta text-[var(--text-primary)]">
                    {event.eventType.replaceAll("_", " ").toLowerCase()}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                    {event.id}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </main>
  );
}

function ClaimList({ claims }: { claims: NorthlineEvidenceClaim[] }) {
  return (
    <ul className="mt-4 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
      {claims.map((claim) => (
        <li key={claim.id} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-app-body font-medium text-[var(--text-primary)]">
              {claim.competencyId.replaceAll("_", " ")}
            </p>
            <p className="text-app-meta text-[var(--text-secondary)]">
              {DIRECTION_LABEL[claim.direction]} · {CONFIDENCE_LABEL[claim.confidence]}
            </p>
          </div>
          <p className="mt-2 text-app-body leading-6 text-[var(--text-secondary)]">
            {claim.statement}
          </p>
          <p className="mt-2 font-mono text-[11px] text-[var(--text-tertiary)]">
            {claim.supportingEventIds.length} supporting · {claim.counterEventIds.length} counter ·{" "}
            {claim.rubricVersion} · {claim.promptVersion} · {claim.modelVersion}
          </p>
        </li>
      ))}
    </ul>
  );
}

async function requestNorthlineAnalysis<T>(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  analysisPass: "A" | "B",
  defenseResponses: Array<{ eventId: string; response: string }>
): Promise<T> {
  const response = await fetch("/api/lab/sim-engine/evidence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "NORTHLINE_EVIDENCE",
      scenarioId: scenario.metadata.id,
      analysisPass,
      attempt,
      defenseResponses,
    }),
  });
  const payload: unknown = await response.json();
  if (!response.ok || typeof payload !== "object" || payload === null) {
    throw new Error("Northline evidence analysis did not return a valid result.");
  }
  return payload as T;
}
