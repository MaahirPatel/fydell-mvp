/**
 * AI-06 — Model-output validation.
 *
 * The model ships JSON. JSON from a model is untrusted input: it gets schema
 * checks, permitted-label checks, citation validation (AI-04), bounded-length
 * checks, and contradiction checks against the deterministic section.
 *
 * Invalid output is routed to retry or human review. It is NEVER patched up
 * into a "complete" report — a fabricated complete report is worse than an
 * honest incomplete one, because it looks finished.
 */

import {
  validateFindingCitations,
  type Citation,
  type SnapshotIndex,
} from "./citations";
import { assertNoTestVerdict, type DeterministicSection } from "./separation";
import { PERMITTED_OUTCOMES, type DimensionId, type DimensionOutcome } from "./rubric";
import { validateCommunicationSection } from "./communication";

export const MODEL_OUTPUT_SCHEMA_VERSION = 1;
export const MAX_SUMMARY_CHARS = 2000;
export const MAX_CLAIM_CHARS = 500;
export const MAX_FINDINGS = 20;
export const MAX_RATIONALE_CHARS = 800;

export type ClaimStatus = "reproduced_defect" | "hypothesis" | "observation";

export const PERMITTED_CLAIM_STATUS: ClaimStatus[] = [
  "reproduced_defect",
  "hypothesis",
  "observation",
];

export interface ModelFinding {
  id: string;
  dimension: DimensionId;
  claim: string;
  status: ClaimStatus;
  /** true when the claim matters for the decision (defects, security). */
  material: boolean;
  citations: Citation[];
}

export interface ModelReviewOutput {
  schemaVersion: number;
  summary: string;
  findings: ModelFinding[];
  dimensionNotes: Record<string, { outcome: DimensionOutcome; rationale: string }>;
  /** Optional model-raised flags, e.g. "prompt_injection_attempt". */
  flags?: string[];
}

export type ValidationRoute = "retry" | "human_review";

export interface ModelValidation {
  ok: boolean;
  reasons: string[];
  /** Where invalid output goes. Absent when ok. */
  route?: ValidationRoute;
}

