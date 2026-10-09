/**
 * Simulation creator core: registry rules (including "Other"), output
 * parsers, static and execution checks on the local runner, stale tracking,
 * test reconciliation and the candidate/evaluator split. No model calls and
 * no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-authoring.ts
 */
import assert from "node:assert/strict";
import { DEFAULT_INPUT, parseInput, validateConfig, type AuthoringInput } from "../src/lib/eng/authoring/registry";
import { parseTap, parseUnittest, localRunner } from "../src/lib/eng/authoring/runner";
import { staleChecks, staticChecks, validatePackage } from "../src/lib/eng/authoring/checks";
import { assemble, buildRubric, dropMismatchedClosers, normalizeBrief, reconcileRefs, stagesFromPackage, stripHintComments, type BriefStage, type TestsStage } from "../src/lib/eng/authoring/generate";
import { bumpSections, packageSha256, sectionRevisions } from "../src/lib/eng/authoring/package";

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const DESCRIPTION =
  "The ledger import drops the final transaction when the batch size divides the total exactly. Every transaction must be imported exactly once and the importer must stop on an empty page.";

function input(over: Partial<AuthoringInput>): AuthoringInput {
  return { ...DEFAULT_INPUT, description: DESCRIPTION, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data"], ...over };
}

function validate(over: Partial<AuthoringInput>) {
  const { input: parsed, invalid } = parseInput(input(over));
  return validateConfig(parsed, invalid);
}

async function main() {
  await test("a complete supported configuration resolves", () => {
    const v = validate({});
    assert.equal(v.ok, true, JSON.stringify(v));
    assert.equal(v.resolved?.language, "python");
    assert.equal(v.environment, "python-stdlib");
  });

  const EXEMPLARS = [
    { key: "webhook-dedupe", track: "backend_api" as const, taskFamily: "backend.reliability", language: "python" as const },
    { key: "job-lease-recovery", track: "backend_api" as const, taskFamily: "backend.jobs", language: "javascript" as const },
  ];
  const sim = (over: Partial<NonNullable<AuthoringInput["simulation"]>> = {}): AuthoringInput["simulation"] => ({
    track: "backend_api",
    taskFamily: "backend.reliability",
    exemplarKey: "webhook-dedupe",
    mode: "adapt",
    jobTitle: "Founding engineer",
    businessContext: "A grocery delivery marketplace whose courier app retries order status updates over flaky mobile networks.",
    secondaryCapability: "Mobile client constraints",
    ...over,
  });
  const validateSim = (over: Partial<AuthoringInput>) => {
    const { input: parsed, invalid } = parseInput(input(over));
    return validateConfig(parsed, invalid, EXEMPLARS);
  };

  await test("a track simulation derives the stored family and keeps job title, level and language separate", () => {
    const v = validateSim({ simulation: sim(), family: "software_engineer", specialization: "frontend" });
    assert.equal(v.ok, true, JSON.stringify([v.errors, v.conflicts, v.clarifications, v.assumptions]));
    assert.equal(v.resolved?.family, "backend_api_engineer");
    assert.equal(v.resolved?.specialization, "general");
    assert.equal(v.resolved?.simulation?.jobTitle, "Founding engineer");
    assert.equal(v.resolved?.startingMaterial, "generated");
    assert.ok(v.summary.some((s) => s.label === "Primary track" && s.value === "Backend & API"));
  });

  await test("unvalidated or mismatched role models and unvalidated languages are rejected", () => {
    assert.ok(validateSim({ simulation: sim({ exemplarKey: "made-up" }) }).errors.some((e) => e.field === "simulation"));
    assert.ok(validateSim({ simulation: sim({ taskFamily: "backend.jobs" }) }).errors.some((e) => /does not belong/.test(e.message)));
    const lang = validateSim({ simulation: sim(), language: "javascript" });
    assert.ok(lang.errors.some((e) => e.field === "language"), JSON.stringify(lang.errors));
    const track = parseInput(input({ simulation: { ...sim()!, track: "general" as never } }));
    assert.ok(track.invalid.some((e) => e.field === "simulation"));
  });

  await test("running a role model as is needs no description and becomes a reviewed template", () => {
    const v = validateSim({ simulation: sim({ mode: "as_is", businessContext: "" }), description: "" });
    assert.equal(v.ok, true, JSON.stringify([v.errors, v.conflicts, v.clarifications]));
    assert.equal(v.resolved?.startingMaterial, "reviewed_template");
    const noContext = validateSim({ simulation: sim({ businessContext: "" }) });
    assert.ok(noContext.errors.some((e) => /business context/.test(e.message)));
  });

  await test("a reviewed template without a role model is rejected", () => {
    assert.ok(validate({ startingMaterial: "reviewed_template" }).errors.some((e) => e.field === "startingMaterial"));
  });

  await test("unsupported language via Other is rejected with the reason and an alternative", () => {
    const v = validate({ language: "other", other: { language: "Golang" } });
    assert.equal(v.ok, false);
    const e = v.errors.find((x) => x.field === "language");
    assert.ok(e && /Go toolchain/.test(e.message), JSON.stringify(v.errors));
    assert.equal(e?.alternative, "python");
    assert.equal(v.resolved, null);
  });

  await test("Other language that names a supported one maps to it", () => {
    const v = validate({ language: "other", other: { language: "Node.js" }, framework: "none" });
    assert.equal(v.resolved?.language, "javascript", JSON.stringify(v.errors));
  });

  await test("unknown Other framework becomes an assumption, not a silent install", () => {
    const v = validate({ framework: "other", other: { framework: "Bottle-style routing" } });
    assert.ok(v.assumptions.some((a) => a.id === "framework_other"));
    assert.equal(v.ok, false, "needs confirmation first");
    const confirmed = validate({ framework: "other", other: { framework: "Bottle-style routing" }, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data", "framework_other"] });
    assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
    assert.equal(confirmed.resolved?.custom.frameworkStyle, "Bottle-style routing");
  });

  await test("known unsupported framework via Other is rejected", () => {
    const v = validate({ framework: "other", other: { framework: "FastAPI" } });
    assert.ok(v.errors.some((e) => e.field === "framework" && /package installation/.test(e.message)));
  });

  await test("Other database is modeled in memory with an assumption; Postgres is rejected", () => {
    const v = validate({ database: "other", other: { database: "TigerBeetle" }, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data", "database_other"] });
    assert.equal(v.resolved?.database, "in-memory");
    const pg = validate({ database: "other", other: { database: "postgres" } });
    assert.ok(pg.errors.some((e) => e.field === "database" && e.alternative === "sqlite"));
  });

  await test("Other capabilities become reviewer-judged rubric criteria", () => {
    const v = validate({ capabilities: ["correctness", "other"], other: { capabilities: "Incident write-up quality" }, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data", "capabilities_other"] });
    assert.equal(v.ok, true, JSON.stringify(v));
    const rubric = buildRubric(v.resolved!, [{ id: "AC-1", text: "x", capability: "correctness" }]);
    const custom = rubric.find((r) => r.label === "Incident write-up quality");
    assert.equal(custom?.judgedBy, "reviewer");
  });

  await test("Other technologies: packages conflict, concepts are carried into the brief", () => {
    const v = validate({ technologies: ["other"], other: { technologies: "pandas, circuit breakers" } });
    assert.ok(v.conflicts.some((c) => /pandas/.test(c.message)));
    const ok = validate({ technologies: ["other"], other: { technologies: "circuit breakers" }, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data", "technologies_other"] });
    assert.deepEqual(ok.resolved?.custom.extraTechnologies, ["circuit breakers"]);
  });

  await test("Other with no text asks what it is", () => {
    const v = validate({ taskType: "other", other: {} });
    assert.ok(v.errors.some((e) => e.field === "taskType" && /Other/.test(e.message)));
  });

  await test("Other task type maps to the closest executable type", () => {
    const v = validate({ taskType: "other", other: { taskType: "Investigate a production incident" }, confirmedAssumptions: ["keep_interface", "no_new_infra", "synthetic_data", "task_type_other"] });
    assert.equal(v.resolved?.taskType, "debugging");
  });

  await test("ordinary words are not mistaken for languages", () => {
    const v = validate({ description: `${DESCRIPTION} We want to go through the swift path and avoid rust in the pipes; each tree node has a child.` });
    assert.equal(v.conflicts.filter((c) => c.field === "language").length, 0, JSON.stringify(v.conflicts));
  });

  await test("live model or cloud requirements are conflicts", () => {
    assert.ok(validate({ description: `${DESCRIPTION} Call the OpenAI API to classify each row.` }).conflicts.length > 0);
    assert.ok(validate({ description: `${DESCRIPTION} Deploy it with Kubernetes.` }).conflicts.length > 0);
  });

  await test("only reviewer-judged capabilities cannot be validated", () => {
    const v = validate({ capabilities: ["maintainability", "communication"] });
    assert.ok(v.errors.some((e) => e.field === "capabilities"));
  });

  await test("testing and code review task types are refused with alternatives", () => {
    for (const t of ["testing", "code_review"] as const) {
      const v = validate({ taskType: t });
      assert.ok(v.errors.some((e) => e.field === "taskType" && e.alternative === "debugging"));
    }
  });

  await test("duration limits and setup separation", () => {
    assert.ok(validate({ taskMinutes: 10 }).errors.some((e) => e.field === "taskMinutes"));
    assert.ok(validate({ setupMinutes: 60 }).errors.some((e) => e.field === "setupMinutes"));
  });

  await test("unittest parser handles docstrings and failures", () => {
    const out = "test_a (tests.t.T.test_a) ... ok\ntest_b (tests.t.T.test_b)\nDoc line ... FAIL\ntest_c (tests.t.T.test_c) ... ERROR\ntest_d (tests.t.T.test_d) ... skipped 'x'\n";
    assert.deepEqual(parseUnittest(out), [
      { name: "T.test_a", outcome: "passed" },
      { name: "T.test_b", outcome: "failed" },
      { name: "T.test_c", outcome: "error" },
      { name: "T.test_d", outcome: "skipped" },
    ]);
  });

  await test("TAP parser keeps leaves and drops suite wrappers", () => {
    const out = "TAP version 13\n# Subtest: suite\n    ok 1 - inner ok\n    not ok 2 - inner bad\nnot ok 1 - suite\nok 2 - top\nok 3 - skipped one # SKIP reason\n";
    assert.deepEqual(parseTap(out), [
      { name: "inner ok", outcome: "passed" },
      { name: "inner bad", outcome: "failed" },
      { name: "top", outcome: "passed" },
      { name: "skipped one", outcome: "skipped" },
    ]);
  });

  await test("starter comments that point at the defect are removed", () => {
    const [f] = stripHintComments([{ path: "src/a.js", content: "let x = 1;\n// incorrect: stops early on exact multiples\n// Reads the next page\nif (a) break;\n    # TODO fix the off-by-one\n" }]);
    assert.equal(f.content, "let x = 1;\n// Reads the next page\nif (a) break;\n");
  });

  await test("a stray closing bracket after a long string value is dropped, strings are untouched", () => {
    const broken = `{"publicTests":{"content":"x = rows[0]\\nassert ok\\n\\"]\\n"],"tests":[{"name":"T.test_a","criterionIds":["AC-1"]}]}}`;
    const repaired = dropMismatchedClosers(broken);
    assert.ok(repaired);
    const parsed = JSON.parse(repaired) as { publicTests: { content: string; tests: Array<{ name: string }> } };
    assert.equal(parsed.publicTests.content, 'x = rows[0]\nassert ok\n"]\n');
    assert.equal(parsed.publicTests.tests[0].name, "T.test_a");
    assert.equal(dropMismatchedClosers(`{"a":["]"],"b":{"c":"}"}}`), null);
    const early = dropMismatchedClosers(`{"a":{"tests":[1]}}},"b":[2]}`);
    assert.deepEqual(JSON.parse(early ?? ""), { a: { tests: [1] }, b: [2] });
  });

  await test("normalizeBrief moves reviewer-judged criteria to outcomes and renumbers", () => {
    const b = normalizeBrief({
      title: "T", summary: "summary text", context: "context text long enough", task: "task text long enough", outcomes: ["o1"], constraints: [], outOfScope: [], optionalExtensions: [], interfaceSpec: "app/x.py: f()",
      acceptanceCriteria: [
        { id: "AC-1", text: "Adds a regression test", capability: "testing" },
        { id: "AC-2", text: "Imports every row once", capability: "correctness" },
      ],
      coworkers: [],
    });
    assert.deepEqual(b.acceptanceCriteria, [{ id: "AC-1", text: "Imports every row once", capability: "correctness" }]);
    assert.ok(b.outcomes.includes("Adds a regression test"));
  });

  // A small hand-written package exercised on the real local runner.
  const resolved = validate({}).resolved!;
  const brief: BriefStage = {
    title: "Fix the last-page import bug",
    summary: "The importer drops the last page.",
    context: "A nightly job imports ledger rows in pages from an in-memory source.",
    task: "Fix import_all in app/importer.py so every row is imported exactly once.",
    outcomes: ["Every row imported once"],
    constraints: [],
    outOfScope: [],
    optionalExtensions: [],
    interfaceSpec: "app/importer.py: import_all(fetch_page, page_size) -> list",
    acceptanceCriteria: [
      { id: "AC-1", text: "All rows are imported when the total is an exact multiple of the page size.", capability: "correctness" },
      { id: "AC-2", text: "Importing stops at the first empty page.", capability: "reliability" },
    ],
    coworkers: [{ name: "Sam Rivera", title: "Data lead", responsibilities: "Owns the import job.", topics: ["paging"], tone: "brief", boundaries: "Will not pick the fix for you.", facts: ["Pages are 0-indexed."] }],
  };
  const starter = `def import_all(fetch_page, page_size):\n    rows = []\n    page = 0\n    while page < 1000:\n        batch = fetch_page(page, page_size)\n        if len(batch) < page_size:\n            break\n        rows.extend(batch)\n        page += 1\n    return rows\n`;
  const reference = `def import_all(fetch_page, page_size):\n    rows = []\n    page = 0\n    while page < 1000:\n        batch = fetch_page(page, page_size)\n        if not batch:\n            break\n        rows.extend(batch)\n        page += 1\n    return rows\n`;
  const wrongInfinite = `def import_all(fetch_page, page_size):\n    rows = []\n    page = 0\n    while page < 1000:\n        batch = fetch_page(page, page_size)\n        rows.extend(batch)\n        page += 1\n    return rows\n`;
  const helper = `def source(total):\n    data = list(range(total))\n    calls = []\n    def fetch(page, size):\n        calls.append(page)\n        return data[page * size:(page + 1) * size]\n    return fetch, calls\n`;
  const publicTest = `import unittest\nfrom app.importer import import_all\nfrom tests.helpers import source\n\nclass PublicTests(unittest.TestCase):\n    def test_partial_last_page(self):\n        fetch, _ = source(7)\n        self.assertEqual(import_all(fetch, 3), list(range(7)))\n`;
  const evalTest = `import unittest\nfrom app.importer import import_all\nfrom tests.helpers import source\n\nclass EvaluationTests(unittest.TestCase):\n    def test_exact_multiple(self):\n        fetch, _ = source(6)\n        self.assertEqual(import_all(fetch, 3), list(range(6)))\n\n    def test_stops_on_empty_page(self):\n        fetch, calls = source(6)\n        import_all(fetch, 3)\n        self.assertEqual(calls, [0, 1, 2])\n`;
  const tests: TestsStage = {
    publicTests: { file: { path: "tests/test_public.py", content: publicTest }, tests: [{ name: "PublicTests.test_partial_last_page", criterionIds: ["AC-1"] }] },
    evaluationTests: {
      file: { path: "tests/test_evaluation.py", content: evalTest },
      tests: [
        { name: "EvaluationTests.test_exact_multiple", criterionIds: ["AC-1"] },
        { name: "EvaluationTests.test_stops_on_empty_page", criterionIds: ["AC-2"] },
        { name: "EvaluationTests.test_phantom", criterionIds: ["AC-2"] },
      ],
    },
    incorrectSolutions: [
      { description: "Never stops on an empty page", files: [{ path: "app/importer.py", content: wrongInfinite }] },
      { description: "Starts from the second page", files: [{ path: "app/importer.py", content: reference.replace("page = 0", "page = 1") }] },
    ],
  };
  const code = { starterFiles: [{ path: "app/importer.py", content: starter }, { path: "tests/helpers.py", content: helper }], referenceFiles: [{ path: "app/importer.py", content: reference }], approaches: ["Stop on an empty batch instead of a short batch."] };

  let { pkg, prot } = assemble(resolved, brief, code, tests, null, "uploaded");

  await test("candidate package never contains evaluator material", () => {
    const text = JSON.stringify(pkg);
    assert.ok(!text.includes("EvaluationTests"), "evaluation tests leaked");
    assert.ok(!text.includes("if not batch"), "reference solution leaked");
    assert.ok(!text.includes("Pages are 0-indexed"), "coworker fact leaked");
    assert.ok(pkg.starterFiles.some((f) => f.path === "app/__init__.py"), "package marker added");
  });

  await test("static checks catch phantom-free mapping problems", () => {
    const statics = staticChecks(pkg, prot);
    assert.equal(statics.find((c) => c.id === "test_mapping")?.status, "passed");
    const leaked = staticChecks({ ...pkg, starterFiles: [...pkg.starterFiles, prot.protectedTests[0]] }, prot);
    assert.equal(leaked.find((c) => c.id === "protected_isolation")?.status, "failed");
    const secret = staticChecks({ ...pkg, starterFiles: [...pkg.starterFiles, { path: "app/config.py", content: 'KEY = "AKIAABCDEFGHIJKLMNOP"' }] }, prot);
    assert.equal(secret.find((c) => c.id === "secrets")?.status, "failed");
    const undisclosed = staticChecks(pkg, { ...prot, protectedTestRefs: [{ name: "X.test", file: "tests/test_evaluation.py", criterionIds: ["AC-9"] }] });
    assert.equal(undisclosed.find((c) => c.id === "disclosed_requirements")?.status, "failed");
  });

  await test("execution checks run for real and report the phantom test", async () => {
    const rec = await validatePackage(pkg, prot, localRunner(), null);
    const by = Object.fromEntries(rec.checks.map((c) => [c.id, c]));
    assert.equal(by.setup.status, "passed", by.setup.detail);
    assert.equal(by.baseline.status, "passed", by.baseline.detail);
    assert.equal(by.reference.status, "passed", by.reference.detail);
    assert.equal(by.incorrect.status, "passed", by.incorrect.detail);
    assert.equal(by.repeatability.status, "passed", by.repeatability.detail);
    assert.equal(by.discovery.status, "failed", "phantom test must be reported");
    assert.ok(by.reference.evidence[0].command.includes("unittest"));
    assert.equal(rec.runner?.isolated, false);

    const discovered = by.reference.evidence[0].tests;
    const rc = reconcileRefs(tests, discovered);
    assert.deepEqual(rc.dropped, ["EvaluationTests.test_phantom"]);
    ({ pkg, prot } = assemble(resolved, brief, code, rc.tests, null, "uploaded"));
    const again = await validatePackage(pkg, prot, localRunner(), null);
    assert.equal(again.status, "passed", JSON.stringify(again.checks.filter((c) => c.status !== "passed").map((c) => c.issues)));
  });

  await test("an incorrect solution that passes every test is caught", async () => {
    const lenient = { ...prot, incorrectSolutions: [{ id: "w", description: "Same as reference", files: prot.reference.files }] };
    const rec = await validatePackage(pkg, lenient, localRunner(), null);
    assert.equal(rec.checks.find((c) => c.id === "incorrect")?.status, "failed");
  });

  await test("no runner means execution checks are not run, never passed", async () => {
    const rec = await validatePackage(pkg, prot, null, "Isolated execution is not configured.");
    assert.equal(rec.status, "blocked");
    assert.ok(rec.checks.filter((c) => c.kind === "execution").every((c) => c.status === "not_run"));
  });

  await test("editing a section marks only dependent checks stale and changes the hash", async () => {
    const rec = await validatePackage(pkg, prot, null, "none");
    const edited = bumpSections(pkg, ["coworkers"], "author");
    const stale = staleChecks(rec, sectionRevisions(edited));
    assert.deepEqual([...stale].sort(), ["coworkers", "leakage"]);
    const changed = { ...edited, coworkers: [] };
    assert.notEqual(packageSha256(changed, prot), packageSha256(pkg, prot));
  });

  await test("stagesFromPackage round-trips a draft for scoped regeneration", () => {
    const s = stagesFromPackage(pkg, prot);
    assert.equal(s.brief.interfaceSpec, brief.interfaceSpec);
    assert.ok(!s.code.starterFiles.some((f) => f.path === "tests/test_public.py"));
    assert.equal(s.tests.evaluationTests.tests.length, 2);
    assert.deepEqual(s.brief.coworkers[0].facts, ["Pages are 0-indexed."]);
  });

  await test("node environment: TypeScript starter runs under type stripping", async () => {
    const ts = validate({ language: "typescript", framework: "none" }).resolved!;
    const tsBrief: BriefStage = { ...brief, interfaceSpec: "src/sum.ts: sum(xs: number[]): number", acceptanceCriteria: [{ id: "AC-1", text: "Sums all numbers.", capability: "correctness" }] };
    const tsTests: TestsStage = {
      publicTests: { file: { path: "test/public.test.ts", content: `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { sum } from "../src/sum.ts";\ntest("sums two", () => assert.equal(sum([1, 2]), 3));\n` }, tests: [{ name: "sums two", criterionIds: ["AC-1"] }] },
      evaluationTests: { file: { path: "test/evaluation.test.ts", content: `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { sum } from "../src/sum.ts";\ntest("sums empty", () => assert.equal(sum([]), 0));\ntest("sums many", () => assert.equal(sum([1, 2, 3, 4]), 10));\n` }, tests: [{ name: "sums empty", criterionIds: ["AC-1"] }, { name: "sums many", criterionIds: ["AC-1"] }] },
      incorrectSolutions: [
        { description: "Skips the last item", files: [{ path: "src/sum.ts", content: "export function sum(xs: number[]): number { let t = 0; for (let i = 0; i < xs.length - 1; i++) t += xs[i]; return t; }\n" }] },
        { description: "Counts the first item twice", files: [{ path: "src/sum.ts", content: "export function sum(xs: number[]): number { return xs.reduce((a: number, b: number) => a + b, xs[0] ?? 0); }\n" }] },
      ],
    };
    const tsCode = { starterFiles: [{ path: "src/sum.ts", content: "export function sum(xs: number[]): number { return xs.length ? xs[0] : 0; }\n" }], referenceFiles: [{ path: "src/sum.ts", content: "export function sum(xs: number[]): number { return xs.reduce((a: number, b: number) => a + b, 0); }\n" }], approaches: ["reduce"] };
    const built = assemble(ts, { ...tsBrief, coworkers: [] }, tsCode, tsTests, null, "uploaded");
    assert.ok(built.pkg.starterFiles.some((f) => f.path === "package.json"));
    const rec = await validatePackage(built.pkg, built.prot, localRunner(), null);
    const failing = rec.checks.filter((c) => c.kind === "execution" && c.status !== "passed");
    assert.equal(failing.length, 0, JSON.stringify(failing.map((c) => [c.id, c.issues, c.evidence[0]?.output.slice(0, 400)])));
  });

  console.log(`\n${passed} authoring tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
