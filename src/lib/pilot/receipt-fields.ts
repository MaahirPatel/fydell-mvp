export const RECEIPT_FIELD_CATALOG = [
  "role_title",
  "evaluation_title",
  "completion_date",
  "duration",
  "task_summary",
  "deliverable_summary",
  "evidence_summaries",
  "coverage_confidence",
  "scenario_score",
  "ai_policy_note",
  "evaluator_version",
  "limitations",
] as const;

export type ReceiptField = (typeof RECEIPT_FIELD_CATALOG)[number];

export function normalizeAllowedFields(fields: unknown): ReceiptField[] {
  if (!Array.isArray(fields))
    return ["role_title", "evaluation_title", "completion_date", "evidence_summaries"];
  const allowed = new Set(RECEIPT_FIELD_CATALOG);
  const out = fields
    .map(String)
    .filter((f): f is ReceiptField => allowed.has(f as ReceiptField));
  return out.length ? Array.from(new Set(out)) : ["role_title", "evaluation_title", "completion_date"];
}