export interface ValidationContext {
  snapshot: SnapshotIndex;
  testOutputs: Set<string>;
  messages: Set<string>;
  deterministic: DeterministicSection;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const DIMENSIONS: DimensionId[] = ["correctness", "robustness", "code_quality", "communication"];

/** Universal pass/fail claims in prose that contradict the harness record. */
function detectContradiction(summary: string, det: DeterministicSection): string[] {
  const problems: string[] = [];
  const failedIds = det.tests.filter((t) => t.status === "failed" || t.status === "error");
  const assertsUniversalPass = /\ball tests pass\b/i.test(summary) || /\b100%\s*pass/i.test(summary);
  if (assertsUniversalPass && failedIds.length > 0) {
    problems.push(
      `contradiction: summary claims universal test success but harness records failures: ${failedIds.map((t) => t.id).join(", ")}`,
    );
  }
  // Claims a specific test passed that the harness records as failed/error.
  for (const t of failedIds) {
    const re = new RegExp(`\\b${t.id}\\b[^.]{0,60}\\bpass(?:ed|es)?\\b`, "i");
    if (re.test(summary)) {
      problems.push(`contradiction: summary claims ${t.id} passed; harness records ${t.status}`);
    }
  }
  return problems;
}

function checkBoundedLength(out: ModelReviewOutput, reasons: string[]): void {
  if (typeof out.summary === "string" && out.summary.length > MAX_SUMMARY_CHARS) {
    reasons.push(`summary is ${out.summary.length} chars (max ${MAX_SUMMARY_CHARS})`);
  }
  const findings = Array.isArray(out.findings) ? out.findings : [];
  if (findings.length > MAX_FINDINGS) {
    reasons.push(`findings count ${findings.length} exceeds max ${MAX_FINDINGS}`);
  }
  findings.forEach((f, i) => {
    if (typeof f?.claim === "string" && f.claim.length > MAX_CLAIM_CHARS) {
      reasons.push(`finding[${i}].claim is ${f.claim.length} chars (max ${MAX_CLAIM_CHARS})`);
    }
  });
}

/** Full validation of untrusted model output. Never throws on bad input. */
export function validateModelOutput(raw: unknown, ctx: ValidationContext): ModelValidation {
  const reasons: string[] = [];
  const fail = (route: ValidationRoute): ModelValidation => ({ ok: false, reasons, route });

  if (!isRecord(raw)) return { ok: false, reasons: ["output is not a JSON object"], route: "retry" };
  const out = raw as Partial<ModelReviewOutput>;

  // 1. Schema shape.
  if (out.schemaVersion !== MODEL_OUTPUT_SCHEMA_VERSION) {
    return {
      ok: false,
      reasons: [`schemaVersion must be ${MODEL_OUTPUT_SCHEMA_VERSION}, got ${String(out.schemaVersion)}`],
      route: "retry",
    };
  }
  if (typeof out.summary !== "string" || out.summary.trim() === "") {
    reasons.push("summary must be a non-empty string");
  }
  if (!Array.isArray(out.findings)) reasons.push("findings must be an array");
  if (!isRecord(out.dimensionNotes)) reasons.push("dimensionNotes must be an object");

  // 2. AI-01: no test-verdict declarations anywhere in the output.
  try {
    assertNoTestVerdict(raw);
  } catch (e) {
    reasons.push(`AI-01: ${(e as Error).message}`);
  }

  const findings = (Array.isArray(out.findings) ? out.findings : []) as ModelFinding[];
  const notes = (isRecord(out.dimensionNotes) ? out.dimensionNotes : {}) as Record<
    string,
    { outcome: DimensionOutcome; rationale: string }
  >;

  // 3. Bounded length.
  checkBoundedLength(out as ModelReviewOutput, reasons);

  // 4. Permitted labels + per-finding citation validation.
  const seenIds = new Set<string>();
  findings.forEach((f, i) => {
    const tag = `finding[${i}]`;
    if (!isRecord(f)) {
      reasons.push(`${tag} is not an object`);
      return;
    }
    if (typeof f.id !== "string" || f.id === "") reasons.push(`${tag}.id must be a non-empty string`);
    else if (seenIds.has(f.id)) reasons.push(`${tag}.id "${f.id}" is duplicated`);
    else seenIds.add(f.id);
    if (!DIMENSIONS.includes(f.dimension)) {
      reasons.push(`${tag}.dimension "${String(f.dimension)}" is not a permitted dimension`);
    }
    if (typeof f.claim !== "string" || f.claim.trim() === "") {
      reasons.push(`${tag}.claim must be a non-empty string`);
    }
    if (!PERMITTED_CLAIM_STATUS.includes(f.status)) {
      reasons.push(`${tag}.status "${String(f.status)}" is not permitted (reproduced_defect | hypothesis | observation)`);
    }
    const material = f.material === true;
    const cv = validateFindingCitations(f.citations, material, ctx.snapshot, ctx.testOutputs, ctx.messages);
    for (const p of cv.problems) {
      reasons.push(`${tag}.citations[${p.citationIndex}]: ${p.reason}`);
    }
  });

  // 5. Dimension notes: permitted outcomes, bounded rationale, narrow communication.
  for (const [dim, note] of Object.entries(notes)) {
    if (!DIMENSIONS.includes(dim as DimensionId)) {
      reasons.push(`dimensionNotes key "${dim}" is not a permitted dimension`);
      continue;
    }
    if (!isRecord(note)) {
      reasons.push(`dimensionNotes["${dim}"] must be an object`);
      continue;
    }
    if (!PERMITTED_OUTCOMES.includes(note.outcome)) {
      reasons.push(
        `dimensionNotes["${dim}"].outcome "${String(note.outcome)}" is not permitted (${PERMITTED_OUTCOMES.join(" | ")})`,
      );
    }
    if (typeof note.rationale === "string" && note.rationale.length > MAX_RATIONALE_CHARS) {
      reasons.push(`dimensionNotes["${dim}"].rationale exceeds ${MAX_RATIONALE_CHARS} chars`);
    }
    if (dim === "communication" && typeof note.rationale === "string") {
      const cr = validateCommunicationSection(note.rationale);
      if (!cr.ok) reasons.push(`dimensionNotes["communication"]: ${cr.reason}`);
    }
  }

  // 6. Contradiction checks against the deterministic section.
  if (typeof out.summary === "string") {
    reasons.push(...detectContradiction(out.summary, ctx.deterministic));
  }

  if (reasons.length === 0) return { ok: true, reasons: [] };

  // Route: structural problems (schema/bounds/labels) are retryable; semantic
  // problems (contradictions, AI-01, bad citations, prohibited inferences)
  // go to a human — retrying the model is unlikely to fix judgment errors.
  const semantic = /contradiction|AI-01|citation|communication/i;
  const route: ValidationRoute = reasons.some((r) => semantic.test(r)) ? "human_review" : "retry";
  return fail(route);
}
