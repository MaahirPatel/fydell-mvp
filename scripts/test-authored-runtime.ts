/**
 * Employer-authored work-sample runtime: evaluation mapping and candidate
 * payload boundaries, against the local development runner. No network, no
 * database.
 *
 *   npm run test:authored-runtime
 */
import assert from "node:assert/strict";
import type { ProtectedMaterials, ScenarioPackage } from "../src/lib/eng/authoring/package";
import { localRunner } from "../src/lib/eng/authoring/runner";
import { buildAuthoredCandidatePayload } from "../src/lib/eng/authored/candidate-payload";
import { evaluationProject, mapEvaluation, publicTestProject, runAuthoredEvaluation, validateCandidateFiles } from "../src/lib/eng/authored/evaluate";
import type { AuthoredState } from "../src/lib/eng/authored/types";

const STARTER_SLUG = `export function slugify(text) {\n  return text;\n}\n`;
const REFERENCE_SLUG = `export function slugify(text) {\n  return text.trim().toLowerCase().replace(/\\s+/g, "-");\n}\n`;
const LOWER_ONLY_SLUG = `export function slugify(text) {\n  return text.toLowerCase();\n}\n`;

const PUBLIC_TEST = `import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";
test("lowercases input", () => { assert.equal(slugify("ABC"), "abc"); });
`;
const PROTECTED_MARKER = "PROTECTED_SECRET_7f3a";
const PROTECTED_TEST = `import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";
// ${PROTECTED_MARKER}
test("hidden replaces spaces with hyphens", () => { assert.equal(slugify("a b"), "a-b"); });
test("hidden trims surrounding whitespace", () => { assert.equal(slugify("  x  "), "x"); });
test("hidden lowercases mixed case", () => { assert.equal(slugify("MiXeD"), "mixed"); });
`;

const sections = Object.fromEntries(
  (["brief", "files", "tests", "criteria", "coworkers", "policy", "timing"] as const).map((s) => [s, { revision: 1, editedBy: "author" as const, updatedAt: "2026-10-01T00:00:00Z" }]),
) as ScenarioPackage["provenance"]["sections"];

const pkg: ScenarioPackage = {
  schema: 1,
  config: { family: "software_engineer", language: "javascript", capabilities: ["correctness", "reliability", "communication"] } as unknown as ScenarioPackage["config"],
  brief: {
    title: "Slug helper",
    summary: "Fix the slug helper.",
    context: "URLs are built from titles.",
    task: "Make slugify produce URL slugs.",
    outcomes: ["Slugs are lowercase and hyphenated"],
    constraints: ["Standard library only"],
    outOfScope: ["Unicode transliteration"],
    optionalExtensions: [],
    interface: "slugify(text: string): string in src/slug.js",
  },
  acceptanceCriteria: [
    { id: "AC1", text: "Slugs are lowercase", capability: "correctness" },
    { id: "AC2", text: "Spaces become hyphens", capability: "correctness" },
    { id: "AC3", text: "Surrounding whitespace is removed", capability: "reliability" },
  ],
  environment: { id: "node-stdlib", language: "javascript", setupCommands: [], testCommand: "node --test test/", setupMinutes: 5, taskMinutes: 30 },
  setupInstructions: ["Install Node.js 22 or later."],
  starterFiles: [
    { path: "package.json", content: `{ "type": "module" }\n` },
    { path: "src/slug.js", content: STARTER_SLUG },
    { path: "test/public.test.js", content: PUBLIC_TEST },
  ],
  publicTests: [{ name: "lowercases input", file: "test/public.test.js", criterionIds: ["AC1"] }],
  fixturePaths: [],
  rubric: [
    {
      id: "R1",
      capability: "correctness",
      label: "Correct slugs",
      whyItMatters: "Broken URLs.",
      observableEvidence: "Tests for AC1 and AC2.",
      anchors: { concern_observed: "Fails", partially_demonstrated: "Some", demonstrated: "All" },
      insufficientEvidence: "Tests did not run.",
      limitations: "Only ASCII input is tested.",
      candidateExplanation: "Whether slugs are lowercase and hyphenated.",
      acceptanceCriterionIds: ["AC1", "AC2"],
      judgedBy: "tests",
    },
    {
      id: "R2",
      capability: "reliability",
      label: "Whitespace handling",
      whyItMatters: "Stray spaces.",
      observableEvidence: "Test for AC3.",
      anchors: { concern_observed: "Fails", partially_demonstrated: "Some", demonstrated: "All" },
      insufficientEvidence: "Tests did not run.",
      limitations: "Tabs are not tested.",
      candidateExplanation: "Whether surrounding whitespace is removed.",
      acceptanceCriterionIds: ["AC3"],
      judgedBy: "tests",
    },
    {
      id: "R3",
      capability: "communication",
      label: "Handoff",
      whyItMatters: "Reviewers need context.",
      observableEvidence: "The handoff.",
      anchors: { concern_observed: "Missing", partially_demonstrated: "Thin", demonstrated: "Clear" },
      insufficientEvidence: "No handoff.",
      limitations: "Judged by a person.",
      candidateExplanation: "Whether your handoff explains the change.",
      acceptanceCriterionIds: [],
      judgedBy: "reviewer",
    },
  ],
  coworkers: [{ id: "c1", name: "Dana Ortiz", title: "Staff engineer", responsibilities: "Owns routing", topics: ["routing-internal-topic"], tone: "terse-tone-marker", boundaries: "Will not write code" }],
  aiPolicy: { id: "assistants_disclosed", candidateText: "Disclose assistant use." },
  submission: { requirements: ["The fixed src/slug.js"], handoffPrompts: [{ id: "what", label: "What changed", help: "Summarize" }] },
  accommodations: ["Extra time on request"],
  interruptionPolicy: "The timer keeps running.",
  feedbackPolicy: "You see which criteria the tests confirmed.",
  provenance: { path: "template", model: "generator-model-marker", generatedAt: null, sections },
};

