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
    key: "naiveLateRate",
    label: "Naive late rate",
    description: "Late rate from the exact-string shipment_id join — understated by the ID-format bug.",
    format: (m) => formatPercent(m.naiveLateRate),
    invert: true,
  },
  {
    key: "trueLateRate",
    label: "True late rate",
    description: "Late rate after reconciling shipment_id formats — the real number.",
    format: (m) => formatPercent(m.trueLateRate),
  },
  {
    key: "rowsDroppedNaive",
    label: "Rows dropped (naive join)",
    description: "Manually tracked delay rows the naive join silently missed.",
    format: (m) => (Number.isFinite(m.rowsDroppedNaive) ? String(m.rowsDroppedNaive) : "—"),
    invert: true,
  },
  {
    key: "integrityCaught",
    label: "Integrity caught",
    description: "Whether report.build_report() was fixed to use the reconciled join.",
    format: (m) => (m.integrityCaught ? "Yes" : "Not yet"),
  },
  {
    key: "reportSchemaValid",
    label: "Report schema valid",
    description: "Whether build_report()'s output matches the required report shape.",
    format: (m) => (m.reportSchemaValid ? "Valid" : "Invalid"),
  },
];

function toneForBool(value: boolean, invert?: boolean): string {
  const good = invert ? !value : value;
  return good ? "text-[#8EE4B8]" : "text-[#F26B82]";
}

function toneForNumber(row: MetricRow, value: number): string {
  if (!Number.isFinite(value)) return "text-white/40";
  if (row.key === "rowsDroppedNaive") {
    if (value === 0) return "text-[#8EE4B8]";
    return value > 0 ? "text-[#F26B82]" : "text-[#F2C36B]";
  }
  const good = row.invert ? value <= 0.35 : value >= 0.4;
  const bad = row.invert ? value > 0.45 : value < 0.35;
  if (good) return "text-[#8EE4B8]";
  if (bad) return "text-[#F26B82]";
  return "text-[#F2C36B]";
}

function toneFor(row: MetricRow, metrics: EvalMetrics): string {
  const value = metrics[row.key];
  if (typeof value === "boolean") return toneForBool(value, row.invert);
  return toneForNumber(row, value as number);
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
            {ROWS.map((row) => (
              <div key={row.key} className="rounded-[10px] border border-white/[0.08] bg-[#0A0C11]/80 px-3.5 py-3">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-white/40">{row.label}</p>
                <p className={`mt-1.5 text-[20px] font-medium ${toneFor(row, metrics)}`}>{row.format(metrics)}</p>
                <p className="mt-1 text-[11px] leading-snug text-white/40">{row.description}</p>
              </div>
            ))}
          </div>
          {!metrics.integrityCaught && (
            <div className="rounded-[10px] border border-[#F26B82]/30 bg-[#F26B82]/[0.08] px-4 py-3 text-[12.5px] leading-relaxed text-[#fda4b0]">
              The report is still built on the naive, format-mismatched join — the true late rate (
              {formatPercent(metrics.trueLateRate)}) is higher than what&apos;s reported (
              {formatPercent(metrics.naiveLateRate)}). Check{" "}
              <code className="text-[#fda4b0]">src/join.py</code> against{" "}
              <code className="text-[#fda4b0]">src/reconcile.py</code>.
            </div>
          )}
        </>
      )}
    </div>
  );
}
