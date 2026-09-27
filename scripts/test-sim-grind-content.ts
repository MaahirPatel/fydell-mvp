/**
 * test-sim-grind-content — WORK-01/02/07/08/09, SCEN-01/02/03/04/09, plus the
 * candidate-visible/hidden content boundary (answer-key leak audit).
 *
 * Run: npx tsx --require ./scripts/sim-test/preload.cjs scripts/test-sim-grind-content.ts
 */
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Harness, finish } from "./sim-test/helpers";
import {
  buildScenarioPackage,
  scenarioIdForTemplateSlug,
  sha256Hex,
} from "@/lib/simulations/scenario-package";
import {
  toCandidateView,
  toMicroCandidateView,
  toCatalogCard,
} from "@/lib/simulations/candidate-view";
import { toV2CandidateView } from "@/lib/simulations/v2/candidate-view";
import { microToV2 } from "@/lib/simulations/v2/from-micro";
import { ALL_SIMULATIONS } from "@/lib/simulations/content/index";
import { validateEvidenceCoverage, validateCorrectnessBacking } from "@/lib/simulations/evidence-map";
import {
  scanForCultureFitLanguage,
  validateDimensionCoverage,
} from "@/lib/simulations/content-guards";
import {
  attemptFormKey,
  checkComparable,
  groupAttemptsByForm,
  validateNoSilentPersonalization,
} from "@/lib/simulations/comparability";
import {
  assertPublishedImmutable,
  forbidPublishedEdit,
  hashContent,
  nextVersion,
  REFERENCE_ANSWER_FIELDS,
} from "@/lib/simulations/content-version";
import {
  deriveProcessObservations,
  validateObservationModesty,
} from "@/lib/simulations/process-observations";

const t = new Harness("test-sim-grind-content");
const ROOT = process.cwd();
const RELAY = join(ROOT, "scenarios", "project-relay");

// ---------------------------------------------------------------------------
// SCEN-01 / WORK-01: runnable scenario ships with versioned runner + fixtures
// ---------------------------------------------------------------------------
const pkg = buildScenarioPackage("project-relay", ROOT);
t.eq(pkg.scenarioId, "project-relay", "package builds for project-relay");
t.eq(pkg.scenarioVersion, "2.0.1", "package pins the current version");
t.eq(pkg.testCommand, ["pytest", "tests/test_reconcile.py"], "canonical test command present");
t.ok(Object.keys(pkg.files).length >= 10, `package has ${Object.keys(pkg.files).length} files`);
for (const [rel, content] of Object.entries(pkg.files)) {
  t.eq(pkg.manifest[rel], sha256Hex(content), `manifest hash matches bytes: ${rel}`);
}
t.ok(pkg.files["evals/run_evals.py"].includes("EVAL_SUMMARY_JSON"), "evals entrypoint present");
t.ok(pkg.files["tests/test_reconcile.py"].includes("def test_"), "pytest suite present");
t.ok(pkg.files["src/reconcile.py"].includes("NotImplementedError"), "reconcile.py is a candidate stub, not the answer");
const stubSrc = pkg.files["src/reconcile.py"];
t.ok(!/SHP-00007|00024|SHP-038/.test(stubSrc), "stub contains no exact normalized-ID answers");
t.ok(!/:05d|zfill|padStart/.test(stubSrc), "stub contains no padding implementation");
t.eq(scenarioIdForTemplateSlug("project-relay", ROOT), "project-relay", "slug maps to scenario");
t.eq(scenarioIdForTemplateSlug("../evil", ROOT), null, "traversal slug rejected");
t.eq(scenarioIdForTemplateSlug("nope", ROOT), null, "unknown slug -> null");

// SCEN-04: exclusion by construction — only the allowlist is ever read.
const allowlisted = JSON.parse(
  require("node:fs").readFileSync(join(RELAY, ".fydell", "scenario.json"), "utf8")
).files as string[];
t.ok(
  Object.keys(pkg.files).every((f) => allowlisted.includes(f)),
  "every packaged file is on the allowlist"
);
t.ok(!("canonical.json" in pkg.files), "canonical.json excluded from the package");
t.ok(
  require("node:fs").existsSync(join(RELAY, "canonical.json")),
  "canonical.json exists on disk (hidden), proving exclusion is by construction"
);
for (const banned of ["canonical.json", ".env", "secrets"]) {
  t.ok(
    !Object.keys(pkg.files).some((f) => f.includes(banned)),
    `no ${banned} in package`
  );
}
// Hostile allowlist (path traversal) is rejected, not served.
const hostileDir = mkdtempSync(join(tmpdir(), "hostile-scen-"));
mkdirSync(join(hostileDir, "scenarios", "evil", ".fydell"), { recursive: true });
writeFileSync(
  join(hostileDir, "scenarios", "evil", ".fydell", "scenario.json"),
  JSON.stringify({ id: "evil", version: "1.0.0", files: ["../canonical.json", "/etc/passwd", "ok.txt"] })
);
writeFileSync(join(hostileDir, "scenarios", "evil", "ok.txt"), "ok");
t.throws(
  () => buildScenarioPackage("evil", hostileDir),
  "traversal in allowlist rejected"
);

