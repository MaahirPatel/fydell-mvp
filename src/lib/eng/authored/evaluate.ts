import "server-only";
import { matchesRef } from "../authoring/checks";
import { FILE_LIMITS, isSafePath, type PackageFile, type ProtectedMaterials, type ScenarioPackage, type TestRef } from "../authoring/package";
import type { EnvironmentId } from "../authoring/registry";
import type { Runner, RunnerInfo, SuiteRun, TestCaseResult } from "../authoring/runner";
import type { ProbeResult } from "../types";
import type { AuthoredCriterionResult, AuthoredState, EmployerAuthoredEvaluation, TestOutcomeView } from "./types";

export const PUBLIC_RUN_TIMEOUT_MS = 30_000;
export const EVALUATION_TIMEOUT_MS = 60_000;

/**
 * Names a candidate file may not take, because the test command would load
 * them before the tests and could change what the tests report. Overwriting a
 * test file is harmless (tests are restored before every run) and allowed.
 */
const RESERVED_PATH = /(^|\/)(sitecustomize|usercustomize)\.py$|^unittest(\.py$|\/)|\.pth$|(^|\/)node_modules\/|(^|\/)__pycache__\//;

export type CandidateFilesResult = { ok: true; files: PackageFile[] } | { ok: false; error: string };

/** Validates files sent by the browser. Nothing here trusts the client's shape. */
export function validateCandidateFiles(pkg: ScenarioPackage, raw: unknown): CandidateFilesResult {
  if (!Array.isArray(raw)) return { ok: false, error: "Send the files as a list." };
  const maxFiles = Math.max(FILE_LIMITS.maxFiles, pkg.starterFiles.length + 10);
  if (raw.length === 0) return { ok: false, error: "The project has no files." };
  if (raw.length > maxFiles) return { ok: false, error: `The project can have at most ${maxFiles} files.` };
  const files: PackageFile[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, error: "Every file needs a path and content." };
    const { path, content } = item as { path?: unknown; content?: unknown };
    if (typeof path !== "string" || typeof content !== "string") return { ok: false, error: "Every file needs a path and content." };
    if (!isSafePath(path)) return { ok: false, error: `"${path.slice(0, 80)}" is not a safe relative path.` };
    if (RESERVED_PATH.test(path)) return { ok: false, error: `${path} is a reserved name the test runner would load. Choose another file name.` };
    if (seen.has(path)) return { ok: false, error: `${path} appears twice.` };
    seen.add(path);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > FILE_LIMITS.maxFileBytes) return { ok: false, error: `${path} is larger than ${FILE_LIMITS.maxFileBytes / 1000} KB.` };
    total += bytes;
    files.push({ path, content });
  }
  if (total > FILE_LIMITS.maxTotalBytes) return { ok: false, error: `The files total more than ${FILE_LIMITS.maxTotalBytes / 1000} KB.` };
  return { ok: true, files };
}

export function overlay(base: PackageFile[], over: PackageFile[]): PackageFile[] {
  const map = new Map(base.map((f) => [f.path, f.content]));
  for (const f of over) map.set(f.path, f.content);
  return [...map.entries()].map(([path, content]) => ({ path, content }));
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i + 1);
}

/**
 * Published test files plus the starter's support files that sit beside them
 * (helpers, fixtures loaded by the tests). Restored before every run so a
 * candidate edit to a shared helper cannot change what the tests report.
 * Test files at the project root restore only themselves.
 */
function restoredTestFiles(pkg: ScenarioPackage, testPaths: string[]): PackageFile[] {
  const paths = new Set(testPaths);
  const dirs = new Set(testPaths.map(dirOf).filter((d) => d !== ""));
  return pkg.starterFiles.filter((f) => paths.has(f.path) || dirs.has(dirOf(f.path)));
}

function publicTestFiles(pkg: ScenarioPackage, extraTestPaths: string[] = []): PackageFile[] {
  return restoredTestFiles(pkg, [...pkg.publicTests.map((t) => t.file), ...extraTestPaths]);
}

export type ProjectRequest = { environment: EnvironmentId; files: PackageFile[]; testFiles: string[] };

/** The candidate's files with the published public tests restored, running only the public tests. */
export function publicTestProject(pkg: ScenarioPackage, candidate: PackageFile[]): ProjectRequest {
  return {
    environment: pkg.environment.id,
    files: overlay(overlay(pkg.starterFiles, candidate), publicTestFiles(pkg)),
    testFiles: [...new Set(pkg.publicTests.map((t) => t.file))],
  };
}

