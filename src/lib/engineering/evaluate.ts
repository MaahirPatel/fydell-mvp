/**
 * Interpret a provider result into a run result (pure).
 *
 * The verdict comes only from the JUnit file written through the trusted
 * bootstrap, never from anything the candidate's code printed (RUN-04).
 * Integrity checks (RUN-05):
 *  - evaluation runs must report the harness canary as failed; a reported
 *    pass means reporting was tampered with -> indeterminate;
 *  - every group's expected tests must be present; missing ones ->
 *    indeterminate.
 * Platform failures are infrastructure_error, never a candidate failure
 * (RUN-06, UP-08).
 */

import { classifyRunOutcome } from "@/lib/eval/classifier";
import { parseJUnitXml } from "./junit";
import type {
  EngineeringRunResult,
  GroupResult,
  ProviderResult,
  RunIntegrity,
  RunWorkspace,
  TestCaseResult,
  TestOrigin,
  TrustedMaterial,
} from "./types";

function originFor(file: string, material: TrustedMaterial): TestOrigin {
  const mount = material.descriptor.hidden.mountDir.replace(/\/$/, "") + "/";
  if (file.startsWith(mount)) return "hidden";
  if (file in material.trusted) return "provided";
  return "candidate";
}

function matches(test: TestCaseResult, prefix: string): boolean {
  return prefix.endsWith("::") ? test.id.startsWith(prefix) : test.baseId === prefix;
}

export function groupResults(
  tests: TestCaseResult[],
  material: TrustedMaterial,
  updatePresented: (updateId: string) => boolean
): { groups: GroupResult[]; missingExpected: string[] } {
  const missingExpected: string[] = [];
  const groups: GroupResult[] = material.descriptor.groups.map((g) => {
    const matched: TestCaseResult[] = [];
    for (const prefix of g.tests) {
      const hits = tests.filter((t) => t.origin !== "candidate" && matches(t, prefix));
      if (hits.length === 0) missingExpected.push(prefix);
      matched.push(...hits);
    }
    const passed = matched.filter((t) => t.outcome === "passed").length;
    const base = { id: g.id, label: g.label, dimension: g.dimension, passed, total: matched.length };
    if (g.requiresUpdate && !updatePresented(g.requiresUpdate)) {
      return {
        ...base,
        status: "not_applicable" as const,
        note: "The requirement update was never presented in this attempt, so adaptation was not observed.",
      };
    }
    if (matched.length === 0) return { ...base, status: "not_run" as const };
    return { ...base, status: passed === matched.length ? ("pass" as const) : ("fail" as const) };
  });
  return { groups, missingExpected };
}

function summarize(tests: TestCaseResult[]) {
  return {
    passed: tests.filter((t) => t.outcome === "passed").length,
    failed: tests.filter((t) => t.outcome === "failed").length,
    errors: tests.filter((t) => t.outcome === "error").length,
    skipped: tests.filter((t) => t.outcome === "skipped").length,
  };
}