// ---------------------------------------------------------------------------
// SCEN-03: real tests/evals — defective fails, reference passes
// ---------------------------------------------------------------------------
function runScenarioTests(): { passed: string[]; failed: { name: string; kind: string }[] } {
  const code = `
import sys
sys.path.insert(0, 'tests'); sys.path.insert(0, 'src')
import test_reconcile
import json
out = {"passed": [], "failed": []}
for n in [n for n in dir(test_reconcile) if n.startswith('test_')]:
    try:
        getattr(test_reconcile, n)()
        out["passed"].append(n)
    except Exception as e:
        out["failed"].append({"name": n, "kind": type(e).__name__})
print(json.dumps(out))
`;
  const r = spawnSync("python3", ["-c", code], { cwd: RELAY, timeout: 60000, encoding: "utf8" });
  t.ok(r.status === 0, "scenario test harness ran", r.stderr?.slice(0, 200));
  return JSON.parse(r.stdout) as { passed: string[]; failed: { name: string; kind: string }[] };
}

// Red state (as-shipped stub): fix-dependent tests fail with NotImplementedError.
const red = runScenarioTests();
t.eq(red.passed.length + red.failed.length, 6, "all 6 scenario tests executed");
const fixTests = red.failed.filter((f) => f.kind === "NotImplementedError").map((f) => f.name);
t.eq(fixTests.length, 3, "3 fix-dependent tests fail cleanly on the stub");
t.ok(
  red.passed.includes("test_naive_join_drops_mismatched_ids"),
  "defect-demonstrating test passes on the stub"
);

// Green state: a correct implementation passes everything (temporary, then restored).
const stubPath = join(RELAY, "src", "reconcile.py");
const backupPath = join(tmpdir(), "reconcile-stub-backup.py");
copyFileSync(stubPath, backupPath);
try {
  const impl = `
from __future__ import annotations
import re
from typing import Any
def normalize_shipment_id(raw):
    m = re.search(r"\\d+", raw or "")
    return f"SHP-{int(m.group()):05d}" if m else raw
def reconciled_join(shipments, delay_rows):
    known = {s["shipment_id"] for s in shipments}
    matched, unmatched = [], []
    for row in delay_rows:
        n = normalize_shipment_id(row["shipment_id"])
        if n in known:
            matched.append({**row, "shipment_id": n})
        else:
            unmatched.append(row)
    return matched, unmatched
`;
  writeFileSync(stubPath, impl);
  const green = runScenarioTests();
  t.eq(green.failed.length, 0, "correct implementation passes all 6 tests");
  t.eq(green.passed.length, 6, "6/6 green");
  const evals = spawnSync("python3", ["evals/run_evals.py"], { cwd: RELAY, timeout: 60000, encoding: "utf8" });
  t.ok(evals.status === 0, "evals exit 0 with a correct implementation", evals.stderr?.slice(0, 200));
  t.ok(evals.stdout.includes("EVAL_SUMMARY_JSON"), "evals print the machine summary");
  t.ok(evals.stdout.includes('"cases_failures": 0'), "evals report zero failures");
} finally {
  copyFileSync(backupPath, stubPath);
}
t.ok(
  require("node:fs").readFileSync(stubPath, "utf8").includes("NotImplementedError"),
  "stub restored after green-state check"
);
// And the red state again after restore: evals fail with guidance, no traceback.
const evalsRed = spawnSync("python3", ["evals/run_evals.py"], { cwd: RELAY, timeout: 60000, encoding: "utf8" });
t.ok(evalsRed.status !== 0, "evals fail on the pristine stub");
t.ok(!evalsRed.stdout.includes("Traceback"), "evals fail gracefully (no traceback)");
t.ok(evalsRed.stdout.includes("not implemented yet"), "evals tell the candidate what to implement");

