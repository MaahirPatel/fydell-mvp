import type { DemoCriterion, DemoScenario } from "./catalog-types";
import { diffFiles, type FileDiff } from "./diff";
import { runtimeFor } from "./runtime";
import { HANDOFF_FIELDS, HANDOFF_PROMPTS, type Handoff, type HandoffField, type TeamMessage } from "./state";
import type { TestMeta, TestResult, TestStatus } from "./types";

export type CriterionState = "concern_observed" | "partially_demonstrated" | "demonstrated" | "not_assessed";

export const CRITERION_STATE_LABEL: Record<CriterionState, string> = {
  concern_observed: "Concern observed",
  partially_demonstrated: "Partially demonstrated",
  demonstrated: "Demonstrated",
  not_assessed: "Not assessed",
};

export type SupportingTest = { meta: TestMeta; status: TestStatus; message: string | null };

export type CriterionOutcome = {
  criterion: DemoCriterion;
  state: CriterionState;
  reason: string;
  tests: SupportingTest[];
};

export type TestTally = { passed: number; total: number };

export type Report = {
  noChanges: boolean;
  diffs: FileDiff[];
  criteria: CriterionOutcome[];
  publicTests: TestTally;
  protectedTests: TestTally;
};

function count(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function supportingTests(scenario: DemoScenario, criterionId: string, results: TestResult[]): SupportingTest[] {
  const rt = runtimeFor(scenario);
  return scenario.tests.flatMap((t) => {
    if (!t.criterionIds.includes(criterionId)) return [];
    const meta = rt.testMeta(`${t.file}::${t.name}`);
    if (!meta) return [];
    const result = results.find((r) => r.id === meta.id);
    return [{ meta, status: result?.status ?? "not_run", message: result?.message ?? null }];
  });
}

/**
 * States come only from what ran: every supporting test passed, some did,
 * none did, or nothing can be said. A submission with no code changes is not
 * assessed at all, because nothing in it can be attributed to the candidate.
 */
export function deriveState(tests: SupportingTest[], noChanges: boolean): { state: CriterionState; reason: string } {
  if (noChanges) return { state: "not_assessed", reason: "No code changes were submitted, so there is nothing to attribute to the candidate." };
  if (tests.length === 0) return { state: "not_assessed", reason: "No test checks this criterion. The reviewer reads the code for it." };
  const ran = tests.filter((t) => t.status !== "not_run");
  if (ran.length === 0) return { state: "not_assessed", reason: "None of the tests for this criterion ran." };
  const passed = ran.filter((t) => t.status === "pass").length;
  const failed = ran.length - passed;
  const summary = `${count(ran.length, "supporting test")}: ${passed} passed, ${failed} failed.`;
  if (failed === 0) return { state: "demonstrated", reason: summary };
  if (passed === 0) return { state: "concern_observed", reason: summary };
  return { state: "partially_demonstrated", reason: summary };
}

function tally(results: TestResult[], tests: TestMeta[]): TestTally {
  const ids = new Set(tests.map((t) => t.id));
  const mine = results.filter((r) => ids.has(r.id));
  return { passed: mine.filter((r) => r.status === "pass").length, total: mine.length };
}

export function deriveReport(scenario: DemoScenario, submitted: Record<string, string>, results: TestResult[]): Report {
  const rt = runtimeFor(scenario);
  const diffs = diffFiles(rt.starterFiles, { ...rt.starterFiles, ...submitted }, rt.editablePaths);
  const noChanges = diffs.length === 0;
  const criteria = scenario.criteria.map((criterion) => {
    const tests = supportingTests(scenario, criterion.id, results);
    return { criterion, ...deriveState(tests, noChanges), tests };
  });
  return {
    noChanges,
    diffs,
    criteria,
    publicTests: tally(results, rt.publicTests),
    protectedTests: tally(
      results,
      rt.tests.filter((t) => t.visibility === "protected"),
    ),
  };
}

export type WrittenEvidence = {
  handoff: { field: HandoffField; prompt: string; text: string }[];
  messages: { id: string; to: string; text: string; at: string }[];
};

/**
 * What the candidate wrote, as written: answered handoff questions and their
 * own sent team messages. Shown to the reviewer as evidence and never scored,
 * so the number or length of messages changes nothing.
 */
export function writtenEvidence(scenario: DemoScenario, handoff: Handoff, transcript: TeamMessage[]): WrittenEvidence {
  return {
    handoff: HANDOFF_FIELDS.flatMap((field) => {
      const text = handoff[field].trim();
      return text ? [{ field, prompt: HANDOFF_PROMPTS[field], text }] : [];
    }),
    messages: transcript.flatMap((m) =>
      m.from === "you" && m.to ? [{ id: m.id, to: scenario.teammates.find((c) => c.id === m.to)?.name ?? m.to, text: m.text, at: m.at }] : [],
    ),
  };
}

export type ValidationCheck = { id: string; label: string; passed: boolean; detail: string };

/**
 * The checks a package passes before it is published, recomputed from real
 * runs of the starter and the reference solution in this browser.
 */
export function validationChecks(scenario: DemoScenario, starter: TestResult[], reference: TestResult[]): ValidationCheck[] {
  const rt = runtimeFor(scenario);
  const total = rt.tests.length;
  const reported = starter.filter((r) => r.message !== "This test did not report a result." && !(r.message ?? "").startsWith("Could not load")).length;
  const starterFailing = starter.filter((r) => r.status === "fail").length;
  const referencePassing = reference.filter((r) => r.status === "pass").length;
  return [
    {
      id: "runs",
      label: "Every test loads and reports in the browser",
      passed: reported === total,
      detail: `${reported} of ${total} tests reported a result on the starter code.`,
    },
    {
      id: "reproduces",
      label: "The starter code leaves real work to do",
      passed: starterFailing > 0,
      detail: `${starterFailing} of ${total} tests fail on the starter code.`,
    },
    {
      id: "reference",
      label: "The reference solution passes every test",
      passed: referencePassing === total,
      detail: `${referencePassing} of ${total} tests pass on the reference solution.`,
    },
  ];
}
