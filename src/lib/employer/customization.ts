/**
 * Employer chunk — EMP-04: bound employer customization.
 *
 * Employers may edit company context and instructions, but only within safe
 * limits. Edits are classified:
 * - "contextual": wording, company name, logistics — safe to apply.
 * - "substantive": changes what is being measured (new requirements, removed
 *   deliverables, changed success criteria) — requires validated tests and a
 *   re-pinned rubric version before release, and can never apply to
 *   invitations that already pinned an older configuration.
 */

export type CustomizationKind = "contextual" | "substantive";

export interface CustomizationEdit {
  field: "companyContext" | "candidateInstructions" | "logistics";
  previous: string;
  proposed: string;
}

const LIMITS = {
  companyContext: 2000,
  candidateInstructions: 4000,
  logistics: 1000,
} as const;

/** Heuristic markers that an edit changes what is being measured. */
const SUBSTANTIVE_MARKERS = [
  /\bdeliverable\b/i,
  /\bmust (produce|deliver|implement|build|return)\b/i,
  /\bsuccess criteria\b/i,
  /\brubric\b/i,
  /\bscor(e|ing)\b/i,
  /\bacceptance criteria\b/i,
  /\bpublic tests?\b/i,
  /\btime ?limit\b/i,
  /\bdeadline\b/i,
];

export interface CustomizationVerdict {
  kind: CustomizationKind;
  reasons: string[];
  withinLimits: boolean;
  /** Substantive edits are blocked from release until revalidated. */
  blockedFromReleaseUntilRevalidated: boolean;
}

export function classifyCustomization(edit: CustomizationEdit): CustomizationVerdict {
  const reasons: string[] = [];
  const limit = LIMITS[edit.field];
  const withinLimits = edit.proposed.length <= limit;
  if (!withinLimits) {
    reasons.push(`${edit.field} exceeds the ${limit}-character safe limit`);
  }
  const markers = SUBSTANTIVE_MARKERS.filter((re) => re.test(edit.proposed) && !re.test(edit.previous));
  for (const m of markers) {
    reasons.push(`introduces requirement-like language matching ${m}`);
  }
  const substantive = markers.length > 0;
  if (substantive) {
    reasons.push(
      "substantive change: needs validated tests and a re-pinned rubric version before release; cannot alter invitations that already pinned a configuration"
    );
  }
  return {
    kind: substantive ? "substantive" : "contextual",
    reasons,
    withinLimits,
    blockedFromReleaseUntilRevalidated: substantive,
  };
}
