"use client";

import type { EvalMetrics } from "@/lib/relay/eval-summary";
import { formatPercent } from "@/lib/relay/eval-summary";

type MetricRow = {
  key: keyof EvalMetrics;
  label: string;
  description: string;
  format: (metrics: EvalMetrics) => string;
  /** Lower is better for this metric (colors accordingly). */
  invert?: boolean;
};

const ROWS: MetricRow[] = [
  {
    key: "accuracy",
    label: "Accuracy",
    description: "Golden-set classification accuracy.",
    format: (m) => formatPercent(m.accuracy),
  },
  {
    key: "macroF1",
    label: "Macro-F1",
    description: "Per-category F1, averaged unweighted.",
    format: (m) => formatPercent(m.macroF1),
  },
  {
    key: "highSeverityRecall",
    label: "High-severity recall",
    description: "Recall on security / incident_p0 tickets specifically.",
    format: (m) => formatPercent(m.highSeverityRecall),
  },
  {
    key: "abstentionRate",
    label: "Abstention rate",
    description: "Share of decisions that abstained rather than auto-act.",
    format: (m) => formatPercent(m.abstentionRate),
  },
  {
    key: "falseAutomationRate",
    label: "False-automation rate",
    description: "Sensitive actions (refund / lock / delete / escalate) that would auto-execute without human approval.",
    format: (m) => formatPercent(m.falseAutomationRate),
    invert: true,
  },
  {
    key: "schemaValidity",
    label: "Schema validity",
    description: "Decisions matching the required output shape.",
    format: (m) => formatPercent(m.schemaValidity),
  },
];

function toneFor(row: MetricRow, value: number): string {
  if (!Number.isFinite(value)) return "text-white/40";
  const good = row.invert ? value <= 0.05 : value >= 0.9;
  const bad = row.invert ? value > 0.3 : value < 0.6;
  if (good) return "text-[#8EE4B8]";
  if (bad) return "text-[#F26B82]";
  return "text-[#F2C36B]";
}

export default function EvaluationLab({
  metrics,
  lastRunAt,
  lastRunOk,
  onRunEvals,
  running,
}: {
  metrics: EvalMetrics | null;
  lastRunAt: string | null;
  lastRunOk: boolean | null;
  onRunEvals: () => void;
  running: boolean;
}) {
  return (
    <div className="mx-auto max-w-[760px] space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-medium text-white">Evaluation Laboratory</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            Metrics parsed straight from the real <code className="text-white/70">evals</code> command output —
            nothing here is a placeholder score.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={onRunEvals}
          className="inline-flex h-8 shrink-0 items-center rounded-[7px] border border-white/15 px-3 text-[12px] text-white/75 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {running ? "Running…" : "Run evals"}
        </button>
      </div>

      {!metrics ? (
        <div className="rounded-[12px] border border-dashed border-white/[0.1] bg-white/[0.015] px-4 py-8 text-center">
          <p className="text-[13px] leading-relaxed text-white/45">
            Not yet run this session. Run <code className="text-white/60">evals</code> from the terminal below to
            populate real metrics.
          </p>
        </div>
      ) : (
        <>
          {lastRunAt && (
            <p className="text-[11.5px] text-white/40">
              Last run {new Date(lastRunAt).toLocaleTimeString()}
              {lastRunOk === false ? " · one or more checks failed" : ""}
              {typeof metrics.casesFailures === "number" && Number.isFinite(metrics.casesFailures)
                ? ` · ${metrics.casesFailures}/${metrics.casesTotal} case failures`
                : ""}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ROWS.map((row) => {
              const value = metrics[row.key];
              return (
                <div key={row.key} className="rounded-[10px] border border-white/[0.08] bg-[#0A0C11]/80 px-3.5 py-3">
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-white/40">{row.label}</p>
                  <p className={`mt-1.5 text-[20px] font-medium ${toneFor(row, value)}`}>{row.format(metrics)}</p>
                  <p className="mt-1 text-[11px] leading-snug text-white/40">{row.description}</p>
                </div>
              );
            })}
          </div>
          {metrics.falseAutomationRate > 0 && (
            <div className="rounded-[10px] border border-[#F26B82]/30 bg-[#F26B82]/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-[#fda4b0]">
              At least one sensitive action would auto-execute without human approval. Check the model-assisted
              branch in <code className="text-[#fda4b0]">src/router.py</code> against{" "}
              <code className="text-[#fda4b0]">src/policy.py</code>.
            </div>
          )}
        </>
      )}
    </div>
  );
}