/**
 * The evaluation project: the candidate's files, then the published public
 * tests, then the protected tests on top, so a candidate file can never
 * replace an evaluation test. Runs every test file.
 */
export function evaluationProject(pkg: ScenarioPackage, prot: ProtectedMaterials, candidate: PackageFile[]): ProjectRequest {
  return {
    environment: pkg.environment.id,
    files: overlay(overlay(overlay(pkg.starterFiles, candidate), publicTestFiles(pkg, prot.protectedTestRefs.map((t) => t.file))), prot.protectedTests),
    testFiles: [...new Set([...pkg.publicTests.map((t) => t.file), ...prot.protectedTestRefs.map((t) => t.file)])],
  };
}

export type MappedEvaluation = Omit<EmployerAuthoredEvaluation, "runId" | "createdAt"> & {
  probeResults: ProbeResult[];
  summaryCounts: Record<string, number>;
  summary: string;
};

function outcomeOf(tests: TestCaseResult[], ref: TestRef): TestOutcomeView {
  return tests.find((t) => matchesRef(t.name, ref.name))?.outcome ?? "missing";
}

function joinTexts(items: string[]): string {
  return items.map((t) => `"${t}"`).join("; ");
}

/**
 * Turns one executed test run into per-test, per-acceptance-criterion and
 * per-rubric-criterion results. States come only from executed test results:
 * a criterion with no executed test is "insufficient evidence", never a pass
 * or a fail, and reviewer-judged criteria are always "not assessed".
 */
