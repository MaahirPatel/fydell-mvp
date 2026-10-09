import "server-only";
import {
  CHECK_DEPENDENCIES,
  packageSha256,
  sectionRevisions,
  validateFiles,
  type PackageFile,
  type ProtectedMaterials,
  type ScenarioPackage,
  type SectionKey,
  type TestRef,
} from "./package";
import { packageLeaks } from "./leakage";
import { CAPABILITIES, DURATION_LIMITS, ENVIRONMENTS } from "./registry";
import { displayCommand, type Runner, type RunnerInfo, type SuiteRun, type TestCaseResult } from "./runner";

/** A suite that catches only one mistake may be shaped around it; two distinct ones show it checks the behavior. */
export const MIN_INCORRECT_SOLUTIONS = 2;

export type CheckStatus = "passed" | "failed" | "not_run";

export type RunEvidence = {
  label: string;
  command: string;
  outcome: "ran" | "timeout" | "infrastructure_error";
  exitCode: number | null;
  durationMs: number;
  tests: TestCaseResult[];
  output: string;
};

export type CheckResult = {
  id: string;
  label: string;
  kind: "execution" | "static";
  status: CheckStatus;
  detail: string;
  /** Concrete problems an author can act on. */
  issues: string[];
  evidence: RunEvidence[];
};

export type ValidationRecord = {
  status: "passed" | "blocked";
  packageSha256: string;
  runner: RunnerInfo | null;
  runnerUnavailable: string | null;
  sectionRevisions: Record<SectionKey, number>;
  checks: CheckResult[];
  ranAt: string;
};

const SECRET_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /AKIA[0-9A-Z]{16}/, label: "AWS access key" },
  { re: /\bsk-[A-Za-z0-9_-]{20,}/, label: "API secret key" },
  { re: /\bgsk_[A-Za-z0-9]{20,}/, label: "Groq API key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}/, label: "GitHub token" },
  { re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/, label: "Slack token" },
  { re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, label: "private key" },
  { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, label: "JWT" },
  { re: /\b(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^\s:]+:[^\s@]+@/, label: "database URL with password" },
];

/** Product names that look like file names in prose. */
const PRODUCT_NAMES = /^(node|next|vue|nuxt|express|react|three|d3|chart|ember|backbone|socket\.io|moment|day|alpine|solid|preact|deno)\.(js|ts)$/i;

function overlay(base: PackageFile[], over: PackageFile[]): PackageFile[] {
  const map = new Map(base.map((f) => [f.path, f.content]));
  for (const f of over) map.set(f.path, f.content);
  return [...map.entries()].map(([path, content]) => ({ path, content }));
}

export function matchesRef(result: string, ref: string): boolean {
  return result === ref || result.endsWith(`.${ref}`) || ref.endsWith(`.${result}`);
}

function evidence(label: string, run: SuiteRun): RunEvidence {
  if (run.kind === "ran") return { label, command: run.command, outcome: "ran", exitCode: run.exitCode, durationMs: run.durationMs, tests: run.tests, output: run.output };
  if (run.kind === "timeout") return { label, command: run.command, outcome: "timeout", exitCode: null, durationMs: run.durationMs, tests: [], output: run.output };
  return { label, command: "", outcome: "infrastructure_error", exitCode: null, durationMs: 0, tests: [], output: `${run.code}: ${run.detail}` };
}

function outcomeFor(run: SuiteRun, ref: TestRef): TestCaseResult["outcome"] | "missing" {
  if (run.kind !== "ran") return "missing";
  return run.tests.find((t) => matchesRef(t.name, ref.name))?.outcome ?? "missing";
}

