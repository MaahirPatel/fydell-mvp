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

type EvidenceData = {
  session: { id: string; status: string; submittedAt: string | null; curveballKey: string | null };
  mission: { id: string; title: string; objective: string };
  fde: { name: string };
  findings: Finding[];
  eventsById: Record<string, ApertureEventRef>;
  artifactsById: Record<string, ApertureArtifactRef>;
  decisions: Decision[];
  analysis: {
    fit: {
      fitScore100: number | null;
      formulaVersion: string;
      policyVersion: string;
      provisionalDimensionCount: number;
      dimensions: Array<{
        dimensionId: string;
        label: string;
        score100: number | null;
        state: string;
        provisional: boolean;
      }>;
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
  } | null;
};

const DECISIONS = [
  { value: "advance", label: "Advance" },
  { value: "hold", label: "Hold" },
  { value: "decline", label: "Decline" },
  { value: "hired", label: "Hired" },
];

const MIN_RATIONALE_LENGTH = 15;

const CALIBRATION_TEMPLATES: Record<string, (f: Finding) => string> = {
  discovery_problem_framing: () =>
    "Ask what they believed the real customer problem was at minute five versus at submit — and what evidence changed their mind.",
  technical_scoping_prioritization: () =>
    "Ask how they chose what to fix first, and what they deliberately left unfinished.",
  engineering_applied_ai_execution: (f) =>
    f.confidence === "low"
      ? "There's weak execution evidence — ask them to walk through how they would validate a fix before shipping to production."
      : "Ask them to explain one change they made, how they verified it, and what they would still not trust without more time.",
  evaluation_production_judgment: () =>
    "Ask which residual production risk they would refuse to automate, and why.",
  adaptation_customer_communication: (f) =>
    f.confidence === "low"
      ? "Customer communication evidence is thin — ask how they would have notified a real stakeholder after the mid-session change."
      : "Ask how they decided what to tell the customer after the curveball, and what they left out.",
  technical_execution: (f) =>
    f.confidence === "low"
      ? "There's no recorded test run before submission — ask them to walk through how they validated the solution before shipping."
      : "Ask them to explain what the test run told them, and what they'd have checked next with more time.",
  customer_communication: (f) =>
    f.confidence === "low"
      ? "They didn't use the customer chat — ask how they'd have handled checking in with a real stakeholder before shipping."
      : "Ask how they decided what to tell the customer, and what they left out.",
  handling_ambiguity: () =>
    "Ask them to describe the mid-session change in their own words and how they decided what to reprioritize.",
};

function buildCalibrationPrompts(findings: Finding[]): string[] {
  return findings.slice(0, 5).map((f) => {
    const generator = CALIBRATION_TEMPLATES[f.dimension];
    if (generator) return generator(f);
    return `Ask them to elaborate on: ${f.observation}`;
  });
}

export default function EmployerEvidenceDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState("advance");
  const [structuredReason, setStructuredReason] = useState("");
  const [evidenceGaps, setEvidenceGaps] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/employer/evidence/${sessionId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load evidence");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load evidence");
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const calibrationPrompts = useMemo(
    () => (data ? buildCalibrationPrompts(data.findings) : []),
    [data]
  );

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

  if (error && !data) return <p className="text-[14px] text-[#fda4b0]">{error}</p>;
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
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">Evidence</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[26px] text-[#F4F5F7] sm:text-[30px]" style={{ fontWeight: 560, letterSpacing: "-0.035em" }}>
          {data.mission.title}
        </h1>
        {data.session.status === "receipt_ready" && <ReceiptSeal />}
      </div>
      <p className="mt-2 text-[14px] text-white/60">{data.fde.name}</p>

      <aside className="mt-5 rounded-[12px] border border-white/[0.1] bg-white/[0.03] px-4 py-3 text-[12.5px] leading-relaxed text-white/55">
        <strong className="font-semibold text-white/75">Employer responsibility.</strong> Fit scores
        and the predictive hire estimate below are decision-support outputs from a versioned
        work-sample model. Your organization remains accountable for the final selection decision,
        accommodations, adverse-impact monitoring, and documentation under applicable law. A human
        rationale is still required. Provisional / insufficient dimensions are inconclusive, not
        negative.
      </aside>

      {data.analysis && (
        <div className="mt-6">
          <PredictiveHirePanel fit={data.analysis.fit} prediction={data.analysis.prediction} />
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

      {calibrationPrompts.length > 0 && (
        <section className="mt-6 rounded-[16px] border border-[#5662FF]/25 bg-[#5662FF]/[0.05] p-5">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.06em] text-[#B8C4FF]">
            Interview calibration
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
            Questions to ask in a live conversation, derived from this session's findings — use
            them to calibrate, not to replace the conversation.
          </p>
          <ol className="mt-3 space-y-2.5">
            {calibrationPrompts.map((prompt, i) => (
              <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-white/75">
                <span className="mt-[1px] shrink-0 text-[12px] font-semibold text-[#8FA3FF]">{i + 1}.</span>
                {prompt}
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
