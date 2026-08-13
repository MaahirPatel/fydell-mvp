"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmployerReviewActions from "@/components/employer/EmployerReviewActions";
import { EvidenceReportV2 } from "@/components/sim/EvidenceReportV2";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { Surface } from "@/components/ui/Surface";
import { isV2PersistedResult, type V2PersistedResult } from "@/lib/simulations/v2/scoring";

interface Competency {
  key: string;
  label: string;
  band: string;
  bandLabel: string;
  confidence: number;
  coverage: number;
  critical: boolean;
  summary: string;
}
interface Evidence {
  competencyKey: string;
  indicator: string;
  source: string;
  quality: number;
  excerpts: string[];
  counterevidence: string | null;
  explanation: string | null;
}
interface Report {
  ready: boolean;
  message?: string;
  sessionStatus?: string;
  candidate?: { email: string; name: string | null };
  simulation?: {
    title: string;
    roleKey: string;
    deliverableFields: { key: string; label: string }[];
  };
  session?: {
    startedAt: string | null;
    submittedAt: string | null;
    curveballPresentedAt: string | null;
    curveballAcknowledgedAt: string | null;
  };
  analysis?: {
    recommendation: string;
    cappedByCritical: string | null;
    aiUse: {
      promptCount?: number;
      insertedCount?: number;
      editedAfterInsertCount?: number;
      externalAiDisclosed?: boolean;
      trackingNote?: string;
      scoringMode?: string;
    };
    interviewQuestions: string[];
    competencies: Competency[];
    evidence: Evidence[];
    engineVersion?: string;
    performance?: number | null;
    coverage?: number;
    confidence?: number;
    band?: string;
    bandLabel?: string;
    citations?: { claim: string; eventOrArtifactId: string; detail: string }[];
    result?: unknown;
  };
  submission?: {
    snapshot: { deliverable: Record<string, string | number>; notes: string };
    externalAiDisclosed: boolean;
  } | null;
  timeline?: { type: string; actor: string; resourceId: string | null; at: string }[];
  messages?: { thread: string; stakeholderId: string | null; sender: string; body: string; at: string }[];
  decisions?: { id: string; decision: string; notes: string; created_at: string }[];
  credential?: { credential_number: string } | null;
}

const BAND_TONE: Record<string, StatusTone> = {
  strong: "good",
  established: "active",
  developing: "changed",
  limited: "changed",
  insufficient: "neutral",
};

const RECOMMENDATION_COPY: Record<
  string,
  { label: string; tone: StatusTone }
> = {
  advance: {
    label: "Evidence supports advancing this candidate",
    tone: "good",
  },
  review: { label: "Mixed evidence. Read the detail below", tone: "changed" },
  further_evidence_required: {
    label: "Further evidence required before a decision",
    tone: "changed",
  },
};

/** Section label used above each block of the report. */
function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--text-tertiary)]"
    >
      {children}
    </h2>
  );
}

