"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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

const BAND_COLORS: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800",
  established: "bg-blue-100 text-blue-800",
  developing: "bg-amber-100 text-amber-800",
  limited: "bg-orange-100 text-orange-800",
  insufficient: "bg-slate-100 text-slate-500",
};

const RECOMMENDATION_COPY: Record<string, { label: string; tone: string }> = {
  advance: { label: "Evidence supports advancing this candidate", tone: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  review: { label: "Mixed evidence: review the details below", tone: "bg-amber-50 border-amber-200 text-amber-900" },
  further_evidence_required: {
    label: "Further evidence required before a decision",
    tone: "bg-orange-50 border-orange-200 text-orange-900",
  },
};

export function EvidenceReport({ sessionId }: { sessionId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [tab, setTab] = useState<"evidence" | "work" | "timeline" | "interview">("evidence");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/report`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load the report");
      if (!data.ready) {
        // Trigger analysis (idempotent) and poll.
        void fetch(`/api/sim/sessions/${sessionId}/analyze`, { method: "POST" }).catch(() => {});
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

  const recordDecision = async () => {
    if (!decision) return;
    setDecisionBusy(true);
    setDecisionError(null);
    try {
      const res = await fetch(`/api/sim/sessions/${sessionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes: decisionNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record the decision");
      setDecision("");
      setDecisionNotes("");
      await load();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Could not record the decision");
    } finally {
      setDecisionBusy(false);
    }
  };

  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-[13.5px] text-red-800">
        {error}{" "}
        <button onClick={() => void load()} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      </div>
    );
  if (!report)
    return <p className="text-[13.5px] text-slate-500" role="status">Loading the report...</p>;
  if (!report.ready)
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-[14px] font-medium text-slate-800">Report not ready yet</p>
        <p className="mt-1 text-[13px] text-slate-500" role="status">
          {report.message} This page refreshes automatically.
        </p>
      </div>
    );

  const { analysis, simulation, session, candidate, submission, timeline, decisions, credential } = report;
  if (!analysis || !simulation) return null;
  const rec = RECOMMENDATION_COPY[analysis.recommendation] || RECOMMENDATION_COPY.review;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/app/employer/assessments" className="text-[12.5px] text-slate-500 hover:text-slate-800">
            ← All assessments
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            {candidate?.name || candidate?.email}
          </h1>
          <p className="text-[13px] text-slate-500">
            {simulation.title} · submitted{" "}
            {session?.submittedAt ? new Date(session.submittedAt).toLocaleString() : "n/a"}
            {credential && <> · credential {credential.credential_number}</>}
          </p>
        </div>
      </div>

      {/* recommendation */}
      <div className={`rounded-xl border p-4 ${rec.tone}`}>
        <p className="text-[14px] font-semibold">{rec.label}</p>
        {analysis.cappedByCritical && (
          <p className="mt-1 text-[12.5px]">
            Held back by the role-critical competency &quot;{analysis.cappedByCritical}&quot;. Strong
            performance elsewhere cannot offset it.
          </p>
        )}
        {typeof analysis.performance === "number" && (
          <p className="mt-2 text-[13px]">
            Performance {analysis.performance}
            {typeof analysis.coverage === "number" && (
              <> · coverage {Math.round(analysis.coverage * 100)}%</>
            )}
            {typeof analysis.confidence === "number" && (
              <> · confidence {Math.round(analysis.confidence * 100)}%</>
            )}
            {analysis.bandLabel && <> · {analysis.bandLabel}</>}
          </p>
        )}
        <p className="mt-1 text-[12.5px] opacity-80">
          Bands describe strength of observed evidence, not a ranking. This report shows what the
          candidate did, so you can judge for yourself.
        </p>
      </div>

      {analysis.citations && analysis.citations.length > 0 && (
        <section aria-labelledby="cite-h">
          <h2 id="cite-h" className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Evidence citations
          </h2>
          <ol className="mt-2 space-y-2">
            {analysis.citations.map((c, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[13.5px] font-semibold text-slate-900">{c.claim}</p>
                <p className="mt-1 text-[12.5px] text-slate-600">{c.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* competency bands */}
      <section aria-labelledby="comp-h">
        <h2 id="comp-h" className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
          Competency evidence
        </h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {analysis.competencies.map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold text-slate-900">
                  {c.label}
                  {c.critical && (
                    <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                      critical
                    </span>
                  )}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${BAND_COLORS[c.band] || BAND_COLORS.insufficient}`}>
                  {c.bandLabel}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{c.summary}</p>
              <p className="mt-1.5 text-[11.5px] text-slate-400">
                Evidence coverage {Math.round(c.coverage * 100)}% · confidence {Math.round(c.confidence * 100)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* tabs */}
      <div className="border-b border-slate-200">
        {(
          [
            ["evidence", "Evidence detail"],
            ["work", "Final work"],
            ["timeline", "Work timeline"],
            ["interview", "Interview guide"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`border-b-2 px-4 py-2 text-[13px] font-medium ${
              tab === id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            aria-current={tab === id ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "evidence" && (
        <div className="space-y-2">
          {analysis.evidence.map((e, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-slate-800">{e.indicator}</p>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase text-slate-500">
                  {e.source === "deterministic" ? "verified check" : e.source === "ai_rubric" ? "rubric evaluation" : "authored rule"}
                </span>
                <span className={`text-[12px] font-semibold ${e.quality >= 0.65 ? "text-emerald-700" : e.quality >= 0.4 ? "text-amber-700" : "text-red-600"}`}>
                  {e.quality >= 0.65 ? "supports" : e.quality >= 0.4 ? "mixed" : "against"}
                </span>
              </div>
              {(e.excerpts || []).map((x, xi) => (
                <p key={xi} className="mt-1.5 border-l-2 border-slate-200 pl-3 text-[12.5px] italic text-slate-600">
                  {x}
                </p>
              ))}
              {e.explanation && <p className="mt-1.5 text-[12.5px] text-slate-500">{e.explanation}</p>}
              {e.counterevidence && (
                <p className="mt-1.5 text-[12.5px] text-orange-700">Counterevidence: {e.counterevidence}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "work" && submission && (
        <div className="space-y-4">
          {simulation.deliverableFields.map((f) => {
            const value = submission.snapshot.deliverable?.[f.key];
            return (
              <div key={f.key} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-slate-400">{f.label}</p>
                <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-slate-800">
                  {value === undefined || String(value).trim() === "" ? (
                    <span className="italic text-slate-400">Left empty</span>
                  ) : (
                    String(value)
                  )}
                </p>
              </div>
            );
          })}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[12.5px] font-semibold uppercase tracking-wide text-slate-400">
              AI use during the session
            </p>
            <p className="mt-1.5 text-[13px] text-slate-700">
              {(analysis.aiUse.promptCount ?? 0) === 0
                ? "Did not use the in-product assistant."
                : `Used the in-product assistant ${analysis.aiUse.promptCount} time${analysis.aiUse.promptCount === 1 ? "" : "s"}; inserted output ${analysis.aiUse.insertedCount ?? 0} time${(analysis.aiUse.insertedCount ?? 0) === 1 ? "" : "s"}.`}{" "}
              {submission.externalAiDisclosed
                ? "Candidate disclosed using external AI tools."
                : "No external AI use was disclosed."}
            </p>
            {analysis.aiUse.trackingNote && (
              <p className="mt-1 text-[11.5px] text-slate-400">{analysis.aiUse.trackingNote}</p>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <ol className="space-y-1.5">
            {(timeline || []).map((e, i) => (
              <li key={i} className="flex gap-3 text-[12.5px]">
                <span className="w-40 shrink-0 font-mono text-slate-400">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
                <span className="text-slate-700">
                  {e.type.replace(/_/g, " ")}
                  {e.resourceId && <span className="text-slate-400"> · {e.resourceId}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "interview" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[13px] text-slate-500">
            Questions generated from this candidate&apos;s actual session. Use them to probe the
            reasoning behind what you saw above.
          </p>
          <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-[13.5px] leading-relaxed text-slate-800">
            {analysis.interviewQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* decision */}
      <section aria-labelledby="decision-h" className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 id="decision-h" className="text-[14px] font-semibold text-slate-900">
          Your decision
        </h2>
        {(decisions || []).length > 0 && (
          <ul className="mt-2 space-y-1 text-[12.5px] text-slate-500">
            {(decisions || []).map((d) => (
              <li key={d.id}>
                Recorded <strong className="text-slate-700">{d.decision.replace(/_/g, " ")}</strong> on{" "}
                {new Date(d.created_at).toLocaleDateString()}
                {d.notes && <>: "{d.notes}"</>}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["advance", "Advance"],
            ["hold", "Hold"],
            ["needs_further_evidence", "Needs more evidence"],
            ["do_not_advance", "Do not advance"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDecision(value)}
              aria-pressed={decision === value}
              className={`rounded-lg border px-3.5 py-2 text-[13px] font-medium ${
                decision === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          rows={2}
          placeholder="Notes (optional)"
          aria-label="Decision notes"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-slate-500 focus:outline-none"
        />
        {decisionError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-red-700">{decisionError}</p>
        )}
        <button
          onClick={() => void recordDecision()}
          disabled={!decision || decisionBusy}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {decisionBusy ? "Recording…" : "Record decision"}
        </button>
      </section>
    </div>
  );
}