const prot: ProtectedMaterials = {
  protectedTests: [{ path: "test/protected.test.js", content: PROTECTED_TEST }],
  protectedTestRefs: [
    { name: "hidden replaces spaces with hyphens", file: "test/protected.test.js", criterionIds: ["AC2"] },
    { name: "hidden trims surrounding whitespace", file: "test/protected.test.js", criterionIds: ["AC3"] },
    { name: "hidden lowercases mixed case", file: "test/protected.test.js", criterionIds: ["AC1"] },
  ],
  reference: { files: [{ path: "src/slug.js", content: REFERENCE_SLUG }], approaches: ["REFERENCE_APPROACH_MARKER"] },
  incorrectSolutions: [{ id: "i1", description: "INCORRECT_DESCRIPTION_MARKER", files: [{ path: "src/slug.js", content: LOWER_ONLY_SLUG }] }],
  coworkerFacts: { c1: [{ id: "f1", text: "COWORKER_FACT_MARKER" }] },
  rubricNotes: { R1: "RUBRIC_NOTE_MARKER" },
};

let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

function states(e: { criteria: { id: string; state: AuthoredState }[] }): Record<string, AuthoredState> {
  return Object.fromEntries(e.criteria.map((c) => [c.id, c.state]));
}

async function evaluate(files: { path: string; content: string }[]) {
  const outcome = await runAuthoredEvaluation(localRunner(), pkg, prot, files);
  assert.equal(outcome.kind, "evaluated", outcome.kind === "infrastructure_error" ? `${outcome.code}: ${outcome.detail}` : "");
  if (outcome.kind !== "evaluated") throw new Error("not evaluated");
  return outcome.evaluation;
}

