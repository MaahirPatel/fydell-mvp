/**
 * AI-01 — Separation of deterministic and interpretive results.
 *
 * Hard rule: actual test results live ONLY in the deterministic section,
 * produced by the evaluator-controlled harness. The interpretive (model)
 * section may *cite* those results ("the harness reports 2 failures, see
 * test run t-118") but it can never *declare* a verdict. A model that writes
 * `testsPassed: true` is not "optimistic" — it is invalid output, rejected
 * before it can reach a report.
 *
 * This is enforced twice:
 *  1. By construction: the InterpretiveSection type has no verdict fields.
 *  2. At runtime: assertNoTestVerdict() scans untrusted model JSON for
 *     verdict-shaped data, because the model does not get to choose the type.
 */

import type { Citation } from "./citations";

/* ------------------------------------------------------------------ */
/* Deterministic section — produced by harness/engine, never by model  */
/* ------------------------------------------------------------------ */

export type TestStatus = "passed" | "failed" | "error" | "skipped";

export interface DeterministicTestResult {
  /** Stable id of the authoritative test record, e.g. "t-118". */
  id: string;
  name: string;
  status: TestStatus;
  /** ms, if measured. */
  durationMs?: number;
  /** Pointer to the redacted log excerpt (never the raw candidate print). */
  logRef?: string;
}

export interface DeterministicSection {
  /** Hash pinning the exact submission snapshot the tests ran against. */
  submissionHash: string;
  /** Hash pinning the authoritative test suite version. */
  testSuiteHash: string;
  tests: DeterministicTestResult[];
  /** Findings from the deterministic static-analysis engine. */
  engineFindings: {
    code: string;
    severity: "bug" | "security" | "risk" | "note";
    file: string;
    line: number;
    title: string;
  }[];
  ranAt: string;
}

export function summarizeTests(d: DeterministicSection): {
  total: number;
  passed: number;
  failed: number;
  errored: number;
  skipped: number;
  allPassed: boolean;
} {
  const total = d.tests.length;
  const passed = d.tests.filter((t) => t.status === "passed").length;
  const failed = d.tests.filter((t) => t.status === "failed").length;
  const errored = d.tests.filter((t) => t.status === "error").length;
  const skipped = d.tests.filter((t) => t.status === "skipped").length;
  return { total, passed, failed, errored, skipped, allPassed: total > 0 && failed === 0 && errored === 0 };
}

/* ------------------------------------------------------------------ */
/* Interpretive section — model prose; verdict fields are forbidden    */
/* ------------------------------------------------------------------ */

/**
 * Keys a model must never emit as data. "testsPassed" with a boolean value
 * is a verdict declaration. A model may still write prose like "the harness
 * reports two failures (t-118, t-121)" — that is a *citation*, checked by
 * contradiction detection in modelOutput.ts.
 */
export const FORBIDDEN_VERDICT_KEYS = [
  "testsPassed",
  "allTestsPassed",
  "testVerdict",
  "testsVerdict",
  "passRate",
  "testsPassing",
  "suitePassed",
  "evaluationPassed",
] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Recursively scan untrusted model output for verdict-shaped data.
 * Returns the offending key paths (empty = clean).
 *
 * A key counts as a verdict declaration only when it carries a verdict-like
 * value (boolean, or a pass/fail-ish string/number). A prose string that
 * merely *mentions* tests is not a verdict — contradiction with the
 * deterministic section is checked separately.
 */
export function findTestVerdicts(value: unknown, path = "$"): string[] {
  const hits: string[] = [];
  const forbidden = new Set<string>(FORBIDDEN_VERDICT_KEYS as readonly string[]);
  const visit = (v: unknown, p: string) => {
    if (Array.isArray(v)) {
      v.forEach((item, i) => visit(item, `${p}[${i}]`));
      return;
    }
    if (!isRecord(v)) return;
    for (const [k, val] of Object.entries(v)) {
      const child = `${p}.${k}`;
      if (forbidden.has(k)) {
        const verdictLike =
          typeof val === "boolean" ||
          (typeof val === "string" && /pass|fail|ok\b|success/i.test(val)) ||
          typeof val === "number";
        if (verdictLike) hits.push(child);
      }
      visit(val, child);
    }
  };
  visit(value, path);
  return hits;
}

/** Throw if the untrusted model output declares any test verdict. */
export function assertNoTestVerdict(modelOutput: unknown): void {
  const hits = findTestVerdicts(modelOutput);
  if (hits.length > 0) {
    throw new Error(
      `AI-01 violation: interpretive output declares test verdicts at ${hits.join(", ")}. ` +
        `Test results come only from the deterministic harness section.`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* Report assembly — the two sections stay visibly distinct            */
/* ------------------------------------------------------------------ */

export interface InterpretiveSection {
  summary: string;
  findings: {
    id: string;
    dimension: string;
    claim: string;
    /** reproduced_defect | hypothesis | observation — see grounding.ts */
    status: string;
    citations: Citation[];
  }[];
  /** Free-form per-dimension notes; must not contain verdict keys (checked). */
  dimensionNotes: Record<string, { outcome: string; rationale: string }>;
}

export interface AssembledReport {
  deterministic: DeterministicSection;
  interpretive: InterpretiveSection;
  /** The sections are rendered under separate headings; never merged. */
  sectionOrder: ["deterministic", "interpretive"];
}

export function assembleReport(
  deterministic: DeterministicSection,
  interpretive: unknown,
): AssembledReport {
  // Runtime enforcement even though the type already forbids verdict fields:
  // the model ships JSON, not TypeScript.
  assertNoTestVerdict(interpretive);
  const section = interpretive as InterpretiveSection;
  if (typeof section.summary !== "string" || !Array.isArray(section.findings)) {
    throw new Error("AI-01: interpretive section is missing required fields (summary, findings).");
  }
  return { deterministic, interpretive: section, sectionOrder: ["deterministic", "interpretive"] };
}
