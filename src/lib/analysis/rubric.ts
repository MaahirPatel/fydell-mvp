/**
 * AI-03 — Explicit rubric anchors.
 *
 * Each dimension defines: what evidence is required, what each level looks
 * like, how severe a miss is, and the dimension's known limitations.
 * Two guarantees:
 *  1. Legitimate alternative solutions are acceptable — the rubric scores
 *     *properties* (correctness, robustness), never textual similarity to a
 *     reference implementation.
 *  2. "We could not tell" is a first-class outcome (insufficient_evidence),
 *     never silently rounded to a pass or a fail.
 */

export type DimensionId = "correctness" | "robustness" | "code_quality" | "communication";

export type DimensionOutcome = "exceeds" | "meets" | "below" | "insufficient_evidence";

export interface RubricLevel {
  description: string;
  exampleEvidence: string;
}

export interface RubricDimension {
  id: DimensionId;
  /** What a reviewer must have in hand before scoring above insufficient_evidence. */
  evidenceRequired: string[];
  levels: Record<"exceeds" | "meets" | "below", RubricLevel>;
  /** When the evidence bar is not met — and what the outcome means. */
  insufficientEvidence: { when: string; meaning: string };
  severityGuidance: string;
  limitations: string[];
  alternativeSolutionsAllowed: boolean;
}

export const RUBRIC_VERSION = "2026-09-27.1";

export const RUBRIC: RubricDimension[] = [
  {
    id: "correctness",
    evidenceRequired: [
      "Authoritative test results from the deterministic harness (pass/fail per test)",
      "For any claimed defect: a cited reproduction or a labeled hypothesis (AI-07)",
    ],
    levels: {
      exceeds: {
        description: "All authoritative tests pass; edge cases handled beyond the spec.",
        exampleEvidence: "t-101..t-124 all passed; empty-input and duplicate-id cases covered",
      },
      meets: {
        description: "Core behavior correct on the authoritative suite; minor gaps only.",
        exampleEvidence: "All happy-path tests passed; one edge-case failure with a cited cause",
      },
      below: {
        description: "Authoritative tests fail, or a reproduced defect breaks core behavior.",
        exampleEvidence: "t-118 failed: dropped rows vanish (SILENT_DROP reproduced)",
      },
    },
    insufficientEvidence: {
      when: "The authoritative suite did not run, was superseded, or its results are indeterminate (platform outage, setup incompatibility).",
      meaning: "Correctness is unknown — the report must say so and must not imply a verdict.",
    },
    severityGuidance:
      "A reproduced defect in core behavior is high severity. A hypothesis (unreproduced) is at most medium and must be labeled as such.",
    limitations: [
      "The authoritative suite cannot prove absence of bugs — only the tested properties.",
      "Semantic inversions (e.g. swapped return order) are invisible to pattern detectors; only tests catch them.",
    ],
    alternativeSolutionsAllowed: true,
  },
  {
    id: "robustness",
    evidenceRequired: [
      "Deterministic findings (AST patterns) with cited lines, or failing edge-case tests",
      "Distinction between demonstrated defects and conditional risks",
    ],
    levels: {
      exceeds: {
        description: "Adversarial inputs handled; no bug/security findings; risks explicitly addressed.",
        exampleEvidence: "None/empty/malformed inputs handled; no MUTABLE_DEFAULT_ARG, no bare except",
      },
      meets: {
        description: "No bug/security findings; remaining risks are stated with their unknowns.",
        exampleEvidence: "One UNCHECKED_SUBSCRIPT risk with a documented input contract",
      },
      below: {
        description: "Bug or security finding present, or unhandled failure modes demonstrated by tests.",
        exampleEvidence: "DANGEROUS_EVAL_EXEC on candidate-controlled input",
      },
    },
    insufficientEvidence: {
      when: "Static analysis was skipped (parse failure, file over size limit) and edge-case tests are absent.",
      meaning: "Robustness is unknown — do not assume the code is safe because nothing was found.",
    },
    severityGuidance:
      "Security findings are high severity by default. 'Risk' findings are medium at most and must state what is unknown.",
    limitations: [
      "Pattern detectors see shape, not intent — a flagged pattern with a documented reason is not a defect.",
      "Runtime behavior (races, resource exhaustion) is outside static analysis; the sandbox run covers it.",
    ],
    alternativeSolutionsAllowed: true,
  },
  {
    id: "code_quality",
    evidenceRequired: ["Cited code excerpts", "Complexity/test-gap notes where present"],
    levels: {
      exceeds: {
        description: "Clear structure, named helpers, tests for non-trivial logic.",
        exampleEvidence: "Complexity ≤ 6 per function; helpers extracted with docstrings",
      },
      meets: {
        description: "Readable and maintainable; no action needed.",
        exampleEvidence: "Straightforward control flow; adequate naming",
      },
      below: {
        description: "Complexity hotspots or patterns that will predictably cause defects.",
        exampleEvidence: "COMPLEXITY_HOTSPOT (complexity 18) with duplicated branching",
      },
    },
    insufficientEvidence: {
      when: "Submission is a stub, or files were truncated before analysis.",
      meaning: "Quality cannot be judged from a stub — say so.",
    },
    severityGuidance:
      "Quality is low-stakes: it informs interview follow-ups, never a hire/no-hire call on its own. Do not reward verbosity or superficial style.",
    limitations: ["Style is not scored. Brevity is not a virtue; clarity is."],
    alternativeSolutionsAllowed: true,
  },
  {
    id: "communication",
    evidenceRequired: [
      "Cited transcript messages (ids)",
      "Handoff statement compared against deterministic results (AI-09)",
    ],
    levels: {
      exceeds: {
        description: "Proactive clarification, stated uncertainty, accurate handoff.",
        exampleEvidence: "Asked about id format ambiguity (m-42); handoff matches test results",
      },
      meets: {
        description: "Handoff is accurate; uncertainties that matter are stated.",
        exampleEvidence: "Handoff claims match the harness record; one limitation disclosed",
      },
      below: {
        description: "Handoff contradicts the harness record, or material uncertainty undisclosed.",
        exampleEvidence: "Handoff claims 'all tests pass' with 2 failures recorded (AI-09 disagreement)",
      },
    },
    insufficientEvidence: {
      when: "No transcript or handoff was submitted.",
      meaning: "Communication is unscored — absence of messages is not a negative signal.",
    },
    severityGuidance:
      "Communication is assessed narrowly (AI-08): clarification, impact, uncertainty, handoff accuracy. Never culture fit, personality, or sentiment.",
    limitations: [
      "Terse messages are not poor communication. Verbose messages are not good communication.",
      "Only the submitted transcript is assessed — never inferred traits.",
    ],
    alternativeSolutionsAllowed: true,
  },
];