async function main() {
  console.log("authored runtime");

  await check("candidate payload contains no protected material or private package fields", () => {
    const payload = JSON.stringify(buildAuthoredCandidatePayload(pkg, { publicTestCommand: "node --test test/public.test.js" }));
    for (const marker of [
      PROTECTED_MARKER,
      "hidden replaces spaces",
      "hidden trims",
      "hidden lowercases",
      "test/protected.test.js",
      REFERENCE_SLUG,
      "REFERENCE_APPROACH_MARKER",
      "INCORRECT_DESCRIPTION_MARKER",
      "COWORKER_FACT_MARKER",
      "RUBRIC_NOTE_MARKER",
      "generator-model-marker",
      "terse-tone-marker",
      "routing-internal-topic",
    ]) {
      assert.ok(!payload.includes(marker), `candidate payload leaked ${marker}`);
    }
    assert.ok(payload.includes("lowercases input"), "public test names are shown");
    assert.ok(payload.includes("Dana Ortiz"), "coworker names are shown");
  });

  await check("public project runs only public tests and restores published test files", () => {
    const project = publicTestProject(pkg, [{ path: "test/public.test.js", content: "tampered" }, { path: "src/slug.js", content: REFERENCE_SLUG }]);
    assert.deepEqual(project.testFiles, ["test/public.test.js"]);
    assert.equal(project.files.find((f) => f.path === "test/public.test.js")?.content, PUBLIC_TEST);
    assert.ok(!project.files.some((f) => f.path === "test/protected.test.js"));
  });

  await check("evaluation project overlays protected tests last", () => {
    const project = evaluationProject(pkg, prot, [{ path: "test/protected.test.js", content: "export {};" }]);
    assert.equal(project.files.find((f) => f.path === "test/protected.test.js")?.content, PROTECTED_TEST);
    assert.deepEqual(project.testFiles.sort(), ["test/protected.test.js", "test/public.test.js"]);
  });

  await check("candidate file validation refuses unsafe and reserved names", () => {
    assert.equal(validateCandidateFiles(pkg, [{ path: "../escape.js", content: "" }]).ok, false);
    assert.equal(validateCandidateFiles(pkg, [{ path: "sitecustomize.py", content: "" }]).ok, false);
    assert.equal(validateCandidateFiles(pkg, [{ path: "node_modules/x/index.js", content: "" }]).ok, false);
    assert.equal(validateCandidateFiles(pkg, "nope").ok, false);
    assert.equal(validateCandidateFiles(pkg, pkg.starterFiles).ok, true);
  });

  await check("reference solution: every test-judged criterion demonstrated, reviewer criterion not assessed", async () => {
    const e = await evaluate(overlayFiles(REFERENCE_SLUG));
    assert.equal(e.suite.outcome, "ran");
    assert.ok(e.tests.every((t) => t.outcome === "passed"), JSON.stringify(e.tests));
    assert.deepEqual(states(e), { R1: "demonstrated", R2: "demonstrated", R3: "not_assessed" });
    assert.ok(e.acceptance.every((a) => a.state === "confirmed"));
    assert.equal(e.runner.isolated, false);
    assert.ok(e.limitations.some((l) => l.includes("not an isolated environment")));
    assert.match(e.criteria.find((c) => c.id === "R3")?.rationale ?? "", /awaiting reviewer/);
  });

  await check("incorrect solution: concern observed where every linked requirement fails", async () => {
    const e = await evaluate(overlayFiles(LOWER_ONLY_SLUG));
    const s = states(e);
    assert.equal(s.R2, "concern_observed");
    assert.equal(s.R1, "partially_demonstrated");
    assert.equal(s.R3, "not_assessed");
  });

  await check("unchanged starter: concern observed on every test-judged criterion", async () => {
    const e = await evaluate(overlayFiles(STARTER_SLUG));
    assert.deepEqual(states(e), { R1: "concern_observed", R2: "concern_observed", R3: "not_assessed" });
  });

  await check("a candidate cannot pass by replacing the tests", async () => {
    const e = await evaluate([
      ...overlayFiles(STARTER_SLUG),
      { path: "test/public.test.js", content: `import { test } from "node:test"; test("lowercases input", () => {});\n` },
      { path: "test/protected.test.js", content: `import { test } from "node:test"; test("hidden trims surrounding whitespace", () => {});\n` },
    ]);
    assert.equal(states(e).R2, "concern_observed");
  });

  await check("starter test helpers are restored before public and evaluation runs", () => {
    const withHelper: ScenarioPackage = { ...pkg, starterFiles: [...pkg.starterFiles, { path: "test/helpers.js", content: "export const ORIGINAL = 1;\n" }] };
    const candidate = [
      ...withHelper.starterFiles.map((f) => (f.path === "test/helpers.js" ? { ...f, content: "export const ORIGINAL = 2;\n" } : f)),
      { path: "test/my.test.js", content: "// candidate test\n" },
      { path: "src/extra.js", content: "export const x = 1;\n" },
    ];
    for (const project of [publicTestProject(withHelper, candidate), evaluationProject(withHelper, prot, candidate)]) {
      const byPath = new Map(project.files.map((f) => [f.path, f.content]));
      assert.equal(byPath.get("test/helpers.js"), "export const ORIGINAL = 1;\n");
      assert.equal(byPath.get("test/my.test.js"), "// candidate test\n");
      assert.equal(byPath.get("src/extra.js"), "export const x = 1;\n");
    }
  });

  await check("timeout: insufficient evidence, never a pass or fail", () => {
    const e = mapEvaluation(pkg, prot, { kind: "timeout", command: "node --test", durationMs: 60000, output: "" }, localRunner().info);
    assert.deepEqual(states(e), { R1: "insufficient_evidence", R2: "insufficient_evidence", R3: "not_assessed" });
    assert.ok(e.acceptance.every((a) => a.state === "no_result"));
    assert.ok(e.probeResults.every((p) => p.outcome === "timeout"));
  });

  await check("missing results without failures: insufficient evidence", () => {
    const e = mapEvaluation(pkg, prot, { kind: "ran", command: "node --test", exitCode: 0, durationMs: 10, output: "", tests: [{ name: "lowercases input", outcome: "passed" }] }, localRunner().info);
    assert.equal(states(e).R1, "insufficient_evidence");
    assert.equal(e.acceptance.find((a) => a.id === "AC1")?.state, "no_result");
  });

  console.log(`\n${passed} checks passed`);
}

function overlayFiles(slug: string) {
  return pkg.starterFiles.map((f) => (f.path === "src/slug.js" ? { path: f.path, content: slug } : f));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
