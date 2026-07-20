/**
 * Parses the `EVAL_SUMMARY_JSON:{...}` line that
 * scenarios/project-relay/evals/run_evals.py prints on stdout, so the
 * workspace Evaluation Laboratory panel can show real, freshly-computed
 * metrics — never hardcoded placeholder scores.
 */

export type EvalMetrics = {
  naiveLateRate: number;
  trueLateRate: number;
  rowsDroppedNaive: number;
  integrityCaught: boolean;
  reportSchemaValid: boolean;
  casesTotal: number;
  casesFailures: number;
};

const SUMMARY_RE = /EVAL_SUMMARY_JSON:(\{.*\})/;

export function parseEvalSummary(stdout: string): EvalMetrics | null {
  const match = stdout.match(SUMMARY_RE);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1]) as Record<string, unknown>;
    const num = (key: string): number => {
      const v = Number(raw[key]);
      return Number.isFinite(v) ? v : NaN;
    };
    const bool = (key: string): boolean => raw[key] === true;
    const metrics: EvalMetrics = {
      naiveLateRate: num("naive_late_rate"),
      trueLateRate: num("true_late_rate"),
      rowsDroppedNaive: num("rows_dropped_naive"),
      integrityCaught: bool("integrity_caught"),
      reportSchemaValid: bool("report_schema_valid"),
      casesTotal: num("cases_total"),
      casesFailures: num("cases_failures"),
    };
    return metrics;
  } catch {
    return null;
  }
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