export function getDimension(id: DimensionId): RubricDimension {
  const dim = RUBRIC.find((d) => d.id === id);
  if (!dim) throw new Error(`Unknown rubric dimension: ${id}`);
  return dim;
}

/** Evidence offered in support of a dimension score. */
export interface ScoredEvidence {
  /** ids of deterministic artifacts: test ids, finding codes, message ids */
  artifactRefs: string[];
  /** free-text note from the reviewer */
  note?: string;
}

/**
 * Score a dimension. With no evidence refs, the outcome is ALWAYS
 * insufficient_evidence — never a default pass, never a default fail.
 */
export function scoreDimension(
  id: DimensionId,
  evidence: ScoredEvidence,
  level: "exceeds" | "meets" | "below",
): { outcome: DimensionOutcome; reason: string } {
  const dim = getDimension(id);
  if (evidence.artifactRefs.length === 0) {
    return {
      outcome: "insufficient_evidence",
      reason: `${id}: no evidence artifacts cited. ${dim.insufficientEvidence.meaning}`,
    };
  }
  return {
    outcome: level,
    reason: `${id}: scored "${level}" on ${evidence.artifactRefs.length} cited artifact(s).`,
  };
}

/** All permitted outcome labels — the model may not invent others. */
export const PERMITTED_OUTCOMES: DimensionOutcome[] = [
  "exceeds",
  "meets",
  "below",
  "insufficient_evidence",
];