export function mapEvaluation(
  pkg: ScenarioPackage,
  prot: ProtectedMaterials,
  run: Extract<SuiteRun, { kind: "ran" } | { kind: "timeout" }>,
  runner: RunnerInfo,
): MappedEvaluation {
  const executed = run.kind === "ran" ? run.tests : [];
  const refs: Array<TestRef & { visibility: "public" | "protected" }> = [
    ...pkg.publicTests.map((r) => ({ ...r, visibility: "public" as const })),
    ...prot.protectedTestRefs.map((r) => ({ ...r, visibility: "protected" as const })),
  ];
  const tests = refs.map((r) => ({ name: r.name, file: r.file, visibility: r.visibility, outcome: outcomeOf(executed, r), criterionIds: [...r.criterionIds] }));
  const unmapped = executed.filter((t) => !refs.some((r) => matchesRef(t.name, r.name)));

  const acceptance = pkg.acceptanceCriteria.map((ac) => {
    const mapped = tests.filter((t) => t.criterionIds.includes(ac.id));
    const passed = mapped.filter((t) => t.outcome === "passed").length;
    const failed = mapped.filter((t) => t.outcome === "failed" || t.outcome === "error").length;
    const missing = mapped.length - passed - failed;
    const state = failed > 0 ? ("not_confirmed" as const) : mapped.length > 0 && missing === 0 ? ("confirmed" as const) : ("no_result" as const);
    return { id: ac.id, text: ac.text, state, passed, failed, missing };
  });
  const acById = new Map(acceptance.map((a) => [a.id, a]));

  const criteria: AuthoredCriterionResult[] = pkg.rubric.map((r) => {
    const base = { id: r.id, label: r.label, capability: r.capability, judgedBy: r.judgedBy, acceptanceCriterionIds: [...r.acceptanceCriterionIds] };
    if (r.judgedBy === "reviewer") {
      return {
        ...base,
        state: "not_assessed" as const,
        rationale: "Not assessed: awaiting reviewer. A person judges this criterion from the submission; tests do not.",
        evidence: { confirmed: 0, notConfirmed: 0, noResult: 0 },
      };
    }
    const acs = r.acceptanceCriterionIds.map((id) => acById.get(id)).filter((a): a is (typeof acceptance)[number] => Boolean(a));
    const confirmed = acs.filter((a) => a.state === "confirmed");
    const notConfirmed = acs.filter((a) => a.state === "not_confirmed");
    const noResult = acs.filter((a) => a.state === "no_result");
    const evidence = { confirmed: confirmed.length, notConfirmed: notConfirmed.length, noResult: noResult.length };
    let state: AuthoredState;
    const parts: string[] = [];
    if (confirmed.length) parts.push(`Tests confirmed ${joinTexts(confirmed.map((a) => a.text))}.`);
    if (notConfirmed.length) parts.push(`Tests did not confirm ${joinTexts(notConfirmed.map((a) => a.text))}.`);
    if (noResult.length) parts.push(`No test result was recorded for ${joinTexts(noResult.map((a) => a.text))}.`);
    if (acs.length === 0 || confirmed.length + notConfirmed.length === 0) {
      state = "insufficient_evidence";
      if (run.kind === "timeout") parts.unshift("The test run timed out, so no per-test result was recorded.");
      if (acs.length === 0) parts.push("No acceptance criterion is linked to this criterion.");
    } else if (notConfirmed.length === 0 && noResult.length === 0) state = "demonstrated";
    else if (notConfirmed.length === 0) state = "insufficient_evidence";
    else if (confirmed.length === 0) state = "concern_observed";
    else state = "partially_demonstrated";
    return { ...base, state, rationale: parts.join(" "), evidence };
  });

  const limitations: string[] = [
    "Tests check the behavior named in the acceptance criteria. They do not judge design, readability or the handoff; those need a reviewer.",
  ];
  if (!runner.isolated) limitations.push(`These tests ran on the ${runner.label}. It is not an isolated environment, so treat the results as development results only.`);
  if (run.kind === "timeout") limitations.push(`The test run stopped after ${Math.round(run.durationMs / 1000)} seconds without finishing, so per-test results were not recorded.`);
  if (run.kind === "ran" && executed.length === 0) limitations.push("The test command ran but reported no tests. The submission may fail to import or load.");
  if (unmapped.length) limitations.push(`${unmapped.length} test${unmapped.length === 1 ? "" : "s"} ran that ${unmapped.length === 1 ? "is" : "are"} not linked to an acceptance criterion and ${unmapped.length === 1 ? "was" : "were"} not used.`);

  const probeResults: ProbeResult[] = tests.map((t) => ({
    id: t.name,
    title: t.name,
    visibility: t.visibility === "public" ? "public" : "hidden",
    phase: "original",
    outcome: run.kind === "timeout" ? "timeout" : t.outcome === "passed" ? "passed" : t.outcome === "failed" || t.outcome === "error" ? "failed" : "no_result",
    failedChecks: [],
    detail: null,
  }));
  const summaryCounts = {
    total: tests.length,
    passed: tests.filter((t) => t.outcome === "passed").length,
    failed: tests.filter((t) => t.outcome === "failed" || t.outcome === "error").length,
    no_result: tests.filter((t) => t.outcome === "missing" || t.outcome === "skipped").length,
  };
  const testJudged = criteria.filter((c) => c.judgedBy === "tests").length;
  const reviewerJudged = criteria.length - testJudged;
  const summary =
    run.kind === "timeout"
      ? "The tests did not finish within the time limit, so this report records no test result for any criterion."
      : `Automated tests ran against the submitted files. Each acceptance criterion below shows what the tests confirmed.${reviewerJudged ? ` ${reviewerJudged === 1 ? "One criterion is" : `${reviewerJudged} criteria are`} judged by a reviewer and ${reviewerJudged === 1 ? "is" : "are"} not assessed by the tests.` : ""}`;

  return {
    runner: { name: runner.name, label: runner.label, isolated: runner.isolated, version: runner.version },
    suite: { outcome: run.kind, command: run.command, exitCode: run.kind === "ran" ? run.exitCode : null, durationMs: run.durationMs },
    tests,
    acceptance,
    criteria,
    limitations,
    output: run.output.slice(0, 20_000),
    probeResults,
    summaryCounts,
    summary,
  };
}

export type EvaluationOutcome = { kind: "evaluated"; evaluation: MappedEvaluation } | { kind: "infrastructure_error"; code: string; detail: string };

/** Runs public and protected tests against the candidate's files on the given runner. */
export async function runAuthoredEvaluation(runner: Runner, pkg: ScenarioPackage, prot: ProtectedMaterials, candidate: PackageFile[]): Promise<EvaluationOutcome> {
  const project = evaluationProject(pkg, prot, candidate);
  const [run] = await runner.runSuites([{ ...project, timeoutMs: EVALUATION_TIMEOUT_MS }]);
  if (!run) return { kind: "infrastructure_error", code: "runner_no_result", detail: "The runner returned no result." };
  if (run.kind === "infrastructure_error") return { kind: "infrastructure_error", code: run.code, detail: run.detail };
  return { kind: "evaluated", evaluation: mapEvaluation(pkg, prot, run, runner.info) };
}
