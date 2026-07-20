"use client";

import { useState } from "react";

type ConfidenceDecomp = {
  sufficiency?: number;
  consistency?: number;
  diversity?: number;
  provenance?: number;
  confidence01?: number;
  label?: string;
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
  confidence?: ConfidenceDecomp | null;
};

type Prediction = {
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

type Composite = {
  fitScore100: number | null;
  formulaVersion: string;
  policyVersion: string;
  traits: TraitRow[];
  observedTraitCount: number;
  notObservedTraitIds: string[];
  confidenceTag: string;
  arithmetic01?: number | null;
  geometric01?: number | null;
  reason?: string | null;
};

const BUCKET_LABELS: Record<string, string> = {
  not_observed: "not observed",
  limited_evidence: "limited evidence",
  needs_review: "needs review",
  strong_evidence: "strong evidence",
};

const BUCKET_COLORS: Record<string, string> = {
  not_observed: "text-white/35",
  limited_evidence: "text-[#fda4b0]",
  needs_review: "text-[#F5C56B]",
  strong_evidence: "text-[#8EE4B8]",
};

export default function PredictiveHirePanel({
  composite,
  prediction,
  onOpenEvent,
}: {
  composite: Composite;
  prediction: Prediction;
  onOpenEvent?: (eventId: string) => void;
}) {
  const [openTrait, setOpenTrait] = useState<string | null>(null);
  const bandLow = Math.round(prediction.band.low * 100);
  const bandHigh = Math.round(prediction.band.high * 100);

  return (
    <section className="rounded-[16px] border border-[#3B5BFF]/30 bg-[#3B5BFF]/[0.07] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#B8C4FF]">
            Predictive hiring · {prediction.modelVersion}
          </p>
          <h2
            className="mt-1 text-[22px] text-[#F4F5F7]"
            style={{ fontWeight: 560, letterSpacing: "-0.03em" }}
          >
            {prediction.recommendationLabel}
          </h2>
          <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-white/55">
            {prediction.predicts}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">Hire probability</p>
          <p className="text-[36px] tabular-nums text-white" style={{ fontWeight: 600 }}>
            {prediction.hireProbabilityPct}
            <span className="text-[18px] text-white/50">%</span>
          </p>
          <p className="text-[11.5px] text-white/45">
            Band {bandLow}–{bandHigh}% · confidence {prediction.confidence}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[140px_1fr]">
        <div className="rounded-[12px] border border-white/[0.1] bg-black/20 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.06em] text-white/40">Fit score</p>
          <p className="mt-1 text-[28px] tabular-nums text-white" style={{ fontWeight: 600 }}>
            {composite.fitScore100 ?? "—"}
            {composite.fitScore100 != null && <span className="text-[14px] text-white/45">/100</span>}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {composite.observedTraitCount}/10 traits · {composite.formulaVersion}
          </p>
          {composite.reason && (
            <p className="mt-1 text-[10px] leading-snug text-[#F5C56B]">{composite.reason}</p>
          )}
          {(composite.arithmetic01 != null || composite.geometric01 != null) && (
            <p className="mt-1 text-[10px] text-white/35">
              arith {(composite.arithmetic01 ?? 0).toFixed(2)} · geom{" "}
              {(composite.geometric01 ?? 0).toFixed(2)}
            </p>
          )}
        </div>
        <ul className="space-y-2">
          {composite.traits.map((t) => {
            const expanded = openTrait === t.traitId;
            const hasProvenance =
              (t.eventRefs && t.eventRefs.length > 0) ||
              (t.artifactRefs && t.artifactRefs.length > 0);
            return (
              <li
                key={t.traitId}
                className="rounded-[8px] border border-white/[0.06] bg-black/15 px-3 py-2"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setOpenTrait(expanded ? null : t.traitId)}
                  aria-expanded={expanded}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-white/85">{t.label}</p>
                    <p className={"text-[11px] " + (BUCKET_COLORS[t.bucket] || "text-white/40")}>
                      {BUCKET_LABELS[t.bucket] || t.bucket.replace(/_/g, " ")}
                      {t.nEff != null && t.opportunityFlag
                        ? ` · N_eff ${t.nEff.toFixed(1)}`
                        : ""}
                      {t.confidence?.label ? ` · conf ${t.confidence.label}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] tabular-nums font-semibold text-white">
                    {t.score100 == null ? "—" : t.score100}
                  </span>
                </button>
                {expanded && (
                  <div className="mt-2 border-t border-white/[0.06] pt-2 text-[11.5px] text-white/55">
                    {t.band && (
                      <p>
                        Uncertainty band {Math.round(t.band.low * 100)}–
                        {Math.round(t.band.high * 100)}
                        {t.se != null ? ` · SE ${(t.se * 100).toFixed(1)} pts` : ""}
                      </p>
                    )}
                    {t.confidence && (
                      <p className="mt-1">
                        Confidence = sufficiency{" "}
                        {((t.confidence.sufficiency ?? 0) * 100).toFixed(0)}% · consistency{" "}
                        {((t.confidence.consistency ?? 0) * 100).toFixed(0)}% · diversity{" "}
                        {((t.confidence.diversity ?? 0) * 100).toFixed(0)}% · provenance{" "}
                        {((t.confidence.provenance ?? 0) * 100).toFixed(0)}%
                      </p>
                    )}
                    {t.summaries && t.summaries.length > 0 && (
                      <ul className="mt-1.5 space-y-1">
                        {t.summaries.slice(0, 3).map((s) => (
                          <li key={s}>· {s}</li>
                        ))}
                      </ul>
                    )}
                    {hasProvenance ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(t.eventRefs || []).slice(0, 5).map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => onOpenEvent?.(id)}
                            className="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-[#B8C4FF] hover:bg-white/[0.04]"
                          >
                            evt {id.slice(0, 8)}
                          </button>
                        ))}
                        {(t.artifactRefs || []).slice(0, 3).map((id) => (
                          <span
                            key={id}
                            className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/45"
                          >
                            {id.length > 28 ? `${id.slice(0, 28)}…` : id}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-white/35">
                        No event citations for this trait — treat as insufficient for a hiring claim.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">Drivers</p>
          <ul className="mt-1.5 space-y-1.5">
            {prediction.drivers.map((d) => (
              <li key={d} className="text-[12.5px] leading-relaxed text-white/65">
                · {d}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">Caveats</p>
          <ul className="mt-1.5 space-y-1.5">
            {prediction.caveats.map((c) => (
              <li key={c} className="text-[12.5px] leading-relaxed text-white/55">
                · {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-white/35">
        Validation: {prediction.validationStatus.replace(/_/g, " ")} · {composite.confidenceTag}.
        Policy {composite.policyVersion} · predict formula {prediction.formulaVersion}. Design-weighted
        prototype — not outcome-validated. A human must still record Advance / Hold / Decline with
        rationale; Fydell does not autonomously hire or reject.
      </p>
    </section>
  );
}