/** Checks that need no execution. Exported for unit tests. */
export function staticChecks(pkg: ScenarioPackage, prot: ProtectedMaterials): CheckResult[] {
  const checks: CheckResult[] = [];
  const allRefs = [...pkg.publicTests, ...prot.protectedTestRefs];
  const acIds = new Set(pkg.acceptanceCriteria.map((a) => a.id));
  const push = (id: string, label: string, issues: string[], okDetail: string) =>
    checks.push({ id, label, kind: "static", status: issues.length ? "failed" : "passed", detail: issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"} to fix.` : okDetail, issues, evidence: [] });

  const fileIssues = [
    ...validateFiles(pkg.starterFiles, "Starter files"),
    ...validateFiles(prot.protectedTests, "Evaluation tests"),
    ...validateFiles(prot.reference.files, "Reference solution"),
  ];
  const starterPaths = new Set(pkg.starterFiles.map((f) => f.path));
  for (const t of prot.protectedTests) if (starterPaths.has(t.path)) fileIssues.push(`Evaluation test ${t.path} is also a starter file, so candidates would see it.`);
  for (const ref of prot.reference.files) {
    const starter = pkg.starterFiles.find((f) => f.path === ref.path);
    if (starter && starter.content === ref.content && prot.reference.files.length === 1) fileIssues.push(`The reference ${ref.path} is identical to the starter, so there is nothing to solve.`);
  }
  for (const r of pkg.publicTests) if (!starterPaths.has(r.file)) fileIssues.push(`Public test ${r.name} points to ${r.file}, which is not a starter file.`);
  const protPaths = new Set(prot.protectedTests.map((f) => f.path));
  for (const r of prot.protectedTestRefs) if (!protPaths.has(r.file)) fileIssues.push(`Evaluation test ${r.name} points to ${r.file}, which does not exist.`);
  push("protected_isolation", "Files and protected material", fileIssues, "Files are within limits and evaluation material is not in the candidate project.");

  const publicCommand = displayCommand(pkg.environment.id, [...new Set(pkg.publicTests.map((t) => t.file))]);
  const leak = packageLeaks(pkg, prot, publicCommand);
  push(
    "leakage",
    "Private material stays out of candidate and teammate context",
    [...new Set(leak.leaks.map((l) => `${l.context} contains ${l.source}: "${l.excerpt}"`))].slice(0, 12),
    `Scanned ${leak.contexts} candidate, teammate and assistant contexts for ${leak.fingerprints} private fingerprints (reference lines, protected test code and names, rubric notes, wrong-solution descriptions); none found.`,
  );

  const mapIssues: string[] = [];
  if (pkg.acceptanceCriteria.length === 0) mapIssues.push("Add at least one acceptance criterion.");
  for (const ac of pkg.acceptanceCriteria) if (!allRefs.some((r) => r.criterionIds.includes(ac.id))) mapIssues.push(`${ac.id} has no test checking it.`);
  if (allRefs.length === 0) mapIssues.push("There are no tests.");
  push("test_mapping", "Every requirement has tests", mapIssues, `${pkg.acceptanceCriteria.length} acceptance criteria, each checked by at least one test.`);

  const disclosedIssues: string[] = [];
  for (const r of allRefs) {
    if (r.criterionIds.length === 0) disclosedIssues.push(`Test ${r.name} is not mapped to any acceptance criterion. Map it, or remove it.`);
    for (const id of r.criterionIds) if (!acIds.has(id)) disclosedIssues.push(`Test ${r.name} checks ${id}, which is not in the brief. Tests may only check disclosed requirements.`);
  }
  push("disclosed_requirements", "Tests check only disclosed requirements", disclosedIssues, "Every test maps to a requirement the candidate can read.");

  const instrIssues: string[] = [];
  const briefText = [pkg.brief.context, pkg.brief.task, ...pkg.setupInstructions, ...pkg.brief.outcomes].join("\n");
  for (const m of briefText.matchAll(/\b([\w-]+(?:\/[\w.-]+)*\.(?:py|js|ts|json|sql|md|txt|csv))\b/g)) {
    const p = m[1];
    if (PRODUCT_NAMES.test(p)) continue;
    if (!starterPaths.has(p) && !pkg.starterFiles.some((f) => f.path.endsWith(`/${p}`))) instrIssues.push(`The brief refers to ${p}, which is not in the starter project.`);
  }
  if (!pkg.environment.testCommand.trim()) instrIssues.push("The candidate test command is missing.");
  push("instructions_files", "Instructions match the files", [...new Set(instrIssues)], "Every file the brief mentions exists, and the test command is set.");

  const secretIssues: string[] = [];
  const scan = (label: string, text: string) => {
    for (const s of SECRET_PATTERNS) if (s.re.test(text)) secretIssues.push(`${label} contains what looks like a ${s.label}. Remove it; tasks must use synthetic data only.`);
  };
  for (const f of pkg.starterFiles) scan(f.path, f.content);
  for (const f of prot.protectedTests) scan(f.path, f.content);
  for (const f of prot.reference.files) scan(`Reference ${f.path}`, f.content);
  scan("The brief", JSON.stringify(pkg.brief));
  push("secrets", "No credentials or secrets", [...new Set(secretIssues)], "No keys, tokens or credentials found in files or brief.");

  const rubricIssues: string[] = [];
  for (const name of pkg.config.custom?.customCapabilities ?? []) {
    if (!pkg.rubric.some((r) => r.label === name)) rubricIssues.push(`No criterion assesses ${name}.`);
  }
  for (const cap of pkg.config.capabilities) {
    if (!pkg.rubric.some((r) => r.capability === cap)) rubricIssues.push(`No criterion assesses ${CAPABILITIES.find((c) => c.id === cap)?.label ?? cap}.`);
  }
  for (const r of pkg.rubric) {
    const missing = (["whyItMatters", "observableEvidence", "insufficientEvidence", "candidateExplanation"] as const).filter((k) => !r[k].trim());
    if (missing.length) rubricIssues.push(`${r.label}: fill in ${missing.join(", ")}.`);
    if (!r.anchors.concern_observed.trim() || !r.anchors.partially_demonstrated.trim() || !r.anchors.demonstrated.trim()) rubricIssues.push(`${r.label}: describe all three evidence anchors.`);
    if (r.judgedBy === "tests" && r.acceptanceCriterionIds.length === 0) rubricIssues.push(`${r.label}: test-judged criteria must name the acceptance criteria they rely on.`);
    for (const id of r.acceptanceCriterionIds) if (!acIds.has(id)) rubricIssues.push(`${r.label}: refers to ${id}, which does not exist.`);
  }
  push("rubric", "Criteria are complete", rubricIssues, `${pkg.rubric.length} criteria, each with anchors and an explanation for candidates.`);

  const coworkerIssues: string[] = [];
  for (const c of pkg.coworkers) {
    if (!c.name.trim() || !c.title.trim() || !c.responsibilities.trim()) coworkerIssues.push(`A coworker is missing a name, title or responsibilities.`);
    if (!c.boundaries.trim()) coworkerIssues.push(`${c.name || "A coworker"}: describe what they will not do or decide.`);
    if (!(prot.coworkerFacts[c.id]?.length)) coworkerIssues.push(`${c.name || "A coworker"}: add at least one fact they can share when asked.`);
  }
  push("coworkers", "Coworkers are configured", coworkerIssues, pkg.coworkers.length ? `${pkg.coworkers.length} coworker${pkg.coworkers.length === 1 ? "" : "s"} with facts and boundaries.` : "No coworkers. Candidates work from the brief alone.");

  const policyIssues: string[] = [];
  if (pkg.aiPolicy.id !== pkg.config.aiPolicy) policyIssues.push("The AI policy shown to candidates differs from the configured policy.");
  if (!pkg.aiPolicy.candidateText.trim()) policyIssues.push("Write the AI policy as candidates will read it.");
  if (!pkg.feedbackPolicy.trim()) policyIssues.push("Describe what feedback candidates receive.");
  push("policy", "AI and feedback policy", policyIssues, "The AI policy and feedback policy are stated for candidates.");

  const timingIssues: string[] = [];
  const { taskMinutes, setupMinutes } = pkg.environment;
  if (taskMinutes < DURATION_LIMITS.minTask || taskMinutes > DURATION_LIMITS.maxTask) timingIssues.push(`Task time must be ${DURATION_LIMITS.minTask} to ${DURATION_LIMITS.maxTask} minutes.`);
  if (setupMinutes < DURATION_LIMITS.minSetup || setupMinutes > DURATION_LIMITS.maxSetup) timingIssues.push(`Setup time must be ${DURATION_LIMITS.minSetup} to ${DURATION_LIMITS.maxSetup} minutes.`);
  push("timing", "Time limits", timingIssues, `${taskMinutes} minute task, ${setupMinutes} minutes of untimed setup.`);

  const submitIssues: string[] = [];
  if (pkg.submission.requirements.length === 0) submitIssues.push("List what candidates must submit.");
  if (pkg.submission.handoffPrompts.length === 0) submitIssues.push("Add at least one handoff prompt.");
  push("submission", "Submission requirements", submitIssues, "Submission requirements and handoff prompts are set.");

  return checks;
}

/** Runs the starter, reference and incorrect solutions against the tests. */
export async function executionChecks(pkg: ScenarioPackage, prot: ProtectedMaterials, runner: Runner): Promise<CheckResult[]> {
  const env = pkg.environment.id;
  const publicFiles = pkg.publicTests.map((r) => r.file);
  const allTestFiles = [...new Set([...publicFiles, ...prot.protectedTestRefs.map((r) => r.file)])];
  const allRefs = [...pkg.publicTests, ...prot.protectedTestRefs];
  const targeted = allRefs.filter((r) => r.criterionIds.length > 0);
  const evaluation = overlay(pkg.starterFiles, prot.protectedTests);
  const referenceProject = overlay(evaluation, prot.reference.files);

  const requests = [
    { environment: env, files: pkg.starterFiles, testFiles: [...new Set(publicFiles)] },
    { environment: env, files: evaluation, testFiles: allTestFiles },
    { environment: env, files: referenceProject, testFiles: allTestFiles },
    { environment: env, files: referenceProject, testFiles: allTestFiles },
    ...prot.incorrectSolutions.map((s) => ({ environment: env, files: overlay(evaluation, s.files), testFiles: allTestFiles })),
  ];
  const runs = await runner.runSuites(requests);
  const [setupRun, baselineRun, referenceRun, repeatRun, ...incorrectRuns] = runs;
  const checks: CheckResult[] = [];

  const infra = runs.find((r) => r.kind === "infrastructure_error");
  if (infra && infra.kind === "infrastructure_error" && runs.every((r) => r.kind === "infrastructure_error")) {
    const detail = `The runner could not execute: ${infra.detail}`;
    for (const [id, label] of EXECUTION_CHECKS) checks.push({ id, label, kind: "execution", status: "not_run", detail, issues: [detail], evidence: [] });
    return checks;
  }

  {
    const issues: string[] = [];
    if (publicFiles.length === 0) issues.push("Add at least one public test so candidates can run the suite.");
    else if (setupRun.kind !== "ran") issues.push(setupRun.kind === "timeout" ? "The public tests timed out on the starter project." : `The starter project did not run: ${setupRun.detail}`);
    else {
      const failedImports = setupRun.tests.filter((t) => /_FailedTest|\.test\.(js|ts)$/.test(t.name) && t.outcome !== "passed");
      if (setupRun.tests.length === 0) issues.push("The public test command found no tests. Check the test file names and imports.");
      for (const t of failedImports) issues.push(`${t.name} could not load. The starter likely has a syntax or import error.`);
    }
    checks.push({
      id: "setup",
      label: "Environment setup and syntax",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length ? issues[0] : `The starter project loads and the public tests run in ${ENVIRONMENTS[env].label}.`,
      issues,
      evidence: [evidence("Public tests on the starter project", setupRun)],
    });
  }

  {
    const issues: string[] = [];
    const failing = targeted.filter((r) => { const o = outcomeFor(baselineRun, r); return o === "failed" || o === "error"; });
    const passing = targeted.filter((r) => outcomeFor(baselineRun, r) === "passed");
    if (baselineRun.kind === "timeout") issues.push("The starter project hangs under the tests. The defect should make tests fail quickly, for example by bounding loops.");
    else if (baselineRun.kind !== "ran") issues.push("The baseline run did not complete.");
    else if (failing.length === 0) {
      issues.push("No requirement test fails on the starter, so the task is already solved or the tests do not check the change.");
      if (passing.length) issues.push(`These tests pass on the starter as written: ${passing.slice(0, 6).map((r) => r.name).join("; ")}. The starter's behavior for those inputs is already correct.`);
    }
    checks.push({
      id: "baseline",
      label: "Starter shows the problem",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length
        ? issues[0]
        : `${failing.length} requirement test${failing.length === 1 ? "" : "s"} fail on the starter as expected${passing.length ? `; ${passing.length} already pass (they check preserved behavior)` : ""}.`,
      issues,
      evidence: [evidence("All tests on the starter project", baselineRun)],
    });
  }

  {
    const issues: string[] = [];
    if (prot.reference.files.length === 0) issues.push("Add a reference solution.");
    else if (referenceRun.kind !== "ran") issues.push(referenceRun.kind === "timeout" ? "The reference solution timed out." : "The reference run did not complete.");
    else {
      const bad = referenceRun.tests.filter((t) => t.outcome === "failed" || t.outcome === "error");
      for (const t of bad) issues.push(`${t.name} fails with the reference solution.`);
      if (referenceRun.tests.length === 0) issues.push("No tests ran against the reference solution.");
    }
    checks.push({
      id: "reference",
      label: "Reference solution passes",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length ? issues[0] : `All ${referenceRun.kind === "ran" ? referenceRun.tests.length : 0} tests pass with the reference solution.`,
      issues,
      evidence: [evidence("All tests with the reference solution", referenceRun)],
    });
  }

  {
    const issues: string[] = [];
    if (prot.incorrectSolutions.length < MIN_INCORRECT_SOLUTIONS) {
      issues.push(`Add at least ${MIN_INCORRECT_SOLUTIONS} plausible incorrect solutions that make different mistakes, so the tests are shown to catch real mistakes.`);
    }
    // A hang is a mistake the suite catches: a candidate submitting it would see the run time out.
    prot.incorrectSolutions.forEach((s, i) => {
      const run = incorrectRuns[i];
      if (!run || run.kind === "infrastructure_error") issues.push(`Incorrect solution "${s.description}" could not be run.`);
      else if (run.kind === "ran" && !run.tests.some((t) => t.outcome === "failed" || t.outcome === "error")) issues.push(`Incorrect solution "${s.description}" passes every test. The tests miss this mistake.`);
    });
    checks.push({
      id: "incorrect",
      label: "Tests catch incorrect solutions",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length ? issues[0] : `All ${prot.incorrectSolutions.length} incorrect solutions fail at least one test.`,
      issues,
      evidence: prot.incorrectSolutions.map((s, i) => evidence(`Incorrect solution: ${s.description}`, incorrectRuns[i] ?? { kind: "infrastructure_error", code: "missing", detail: "No run." })),
    });
  }

  {
    const issues: string[] = [];
    if (referenceRun.kind !== "ran" || repeatRun.kind !== "ran") issues.push("The repeat run did not complete.");
    else {
      for (const t of referenceRun.tests) {
        const again = repeatRun.tests.find((x) => x.name === t.name);
        if (!again || again.outcome !== t.outcome) issues.push(`${t.name} gave a different result on a second run. Remove timing, randomness or ordering dependence.`);
      }
    }
    checks.push({
      id: "repeatability",
      label: "Results repeat",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length ? issues[0] : "Two runs of the reference solution produced identical results.",
      issues,
      evidence: [evidence("Repeat run with the reference solution", repeatRun)],
    });
  }

  {
    const issues: string[] = [];
    for (const r of allRefs) if (outcomeFor(referenceRun, r) === "missing") issues.push(`Test ${r.name} is listed but was not found in the test output.`);
    if (referenceRun.kind === "ran") {
      for (const t of referenceRun.tests) {
        if (!allRefs.some((r) => matchesRef(t.name, r.name))) issues.push(`Test ${t.name} ran but is not mapped to an acceptance criterion. Map it or remove it.`);
      }
    }
    checks.push({
      id: "discovery",
      label: "Every test is listed and mapped",
      kind: "execution",
      status: issues.length ? "failed" : "passed",
      detail: issues.length ? issues[0] : `All ${allRefs.length} tests appear in the runner output and map to acceptance criteria.`,
      issues,
      evidence: [],
    });
  }

  return checks;
}

/** Every check a publishable record must contain; a record made before a check existed must be run again. */
export const REQUIRED_CHECK_IDS = [
  "setup",
  "baseline",
  "reference",
  "incorrect",
  "repeatability",
  "discovery",
  "protected_isolation",
  "leakage",
  "test_mapping",
  "disclosed_requirements",
  "instructions_files",
  "secrets",
  "rubric",
  "coworkers",
  "policy",
  "timing",
  "submission",
] as const;

export const EXECUTION_CHECKS: Array<[string, string]> = [
  ["setup", "Environment setup and syntax"],
  ["baseline", "Starter shows the problem"],
  ["reference", "Reference solution passes"],
  ["incorrect", "Tests catch incorrect solutions"],
  ["repeatability", "Results repeat"],
  ["discovery", "Every test is listed and mapped"],
];

export async function validatePackage(
  pkg: ScenarioPackage,
  prot: ProtectedMaterials,
  runner: Runner | null,
  runnerUnavailable: string | null,
): Promise<ValidationRecord> {
  const statics = staticChecks(pkg, prot);
  const exec: CheckResult[] = runner
    ? await executionChecks(pkg, prot, runner)
    : EXECUTION_CHECKS.map(([id, label]) => ({ id, label, kind: "execution" as const, status: "not_run" as const, detail: runnerUnavailable ?? "No runner.", issues: [runnerUnavailable ?? "No runner."], evidence: [] }));
  const checks = [...exec, ...statics];
  return {
    status: checks.every((c) => c.status === "passed") ? "passed" : "blocked",
    packageSha256: packageSha256(pkg, prot),
    runner: runner?.info ?? null,
    runnerUnavailable,
    sectionRevisions: sectionRevisions(pkg),
    checks,
    ranAt: new Date().toISOString(),
  };
}

/** Check ids whose inputs changed since the validation ran. */
export function staleChecks(record: ValidationRecord, current: Record<SectionKey, number>): string[] {
  return record.checks
    .filter((c) => (CHECK_DEPENDENCIES[c.id] ?? []).some((s) => record.sectionRevisions[s] !== current[s]))
    .map((c) => c.id);
}
