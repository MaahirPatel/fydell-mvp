"use client";

type DimensionRow = {
  dimensionId: string;
  label: string;
  score100: number | null;
  state: string;
  provisional: boolean;
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

type Fit = {
  fitScore100: number | null;
  formulaVersion: string;
  policyVersion: string;
  dimensions: DimensionRow[];
  provisionalDimensionCount: number;
};

export default function PredictiveHirePanel({
  fit,
  prediction,
}: {
  fit: Fit;
  prediction: Prediction;
}) {
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
            {fit.fitScore100 ?? "—"}
            {fit.fitScore100 != null && <span className="text-[14px] text-white/45">/100</span>}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">{fit.formulaVersion}</p>
        </div>
        <ul className="space-y-2">
          {fit.dimensions.map((d) => (
            <li
              key={d.dimensionId}
              className="flex items-center justify-between gap-3 rounded-[8px] border border-white/[0.06] bg-black/15 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-white/85">{d.label}</p>
                <p className="text-[11px] text-white/40">
                  {d.state.replace(/_/g, " ")}
                  {d.provisional ? " · provisional" : ""}
                </p>
              </div>
              <span className="shrink-0 text-[15px] tabular-nums font-semibold text-white">
                {d.score100 == null ? "—" : d.score100}
              </span>
            </li>
          ))}
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
        Validation: {prediction.validationStatus.replace(/_/g, " ")}. Policy {fit.policyVersion} ·
        predict formula {prediction.formulaVersion}. A human must still record Advance / Hold /
        Decline / Hired with rationale — this panel is decision support, not an automated hiring
        decision under applicable employment law.
      </p>
    </section>
  );
}