export function EvidenceReport({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"evidence" | "work" | "timeline" | "interview">(
    "evidence"
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/report`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the report");
      if (!data.ready) {
        // Trigger analysis (idempotent) and poll.
        void fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(
          () => {}
        );
      }
      setReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the report");
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (report && !report.ready) {
      const t = setTimeout(() => void load(), 5000);
      return () => clearTimeout(t);
    }
  }, [report, load]);

  if (error) {
    return (
      <EmptyState
        title="Could not load this report"
        description={error}
        action={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!report) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading the report">
        <Skeleton className="h-7 w-[280px]" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!report.ready) {
    return (
      <EmptyState
        title="Report not ready yet"
        description={`${report.message ?? "Analysis is still running."} This page refreshes on its own.`}
      />
    );
  }

  const {
    analysis,
    simulation,
    session,
    candidate,
    submission,
    timeline,
    decisions,
    credential,
  } = report;
  if (!analysis || !simulation) return null;
  const rec = RECOMMENDATION_COPY[analysis.recommendation] || RECOMMENDATION_COPY.review;

  return (
    <div className="max-w-[980px] space-y-7">
      <header>
        <Link
          href="/app/employer/reports"
          className="text-[13px] text-[var(--text-secondary)] underline-offset-2 transition-colors hover:text-[var(--text-primary)] hover:underline"
        >
          All reports
        </Link>
        <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.028em] text-[var(--text-primary)]">
          {candidate?.name || candidate?.email}
        </h1>
        <p className="mt-1.5 text-[13.5px] text-[var(--text-secondary)]">
          {simulation.title} · submitted{" "}
          {session?.submittedAt
            ? new Date(session.submittedAt).toLocaleString()
            : "not recorded"}
          {credential ? <> · credential {credential.credential_number}</> : null}
        </p>
      </header>

      <Surface tone="panel" className="px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[15px] font-medium tracking-[-0.015em] text-[var(--text-primary)]">
            {rec.label}
          </p>
          <StatusTag tone={rec.tone}>
            {analysis.bandLabel || "Reviewed"}
          </StatusTag>
        </div>
        {analysis.cappedByCritical ? (
          <p className="mt-2 max-w-[70ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
            Held back by the role-critical competency &ldquo;
            {analysis.cappedByCritical}&rdquo;. Strong performance elsewhere does not
            offset it.
          </p>
        ) : null}
        {typeof analysis.performance === "number" ? (
          <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2 border-t border-[var(--border-subtle)] pt-3">
            {[
              ["Performance", String(analysis.performance)],
              [
                "Coverage",
                typeof analysis.coverage === "number"
                  ? `${Math.round(analysis.coverage * 100)}%`
                  : null,
              ],
              [
                "Confidence",
                typeof analysis.confidence === "number"
                  ? `${Math.round(analysis.confidence * 100)}%`
                  : null,
              ],
            ]
              .filter(([, v]) => v !== null)
              .map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-[12px] text-[var(--text-tertiary)]">{label}</dt>
                  <dd className="mt-0.5 text-[16px] font-medium tabular-nums text-[var(--text-primary)]">
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
        ) : null}
        <p className="mt-3 max-w-[74ch] text-[12.5px] leading-[1.6] text-[var(--text-tertiary)]">
          Bands describe how strong the observed evidence is, not a ranking. This report
          shows what the candidate did so you can judge it yourself.
        </p>
      </Surface>

      {analysis.citations && analysis.citations.length > 0 ? (
        <section aria-labelledby="cite-h">
          <SectionLabel id="cite-h">Evidence citations</SectionLabel>
          <ol className="mt-3 space-y-2">
            {analysis.citations.map((c, i) => (
              <li
                key={i}
                className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3"
              >
                <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                  {c.claim}
                </p>
                <p className="mt-1 max-w-[74ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  {c.detail}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="comp-h">
        <SectionLabel id="comp-h">Competency evidence</SectionLabel>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {analysis.competencies.map((c) => (
            <div
              key={c.key}
              className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                  {c.label}
                  {c.critical ? (
                    <span className="ml-1.5 text-[12px] font-normal text-[var(--text-tertiary)]">
                      critical
                    </span>
                  ) : null}
                </p>
                <StatusTag tone={BAND_TONE[c.band] ?? "neutral"}>{c.bandLabel}</StatusTag>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                {c.summary}
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
                Coverage {Math.round(c.coverage * 100)}% · confidence{" "}
                {Math.round(c.confidence * 100)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div
          className="flex gap-1 border-b border-[var(--border-subtle)]"
          role="tablist"
          aria-label="Report detail"
        >
          {(
            [
              ["evidence", "Evidence detail"],
              ["work", "Final work"],
              ["timeline", "Work timeline"],
              ["interview", "Interview guide"],
            ] as const
          ).map(([id, label]) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(id)}
                className={[
                  "-mb-px border-b-[1.5px] px-3 py-2 text-[13px] font-medium transition-colors",
                  selected
                    ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {tab === "evidence" ? (
            <div className="space-y-2">
              {analysis.evidence.map((e, i) => (
                <div
                  key={i}
                  className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                      {e.indicator}
                    </p>
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      {e.source === "deterministic"
                        ? "verified check"
                        : e.source === "ai_rubric"
                          ? "rubric evaluation"
                          : "authored rule"}
                    </span>
                    <StatusTag
                      tone={e.quality >= 0.65 ? "good" : e.quality >= 0.4 ? "changed" : "risk"}
                    >
                      {e.quality >= 0.65 ? "supports" : e.quality >= 0.4 ? "mixed" : "against"}
                    </StatusTag>
                  </div>
                  {(e.excerpts || []).map((x, xi) => (
                    <p
                      key={xi}
                      className="mt-2 border-l border-[var(--border-default)] pl-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]"
                    >
                      {x}
                    </p>
                  ))}
                  {e.explanation ? (
                    <p className="mt-2 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                      {e.explanation}
                    </p>
                  ) : null}
                  {e.counterevidence ? (
                    <p className="mt-2 text-[13px] leading-[1.6] text-[#e9c46a]">
                      Counterevidence: {e.counterevidence}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {tab === "work" && submission ? (
            <div className="space-y-2">
              {simulation.deliverableFields.map((f) => {
                const value = submission.snapshot.deliverable?.[f.key];
                return (
                  <div
                    key={f.key}
                    className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3"
                  >
                    <p className="text-[12px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
                      {f.label}
                    </p>
                    <p className="mt-1.5 max-w-[74ch] whitespace-pre-line text-[13.5px] leading-[1.7] text-[var(--text-primary)]">
                      {value === undefined || String(value).trim() === "" ? (
                        <span className="text-[var(--text-tertiary)]">Left empty</span>
                      ) : (
                        String(value)
                      )}
                    </p>
                  </div>
                );
              })}
              <div className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-[12px] uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
                  AI use during the session
                </p>
                <p className="mt-1.5 max-w-[74ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                  {(analysis.aiUse.promptCount ?? 0) === 0
                    ? "Did not use the in-product assistant."
                    : `Used the in-product assistant ${analysis.aiUse.promptCount} time${
                        analysis.aiUse.promptCount === 1 ? "" : "s"
                      }, inserting output ${analysis.aiUse.insertedCount ?? 0} time${
                        (analysis.aiUse.insertedCount ?? 0) === 1 ? "" : "s"
                      }.`}{" "}
                  {submission.externalAiDisclosed
                    ? "The candidate disclosed using external AI tools."
                    : "No external AI use was disclosed."}
                </p>
                {analysis.aiUse.trackingNote ? (
                  <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
                    {analysis.aiUse.trackingNote}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {tab === "timeline" ? (
            <Surface tone="panel" className="px-4 py-3">
              <ol className="space-y-1.5">
                {(timeline || []).map((e, i) => (
                  <li key={i} className="flex gap-4 text-[13px]">
                    <span className="w-[112px] shrink-0 tabular-nums text-[var(--text-tertiary)]">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {e.type.replace(/_/g, " ")}
                      {e.resourceId ? (
                        <span className="text-[var(--text-tertiary)]"> · {e.resourceId}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </Surface>
          ) : null}

          {tab === "interview" ? (
            <Surface tone="panel" className="px-5 py-4">
              <p className="max-w-[70ch] text-[13px] leading-[1.65] text-[var(--text-secondary)]">
                Generated from this candidate&apos;s own session. Use them to probe the
                reasoning behind what you read above.
              </p>
              <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[13.5px] leading-[1.7] text-[var(--text-primary)] marker:text-[var(--text-tertiary)]">
                {analysis.interviewQuestions.map((q, i) => (
                  <li key={i} className="max-w-[74ch]">
                    {q}
                  </li>
                ))}
              </ol>
            </Surface>
          ) : null}
        </div>
      </section>

      {analysis?.result && isV2PersistedResult(analysis.result) ? (
        <section aria-labelledby="v2-h">
          <SectionLabel id="v2-h">Citation-backed evidence</SectionLabel>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            The candidate-facing document, exactly as they see it.
          </p>
          {/* Rendered on paper so it reads as the document it is. */}
          <div className="mt-3 rounded-[var(--radius-frame)] bg-[var(--surface-paper)] p-4 sm:p-5">
            <EvidenceReportV2 result={analysis.result as V2PersistedResult} />
          </div>
        </section>
      ) : null}

      {(decisions || []).length > 0 ? (
        <section aria-labelledby="prior-h">
          <SectionLabel id="prior-h">Prior decisions</SectionLabel>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--text-secondary)]">
            {(decisions || []).map((d) => (
              <li key={d.id}>
                <span className="text-[var(--text-primary)]">
                  {d.decision.replace(/_/g, " ")}
                </span>{" "}
                on {new Date(d.created_at).toLocaleDateString()}
                {d.notes ? <>: &ldquo;{d.notes}&rdquo;</> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EmployerReviewActions sessionId={sessionId} />
    </div>
  );
}
