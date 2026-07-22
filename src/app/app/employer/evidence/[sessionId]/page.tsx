"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReceiptSeal from "@/components/fde/ui/ReceiptSeal";
import UncertaintyTexture from "@/components/fde/ui/UncertaintyTexture";
import PredictiveHirePanel from "@/components/fde/ui/PredictiveHirePanel";
import EvidenceAperture, {
  type ApertureArtifactRef,
  type ApertureEventRef,
  type ApertureFinding,
} from "@/components/fde/ui/EvidenceAperture";

type Finding = ApertureFinding;

type Decision = {
  id: string;
  decision: string;
  structured_reason: string | null;
  evidence_gaps: string | null;
  created_at: string;
};

type TraitRow = {
  traitId: string;
  label: string;
  score100: number | null;
  bucket: string;
  opportunityFlag: boolean;
  independentCount?: number;
  nEff?: number;
  se?: number | null;
  band?: { low: number; high: number } | null;
  eventRefs?: string[];
  artifactRefs?: string[];
  summaries?: string[];
  confidence?: {
    sufficiency?: number;
    consistency?: number;
    diversity?: number;
    provenance?: number;
    confidence01?: number;
    label?: string;
  } | null;
};

type InterviewFollowup = {
  traitId: string;
  label: string;
  prompt: string;
  eventIds?: string[];
  why?: string;
};

type ProcessComponent = {
  key: string;
  label: string;
  score01: number;
  overall100?: number;
  explanation: string;
};

type ShadowLock = {
  id: string;
  decision: string;
  confidence: string;
  reasons: string;
  locked_at: string;
};

type LockedView = {
  mission: { id: string; title: string };
  fde: { name: string };
  session: { id: string; status: string };
};

type EvidenceData = {
  mode?: string;
  shadow?: { lock: ShadowLock | null; reveals: { id: string; revealed_at: string }[] } | null;
  session: { id: string; status: string; submittedAt: string | null; curveballKey: string | null };
  mission: { id: string; title: string; objective: string };
  fde: { name: string };
  findings: Finding[];
  eventsById: Record<string, ApertureEventRef>;
  artifactsById: Record<string, ApertureArtifactRef>;
  decisions: Decision[];
  analysis: {
    composite: {
      fitScore100: number | null;
      formulaVersion: string;
      policyVersion: string;
      observedTraitCount: number;
      notObservedTraitIds: string[];
      confidenceTag: string;
      traits: TraitRow[];
    };
    prediction: {
      hireProbabilityPct: number;
      recommendationLabel: string;
      recommendation: string;
      confidence: string;
      drivers: string[];
      caveats: string[];
      predicts: string;
      modelVersion: string;
      formulaVersion: string;
      band: { low: number; high: number };
      validationStatus: string;
    };
    interviewFollowups: InterviewFollowup[];
    processQuality?: {
      overall100: number;
      components: ProcessComponent[];
    };
    aiQuality?: {
      observed: boolean;
      score: number | null;
      score100: number | null;
    };
    adaptability?: {
      observed: boolean;
      score01: number | null;
      score100: number | null;
    };
    diagnosticEfficiency?: {
      efficiency: number;
      totalIG: number;
    };
    validationMaturity: string;
    formulaVersion?: string;
  } | null;
};

const DECISIONS = [
  { value: "advance", label: "Advance" },
  { value: "hold", label: "Hold" },
  { value: "decline", label: "Decline" },
  { value: "hired", label: "Hired" },
];

const MIN_RATIONALE_LENGTH = 15;

