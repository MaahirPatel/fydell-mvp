/**
 * Parses the `EVAL_SUMMARY_JSON:{...}` line that
 * scenarios/project-relay/evals/run_evals.py prints on stdout, so the
 * workspace Evaluation Laboratory panel can show real, freshly-computed
 * metrics — never hardcoded placeholder scores.
 */

export type EvalMetrics = {
  accuracy: number;
  macroF1: number;
  highSeverityRecall: number;
  abstentionRate: number;
  falseAutomationRate: number;
  schemaValidity: number;
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
    const metrics: EvalMetrics = {
      accuracy: num("accuracy"),
      macroF1: num("macro_f1"),
      highSeverityRecall: num("high_severity_recall"),
      abstentionRate: num("abstention_rate"),
      falseAutomationRate: num("false_automation_rate"),
      schemaValidity: num("schema_validity"),
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
