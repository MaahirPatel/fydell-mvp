/**
 * Handoff collection (SIM-09).
 *
 * A useful handoff covers four things: what changed, what testing was done,
 * remaining risks, and next steps. This module defines the field spec and
 * validates completeness — it never invents content, it only reports what
 * the candidate actually provided.
 *
 * The submit path (chunk-submit) uses `validateHandoff` to decide whether
 * the handoff is complete; an incomplete handoff does not block submission
 * but is marked as such in the report (see partial-submission.ts).
 */

export interface HandoffFieldSpec {
  key: string;
  label: string;
  helpText: string;
  required: boolean;
}

export const HANDOFF_FIELDS: HandoffFieldSpec[] = [
  {
    key: "whatChanged",
    label: "What changed",
    helpText: "The concrete code / data / config changes you made, and why.",
    required: true,
  },
  {
    key: "testing",
    label: "Testing",
    helpText: "How you verified the fix: tests run, results, and what you checked manually.",
    required: true,
  },
  {
    key: "remainingRisks",
    label: "Remaining risks",
    helpText: "What could still be wrong, edge cases you did not cover, assumptions you made.",
    required: true,
  },
  {
    key: "nextSteps",
    label: "Next steps",
    helpText: "What the team should do next: follow-ups, monitoring, cleanup.",
    required: true,
  },
];

export interface HandoffValidation {
  complete: boolean;
  /** Keys from HANDOFF_FIELDS with no substantive content. */
  missingKeys: string[];
  /** Fraction of required fields with substantive content (0..1). */
  completeness: number;
  /** Per-field detail for the report. */
  fields: { key: string; label: string; present: boolean; wordCount: number }[];
}

function isSubstantive(v: unknown): boolean {
  if (typeof v === "number") return true;
  if (typeof v === "string") return v.trim().split(/\s+/).filter(Boolean).length >= 3;
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

function wordCount(v: unknown): number {
  if (typeof v === "string") return v.trim().split(/\s+/).filter(Boolean).length;
  return 0;
}

/**
 * Validate a handoff against HANDOFF_FIELDS. Accepts the deliverable record
 * directly: fields may live under their spec key OR under a legacy/alternate
 * key listed in `aliases`.
 */
export function validateHandoff(
  deliverable: Record<string, unknown>,
  aliases: Record<string, string[]> = {}
): HandoffValidation {
  const fields = HANDOFF_FIELDS.map((spec) => {
    const candidates = [spec.key, ...(aliases[spec.key] || [])];
    let value: unknown;
    for (const k of candidates) {
      if (k in deliverable) {
        value = deliverable[k];
        break;
      }
    }
    const present = isSubstantive(value);
    return { key: spec.key, label: spec.label, present, wordCount: wordCount(value) };
  });
  const required = HANDOFF_FIELDS.filter((f) => f.required);
  const missingKeys = fields.filter((f) => !f.present).map((f) => f.key);
  const presentRequired = required.length - fields.filter((f) => !f.present && required.some((r) => r.key === f.key)).length;
  return {
    complete: missingKeys.length === 0,
    missingKeys,
    completeness: required.length === 0 ? 1 : presentRequired / required.length,
    fields,
  };
}

/**
 * Optional short submission-specific follow-up (SIM-09): after submit, the
 * candidate may add a brief note answering a reviewer question. The follow-up
 * is stored with the submission transcript; alternatives to audio (text only)
 * are the default — no audio capture exists in this product.
 */
export interface SubmissionFollowUp {
  submissionId: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export function validateFollowUp(input: {
  question?: string;
  answer?: string;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.question || !input.question.trim()) errors.push("A follow-up question is required");
  if (!input.answer || input.answer.trim().length < 10)
    errors.push("The follow-up answer is too short to be useful (min 10 characters)");
  if ((input.answer || "").length > 2000) errors.push("The follow-up answer is too long (max 2000 characters)");
  return { ok: errors.length === 0, errors };
}