// ---------------------------------------------------------------------------
// Answer-key leak audit: hidden fields never reach candidate-visible views
// ---------------------------------------------------------------------------
const SECRET = "LEAK_PROBE_9f8c2a";
const hostileContent = {
  slug: "probe", roleKey: "data_analyst", title: "Probe", scenarioSummary: "s", mission: "m",
  companyName: "c", durationMinutes: 5, difficulty: "standard", toolsAvailable: [],
  workspaceTools: [], tasks: [], resources: [],
  stakeholders: [
    {
      id: "st1", name: "Sam", role: "Ops", blurb: "b",
      knowledge: [SECRET + "_knowledge"],
      withholds: [SECRET + "_withhold"],
      responseRules: [{ id: "r1", reply: SECRET + "_rule" }],
      aiPersona: SECRET + "_persona",
    },
  ],
  curveball: { id: "cb", stakeholderId: "st1", announcement: "a", requiredAdaptation: "r", triggerElapsedRatio: 0.5, minEvents: 1 },
  deliverableFields: [],
  competencies: [
    { key: "correctness", label: "Correctness", strengthTemplates: [SECRET + "_strength"], improvementTemplates: [SECRET + "_improve"] },
  ],
  deterministicChecks: [{ id: "dc1", competencyKey: "correctness", indicator: SECRET + "_check" }],
  rubricIndicators: [{ id: "ri1", competencyKey: "correctness", indicator: "i", anchorLow: SECRET + "_low", anchorMid: "m", anchorHigh: "h" }],
  answerKey: { summary: SECRET + "_answer", keyFindings: [SECRET + "_finding"], validAlternatives: [] },
  aiAssistantInstructions: SECRET + "_assistant",
  aiRubricGuidance: SECRET + "_rubric",
  schemaVersion: 1,
} as never;

const views: Array<[string, unknown]> = [
  ["toCandidateView", toCandidateView(hostileContent, { curveballPresented: false })],
  ["toCatalogCard", toCatalogCard(hostileContent)],
];
for (const [name, view] of views) {
  t.ok(!JSON.stringify(view).includes(SECRET), `${name} leaks no hidden material`);
}
const leakedStakeholder = (toCandidateView(hostileContent, { curveballPresented: false }).stakeholders as unknown[]).length;
t.eq(leakedStakeholder, 1, "stakeholder still present (disclosed, not removed)");
const stView = toCandidateView(hostileContent, { curveballPresented: false }).stakeholders[0];
t.eq(stView.simulated, true, "leak-probe stakeholder disclosed as simulated");

// Micro views: secrets must not appear; disclosure must.
const micro = ALL_SIMULATIONS[0];
const microJson = JSON.stringify(toMicroCandidateView(micro));
for (const field of REFERENCE_ANSWER_FIELDS) {
  t.ok(!microJson.includes(`"${field}"`), `micro candidate view has no "${field}" key`);
}
const v2json = JSON.stringify(toV2CandidateView(microToV2(micro)));
for (const field of REFERENCE_ANSWER_FIELDS) {
  t.ok(!v2json.includes(`"${field}"`), `v2 candidate view has no "${field}" key`);
}

// ---------------------------------------------------------------------------
// WORK-02: every competency has evidence; correctness is deterministically backed
// ---------------------------------------------------------------------------
for (const s of ALL_SIMULATIONS) {
  const { errors } = validateEvidenceCoverage(s);
  t.eq(errors, [], `evidence coverage: ${s.slug}`);
  const backing = validateCorrectnessBacking(s);
  t.eq(backing, [], `correctness backing: ${s.slug}`);
}

// SCEN-02: four-dimension rubric validation (validator exercised on a full
// SimulationContent; no long-form content is published yet, so a realistic
// fixture proves the validator, not a shipped scenario).
const fullFixture = {
  ...hostileContent,
  competencies: [
    { key: "correctness", label: "Technical correctness", description: "correct output" },
    { key: "judgment", label: "Engineering judgment", description: "trade-offs" },
    { key: "adaptation", label: "Response to requirement changes", description: "adapts" },
    { key: "communication", label: "Work communication", description: "handoff clarity" },
  ],
  rubricIndicators: [
    { id: "a", competencyKey: "correctness", indicator: "i", anchorLow: "wrong", anchorMid: "partial", anchorHigh: "right" },
    { id: "b", competencyKey: "judgment", indicator: "i", anchorLow: "l", anchorMid: "m", anchorHigh: "h" },
    { id: "c", competencyKey: "adaptation", indicator: "i", anchorLow: "l", anchorMid: "m", anchorHigh: "h" },
    { id: "d", competencyKey: "communication", indicator: "i", anchorLow: "l", anchorMid: "m", anchorHigh: "h" },
  ],
} as never;
const dims = validateDimensionCoverage(fullFixture);
t.eq(dims.missing, [], "four dimensions covered by the fixture");
const dimsBad = validateDimensionCoverage({ ...fullFixture, competencies: [] } as never);
t.ok(dimsBad.missing.length === 4, "validator catches missing dimensions");