export default function EmployerEvidenceDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState("advance");
  const [structuredReason, setStructuredReason] = useState("");
  const [evidenceGaps, setEvidenceGaps] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Shadow-pilot lock state
  const [lockedView, setLockedView] = useState<LockedView | null>(null);
  const [lockDecision, setLockDecision] = useState("advance");
  const [lockConfidence, setLockConfidence] = useState("medium");
  const [lockReasons, setLockReasons] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/employer/evidence/${sessionId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load evidence");
      if (json.locked) {
        setLockedView(json as LockedView);
        setData(null);
        return;
      }
      setLockedView(null);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load evidence");
    }
  }, [sessionId]);

  async function lockOriginalDecision(e: React.FormEvent) {
    e.preventDefault();
    setLockBusy(true);
    setLockError(null);
    try {
      const res = await fetch(`/api/employer/evidence/${sessionId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: lockDecision,
          confidence: lockConfidence,
          reasons: lockReasons,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not lock your decision");
      await load();
    } catch (err) {
      setLockError(err instanceof Error ? err.message : "Could not lock your decision");
    } finally {
      setLockBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  const calibrationPrompts = useMemo(() => data?.analysis?.interviewFollowups || [], [data]);

  const rationaleTooShort = structuredReason.trim().length < MIN_RATIONALE_LENGTH;

  async function recordDecision(e: React.FormEvent) {
    e.preventDefault();
    if (rationaleTooShort) {
      setSubmitError(`Add at least ${MIN_RATIONALE_LENGTH} characters of rationale before saving.`);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/employer/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, decision, structuredReason, evidenceGaps }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not record decision");
      setStructuredReason("");
      setEvidenceGaps("");
      load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not record decision");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data && !lockedView) return <p className="text-[14px] text-[#fda4b0]">{error}</p>;

  if (lockedView) {
    return (
      <div className="mx-auto max-w-[640px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
          Shadow pilot · report locked
        </p>
        <h1
          className="mt-1 text-[26px] text-[#F4F5F7] sm:text-[30px]"
          style={{ fontWeight: 560, letterSpacing: "-0.035em" }}
        >
          {lockedView.mission.title}
        </h1>
        <p className="mt-2 text-[14px] text-white/60">{lockedView.fde.name}</p>

        <section className="mt-6 rounded-[16px] border border-[#F2C36B]/25 bg-[#F2C36B]/[0.05] p-5">
          <h2 className="text-[13px] font-semibold text-[#F2C36B]">
            Fydell&apos;s evidence report stays sealed until you lock your original decision.
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">
            This mission runs in shadow mode: record the decision your normal hiring process
            reached for this candidate — before seeing anything Fydell observed. The lock is
            timestamped and immutable, so the comparison between your process and Fydell&apos;s
            evidence stays honest. Fydell&apos;s findings cannot influence this decision.
          </p>

          <form onSubmit={lockOriginalDecision} className="mt-5 grid gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-white/60">Your original decision</span>
              <select
                className="platform-input mt-1"
                value={lockDecision}
                onChange={(e) => setLockDecision(e.target.value)}
              >
                <option value="advance">Advance</option>
                <option value="hold">Hold</option>
                <option value="decline">Decline</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-white/60">Confidence</span>
              <select
                className="platform-input mt-1"
                value={lockConfidence}
                onChange={(e) => setLockConfidence(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-white/60">
                Reasons (what drove this decision in your normal process?)
              </span>
              <textarea
                className="platform-input mt-1"
                rows={3}
                value={lockReasons}
                onChange={(e) => setLockReasons(e.target.value)}
                required
              />
            </label>
            {lockError && (
              <p role="alert" className="text-[13px] text-[#fda4b0]">
                {lockError}
              </p>
            )}
            <button
              type="submit"
              disabled={lockBusy || lockReasons.trim().length < 10}
              className="inline-flex h-10 w-fit items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lockBusy ? "Locking…" : "Lock decision & reveal report"}
            </button>
            <p className="text-[11.5px] text-white/40">
              Locking is permanent. Who locked and when is recorded for audit.
            </p>
          </form>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-32 rounded-[14px] bg-white/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {data.shadow?.lock && (
        <div className="mb-5 rounded-[12px] border border-[#67d9a0]/25 bg-[#67d9a0]/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-white/65">
          <strong className="font-semibold text-[#8EE4B8]">Shadow pilot.</strong> Your original
          decision (<span className="capitalize">{data.shadow.lock.decision}</span>,{" "}
          {data.shadow.lock.confidence} confidence) was locked{" "}
          {new Date(data.shadow.lock.locked_at).toLocaleString()}
          {data.shadow.reveals[0]
            ? ` — report revealed ${new Date(data.shadow.reveals[0].revealed_at).toLocaleString()}.`
            : "."}{" "}
          The lock is immutable; this report was sealed until after it.
        </div>
      )}
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
        Prototype evidence report
      </p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[26px] text-[#F4F5F7] sm:text-[30px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
          {data.mission.title}
        </h1>
        {data.session.status === "receipt_ready" && <ReceiptSeal />}
      </div>
      <p className="mt-2 text-[14px] text-white/60">{data.fde.name}</p>
      <p className="mt-1 text-[12.5px] text-white/40">
        Role alignment and competency estimates with uncertainty — not an autonomous hire/reject
        decision.
      </p>

      <aside className="mt-5 rounded-[12px] border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-white/55">
        <strong className="font-semibold text-white/75">Methodology.</strong> Events → evidence
        atoms → trait estimates with Kish{" "}
        <span className="text-white/70">N_eff</span>, standard error, shrinkage priors, and a
        decomposable confidence (sufficiency × consistency × diversity × provenance). Composite
        fit blends arithmetic and geometric means so one strength cannot hide every weakness.
        Difficulty/coverage coefficients are labeled expert priors — design-weighted, not
        outcome-validated. Expand any competency below for event citations. Human review remains
        required; Fydell does not autonomously hire or reject.
        {data.analysis?.formulaVersion ? (
          <span className="mt-1 block text-[11px] text-white/40">
            Analysis formula {data.analysis.formulaVersion}
          </span>
        ) : null}
      </aside>

      {data.analysis && (
        <div className="mt-6">
          <PredictiveHirePanel
            composite={data.analysis.composite}
            prediction={data.analysis.prediction}
            onOpenEvent={(id) => {
              const el = document.getElementById(`event-${id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href={`/api/employer/evidence/${sessionId}/export`}
              className="inline-flex h-9 items-center rounded-[8px] border border-white/15 px-3 text-[12.5px] text-white/75 hover:bg-white/[0.04]"
            >
              Download audit export (JSON)
            </a>
          </div>
        </div>
      )}

      {(data.analysis?.aiQuality || data.analysis?.adaptability || data.analysis?.diagnosticEfficiency) && (
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          {data.analysis.aiQuality && (
            <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">AI-use quality</p>
              <p className="mt-1 text-[18px] tabular-nums text-white/90">
                {!data.analysis.aiQuality.observed
                  ? "Not observed"
                  : data.analysis.aiQuality.score100 == null
                    ? "—"
                    : data.analysis.aiQuality.score100}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                No AI use is not a penalty. Measures framing, verification, and blind reliance.
              </p>
            </div>
          )}
          {data.analysis.adaptability && (
            <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">Adaptability</p>
              <p className="mt-1 text-[18px] tabular-nums text-white/90">
                {!data.analysis.adaptability.observed
                  ? "Not observed"
                  : data.analysis.adaptability.score100 == null
                    ? "—"
                    : data.analysis.adaptability.score100}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                Anchored to curveball_revealed. Absent curveball ⇒ not observed, not zero.
              </p>
            </div>
          )}
          {data.analysis.diagnosticEfficiency && (
            <div className="rounded-[12px] border border-white/[0.1] bg-[#0A0C11]/85 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.06em] text-white/45">
                Diagnostic efficiency
              </p>
              <p className="mt-1 text-[18px] tabular-nums text-white/90">
                {Math.round(data.analysis.diagnosticEfficiency.efficiency * 100)}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                Information gain vs time / churn / redundancy (expert-prior weights).
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Findings</h2>
          <p className="text-[11px] text-white/35">Evidence Aperture — click a finding to see its sources</p>
        </div>
        {data.findings.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-white/50">
            Evidence is still being generated for this session — check back shortly.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {data.findings.map((f) => (
              <li
                key={f.id}
                className="relative overflow-hidden rounded-[10px] border-b border-white/[0.06] px-3 py-3 last:border-0"
              >
                <UncertaintyTexture confidence={f.confidence} />
                <div className="relative">
                  <EvidenceAperture finding={f} eventsById={data.eventsById} artifactsById={data.artifactsById} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.analysis?.processQuality && (
        <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">
            Process quality
          </h2>
          <p className="mt-1.5 text-[12.5px] text-white/45">
            Prototype rollup from observable actions — overall{" "}
            {data.analysis.processQuality.overall100}/100.
          </p>
          <ul className="mt-3 space-y-2">
            {data.analysis.processQuality.components.map((c) => (
              <li key={c.key} className="flex items-center gap-3 text-[12.5px]">
                <span className="w-[140px] shrink-0 text-white/70">{c.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <span
                    className="block h-full rounded-full bg-[#8FA3FF]"
                    style={{ width: `${Math.round(c.score01 * 100)}%` }}
                  />
                </span>
                <span className="w-8 tabular-nums text-white/40">{Math.round(c.score01 * 100)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {calibrationPrompts.length > 0 && (
        <section className="mt-6 rounded-[16px] border border-[#5662FF]/25 bg-[#5662FF]/[0.05] p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#B8C4FF]">
            Interview calibration
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
            Questions to ask in a live conversation, derived from this session&apos;s findings — use
            them to calibrate, not to replace the conversation.
          </p>
          <ol className="mt-3 space-y-3">
            {calibrationPrompts.map((followup, i) => (
              <li key={followup.traitId} className="flex gap-2.5 text-[13px] leading-relaxed text-white/75">
                <span className="mt-[1px] shrink-0 text-[12px] font-semibold text-[#8FA3FF]">{i + 1}.</span>
                <span>
                  <span className="text-white/45">{followup.label}:</span> {followup.prompt}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6 rounded-[16px] border border-white/[0.1] bg-[#0A0C11]/85 p-5">
        <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/50">Record a decision</h2>
        <form onSubmit={recordDecision} className="mt-4 grid gap-3">
          <select className="platform-input" value={decision} onChange={(e) => setDecision(e.target.value)}>
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <label className="block">
            <textarea
              className="platform-input"
              placeholder="Rationale (required) — what specifically drove this decision?"
              rows={3}
              value={structuredReason}
              onChange={(e) => setStructuredReason(e.target.value)}
              required
            />
            <span
              className={
                "mt-1 block text-[11.5px] " +
                (rationaleTooShort ? "text-white/35" : "text-[#8EE4B8]")
              }
            >
              {structuredReason.trim().length}/{MIN_RATIONALE_LENGTH} characters minimum
            </span>
          </label>
          <textarea
            className="platform-input"
            placeholder="Evidence gaps (optional)"
            rows={2}
            value={evidenceGaps}
            onChange={(e) => setEvidenceGaps(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || rationaleTooShort}
            className="inline-flex h-10 w-fit items-center rounded-[9px] bg-[#F1F2F4] px-4 text-[13px] font-semibold text-[#08090C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save decision"}
          </button>
          {submitError && <p className="text-[13px] text-[#fda4b0]">{submitError}</p>}
        </form>

        {data.decisions.length > 0 && (
          <ul className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06]">
            {data.decisions.map((d) => (
              <li key={d.id} className="py-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-white">{d.decision}</span>
                  <span className="text-white/40">{new Date(d.created_at).toLocaleString()}</span>
                </div>
                {d.structured_reason && <p className="mt-1 text-white/60">{d.structured_reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
