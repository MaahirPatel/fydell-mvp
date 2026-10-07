/**
 * AI-10 - Evaluator versions and override recording.
 *
 * Every report carries provenance: which evaluator, rubric, prompt, and model
 * produced it, and hashes pinning the exact inputs. Reviewer edits are
 * recorded as overrides with a reason - never silent. Revised reports keep
 * their history: the current report plus every superseded version's
 * provenance and override list.
 */

export const EVALUATOR_VERSION = "0.1.0";
export { RUBRIC_VERSION } from "./rubric";
export { REVIEWER_PROMPT_VERSION } from "./injection";
export const MODEL_OUTPUT_SCHEMA_VERSION_RE = 1;

export interface Override {
  id: string;
  at: string;
  editor: string;
  /** What was changed, in the editor's words. */
  change: string;
  reason: string;
}

export interface EvaluationProvenance {
  evaluatorVersion: string;
  rubricVersion: string;
  promptVersion: string;
  /** Model id or "deterministic-only" when no model was used. */
  modelId: string;
  inputRefs: {
    bundleHash: string;
    submissionHash: string;
    testSuiteHash: string;
  };
  overrides: Override[];
  createdAt: string;
}

let overrideSeq = 0;

/** Create provenance for a fresh evaluation. */
export function newProvenance(input: {
  modelId: string;
  bundleHash: string;
  submissionHash: string;
  testSuiteHash: string;
}): EvaluationProvenance {
  return {
    evaluatorVersion: EVALUATOR_VERSION,
    rubricVersion: "2026-09-27.1",
    promptVersion: "2026-09-27.1",
    modelId: input.modelId,
    inputRefs: {
      bundleHash: input.bundleHash,
      submissionHash: input.submissionHash,
      testSuiteHash: input.testSuiteHash,
    },
    overrides: [],
    createdAt: new Date().toISOString(),
  };
}

/** Record a reviewer edit. The edit is appended - history is never rewritten. */
export function recordOverride(
  provenance: EvaluationProvenance,
  editor: string,
  change: string,
  reason: string,
): EvaluationProvenance {
  if (!editor || !change || !reason) {
    throw new Error("AI-10: overrides require editor, change, and reason. Silent edits are not allowed.");
  }
  overrideSeq += 1;
  return {
    ...provenance,
    overrides: [
      ...provenance.overrides,
      {
        id: `ovr-${overrideSeq}`,
        at: new Date().toISOString(),
        editor,
        change,
        reason,
      },
    ],
  };
}

export interface VersionedReport<T> {
  version: number;
  report: T;
  provenance: EvaluationProvenance;
  supersededAt?: string;
  supersededReason?: string;
}

/** Revise a report: the new version carries the full history. */
export function reviseReport<T>(
  current: VersionedReport<T>,
  revised: T,
  reason: string,
): { current: VersionedReport<T>; history: VersionedReport<T>[] } {
  const superseded: VersionedReport<T> = {
    ...current,
    supersededAt: new Date().toISOString(),
    supersededReason: reason,
  };
  const next: VersionedReport<T> = {
    version: current.version + 1,
    report: revised,
    provenance: current.provenance,
  };
  return { current: next, history: [superseded] };
}