// WORK-07: no cultural-fit language anywhere in shipped content.
for (const s of ALL_SIMULATIONS) {
  t.eq(scanForCultureFitLanguage(s), [], `culture-fit scan clean: ${s.slug}`);
}
t.ok(
  scanForCultureFitLanguage({
    ...micro,
    stakeholders: [{ ...micro.stakeholders[0], blurb: "a real culture fit who hustles hard" }],
  } as never).length > 0,
  "culture-fit scan catches a planted violation"
);

// WORK-08: modest process observations from real event shapes.
const obs = deriveProcessObservations({
  events: [
    { id: "e1", event_type: "test_run", actor: "candidate", created_at: "2026-09-27T10:01:00Z" },
    { id: "e2", event_type: "resource_opened", actor: "candidate", created_at: "2026-09-27T10:02:00Z", payload: { resourceId: "r1" } },
    { id: "e3", event_type: "message_sent", actor: "candidate", created_at: "2026-09-27T10:03:00Z" },
  ],
  firstSavedEditAt: "2026-09-27T10:05:00Z",
});
t.ok(obs.some((o) => o.label === "ran_tests_before_first_saved_edit"), "test-before-edit observed");
t.ok(
  obs.every((o) => !/understood|confused|diligent/i.test(o.detail)),
  "no overclaim in derived observations"
);
t.eq(validateObservationModesty(obs), [], "derived observations pass the modesty check");
t.ok(
  validateObservationModesty([
    { kind: "inference", label: "x", detail: "The candidate is a strong engineer who deeply understood the architecture." },
  ]).length > 0,
  "modesty check catches an overclaim fixture"
);

// WORK-09: comparability — same form for same template/version/cohort.
const a1 = { templateId: "t", templateVersionId: "v3", cohortId: "c1", candidateUserId: "u1" };
const a2 = { templateId: "t", templateVersionId: "v3", cohortId: "c1", candidateUserId: "u2" };
const a3 = { templateId: "t", templateVersionId: "v4", cohortId: "c1", candidateUserId: "u3" };
t.eq(attemptFormKey(a1), attemptFormKey(a2), "candidate id is not part of the form key");
t.eq(checkComparable(a1, a2).comparable, true, "same template/version/cohort comparable");
t.eq(checkComparable(a1, a3).comparable, false, "different pinned version not comparable");
t.eq(groupAttemptsByForm([a1, a2, a3]).size, 2, "attempts group into two forms");
for (const s of ALL_SIMULATIONS) {
  t.eq(validateNoSilentPersonalization(s), [], `no silent personalization: ${s.slug}`);
}

// SCEN-09: immutable published versions; answer-field audit list.
const v1 = nextVersion({
  templateId: "t", existingVersions: [], content: { a: 1 },
  changeNotes: "initial", publishedBy: "reviewer",
});
t.eq(v1.version, 1, "first version is 1");
const v2 = nextVersion({
  templateId: "t", existingVersions: [v1], content: { a: 2 },
  changeNotes: "fix", publishedBy: "reviewer",
});
t.eq(v2.version, 2, "versions never reuse numbers");
t.throws(
  () => nextVersion({ templateId: "t", existingVersions: [v1], content: {}, changeNotes: "  ", publishedBy: "r" }),
  "publishing requires change notes"
);
assertPublishedImmutable(v1, { a: 1 });
t.throws(() => assertPublishedImmutable(v1, { a: 999 }), "mutated published version detected");
forbidPublishedEdit({ version: 1, status: "draft" });
t.throws(() => forbidPublishedEdit({ version: 1, status: "published" }), "published edit forbidden");
t.ok(hashContent({ a: 1 }) === hashContent({ a: 1 }), "content hash deterministic");
t.ok(hashContent({ a: 1 }) !== hashContent({ a: 2 }), "content hash changes with content");
for (const f of ["answerKey", "knowledge", "withholds", "responseRules", "aiPersona"]) {
  t.ok((REFERENCE_ANSWER_FIELDS as readonly string[]).includes(f), `answer-field audit covers ${f}`);
}

finish(t.summary());