export function interpretRun(args: {
  workspace: RunWorkspace;
  material: TrustedMaterial;
  result: ProviderResult;
  /** Evaluation only: whether a requirement update was presented in the attempt. */
  updatePresented?: (updateId: string) => boolean;
}): EngineeringRunResult {
  const { workspace, material, result } = args;
  const { descriptor } = material;
  const base = {
    kind: workspace.kind,
    candidateSnapshotHash: workspace.candidateSnapshotHash,
    scenarioId: descriptor.scenarioId,
    scenarioVersion: descriptor.scenarioVersion,
    suiteVersion: descriptor.suiteVersion,
    environmentVersion: result.environmentVersion,
    provider: result.provider,
    restoredTrusted: workspace.restoredTrusted,
    ignored: workspace.ignored,
    output: result.output,
    outputTruncated: result.outputTruncated,
  };
  const noIntegrity: RunIntegrity = {
    canary: workspace.kind === "evaluation" ? "missing" : "not_applicable",
    missingExpected: [],
  };

  if (result.infrastructureError) {
    return {
      ...base,
      status: "infrastructure_error",
      statusReason: `The test runner failed (${result.infrastructureError}). Your saved work is unchanged; this is not a result about your code.`,
      classification: "platform_outage",
      tests: [],
      groups: [],
      integrity: noIntegrity,
      summary: summarize([]),
    };
  }

  const parsed = result.junitXml ? parseJUnitXml(result.junitXml) : [];
  const tests: TestCaseResult[] = parsed.map((t) => ({ ...t, origin: originFor(t.file, material) }));

  if (result.timedOut || parsed.length === 0) {
    const classified = classifyRunOutcome({
      phase: parsed.length > 0 ? "test" : "unknown",
      exitCode: result.exitCode ?? undefined,
      timedOut: result.timedOut,
      testsStarted: parsed.length > 0,
      harnessError: false,
      platformHealthy: true,
      stderrTail: result.output.slice(-2000),
    });
    // Pytest exit code 2 (interrupted) / 4 (usage error) with no results is
    // most often an import or syntax error in the candidate's code.
    const importError = !result.timedOut && parsed.length === 0 && (result.exitCode === 2 || result.exitCode === 4);
    return {
      ...base,
      status: result.timedOut && parsed.length > 0 ? "completed" : "indeterminate",
      statusReason: result.timedOut
        ? `The run hit the ${descriptor.runtime.timeoutSeconds}s limit. Check for loops that never finish.`
        : importError
          ? "No test could run. This usually means an import or syntax error; see the output."
          : "The runner produced no test results. See the output; if nothing there explains it, contact support with the run reference.",
      classification: importError ? "code_error" : classified.classification,
      tests,
      groups: [],
      integrity: noIntegrity,
      summary: summarize(tests),
    };
  }

  let integrity: RunIntegrity = { canary: "not_applicable", missingExpected: [] };
  let groups: GroupResult[] = [];
  let status: EngineeringRunResult["status"] = "completed";
  let statusReason: string | null = null;

  if (workspace.kind === "evaluation") {
    const canary = tests.find((t) => t.baseId === descriptor.canary);
    const canaryState: RunIntegrity["canary"] = !canary
      ? "missing"
      : canary.outcome === "failed"
        ? "failed_as_expected"
        : "passed_unexpectedly";
    const grouped = groupResults(
      tests.filter((t) => t.baseId !== descriptor.canary),
      material,
      args.updatePresented ?? (() => true)
    );
    groups = grouped.groups;
    integrity = { canary: canaryState, missingExpected: grouped.missingExpected };
    if (canaryState !== "failed_as_expected") {
      status = "indeterminate";
      statusReason =
        canaryState === "passed_unexpectedly"
          ? "The harness integrity check did not behave as expected, so these results cannot be trusted. Routed to human review."
          : "The harness integrity check did not run. Routed to human review.";
    } else if (grouped.missingExpected.length > 0) {
      status = "indeterminate";
      statusReason = "Some expected tests did not run (for example, an import error in one module). Routed to human review.";
    }
  }

  const visibleTests = tests.filter((t) => t.baseId !== descriptor.canary);
  return {
    ...base,
    status,
    statusReason,
    classification: null,
    tests: visibleTests,
    groups,
    integrity,
    summary: summarize(visibleTests),
  };
}

/** Candidate-safe projection: hidden tests are never shown individually. */
export function toCandidateView(run: EngineeringRunResult) {
  return {
    kind: run.kind,
    status: run.status,
    statusReason: run.statusReason,
    candidateSnapshotHash: run.candidateSnapshotHash,
    suiteVersion: run.suiteVersion,
    environmentVersion: run.environmentVersion,
    tests: run.tests
      .filter((t) => t.origin !== "hidden")
      .map((t) => ({ id: t.id, origin: t.origin, outcome: t.outcome, message: t.message })),
    summary: run.summary,
    restoredTrusted: run.restoredTrusted,
    ignored: run.ignored,
    output: run.kind === "practice" ? run.output : "",
    outputTruncated: run.kind === "practice" ? run.outputTruncated : false,
  };
}
