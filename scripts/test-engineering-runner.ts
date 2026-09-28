/**
 * Engineering runner — pure rules (no Python, no network, no database).
 *
 * Covers: workspace assembly (UP-04 path rules, RUN-04 trusted-test restore,
 * runner-config stripping, hidden tests only in evaluation runs, DESK-12
 * snapshot hashing), JUnit parsing, group grading, integrity checks (RUN-05
 * canary + expected tests), status classification (RUN-06, UP-08) and the
 * candidate-safe projection (hidden tests never shown individually).
 *
 * Run: npx tsx --conditions react-server scripts/test-engineering-runner.ts
 */
import { loadTrustedMaterial } from "../src/lib/engineering/descriptor";
import { assembleRunWorkspace, WorkspaceRejected, RUNNER_CONFIG_PATH } from "../src/lib/engineering/workspace";
import { parseJUnitXml } from "../src/lib/engineering/junit";
import { interpretRun, toCandidateView } from "../src/lib/engineering/evaluate";
import { readFileSync } from "node:fs";
import { BOOTSTRAP_PY, parseEnvelope } from "../src/lib/engineering/bootstrap";
import { buildScenarioPackage } from "../src/lib/simulations/scenario-package";
import type { ProviderResult } from "../src/lib/engineering/types";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`ok   ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  }
}
function throwsCode(name: string, fn: () => unknown, code: string) {
  try {
    fn();
    check(name, false, "did not throw");
  } catch (err) {
    check(name, err instanceof WorkspaceRejected && err.code === code, err instanceof Error ? err.message : err);
  }
}

const SCENARIO = "webhook-retry-incident";
const material = loadTrustedMaterial(SCENARIO);
const pkg = buildScenarioPackage(SCENARIO);

// ------------------------------------------------------------ package boundary
check("package contains the provided tests", "tests/test_dispatcher.py" in pkg.files);
check(
  "package never contains hidden tests, solutions or internal metadata",
  Object.keys(pkg.files).every((p) => !p.startsWith(".hidden/") && !p.startsWith(".fydell/") && p !== "canonical.json")
);
check(
  "no hidden test source text appears anywhere in the package",
  Object.values(pkg.files).every((c) => !c.includes("test_harness_canary_must_fail") && !c.includes("Retry-After"))
);
check("descriptor version matches the package", material.descriptor.scenarioVersion === pkg.scenarioVersion);

// ------------------------------------------------------------ workspace assembly
const candidate: Record<string, string> = { ...pkg.files };
candidate["webhooks/retry.py"] += "\n# candidate edit\n";
candidate["tests/test_dispatcher.py"] = "def test_everything():\n    assert True\n";
candidate["tests/test_my_cases.py"] = "def test_mine():\n    assert 1 == 1\n";
candidate["conftest.py"] = "import pytest\n";
candidate["webhooks/conftest.py"] = "import pytest\n";
candidate["pyproject.toml"] = "[tool.pytest.ini_options]\naddopts='-p no:junitxml'\n";
candidate["tests/hidden/test_fake.py"] = "def test_x():\n    assert True\n";
candidate["notes.md"] = "scratch";

const practice = assembleRunWorkspace("practice", candidate, material);
check("practice: edited provided test is restored to the pinned copy", practice.files["tests/test_dispatcher.py"] === material.trusted["tests/test_dispatcher.py"]);
check("practice: restore is reported", practice.restoredTrusted.includes("tests/test_dispatcher.py"));
check("practice: candidate code edit is kept", practice.files["webhooks/retry.py"].includes("# candidate edit"));
check("practice: candidate-added test runs", practice.files["tests/test_my_cases.py"] !== undefined && practice.candidateTestFiles.includes("tests/test_my_cases.py"));
check("practice: conftest.py at any depth is dropped", !("conftest.py" in practice.files) && !("webhooks/conftest.py" in practice.files));
check("practice: pyproject.toml is dropped", !("pyproject.toml" in practice.files));
check("practice: candidate cannot plant files in the hidden mount", !("tests/hidden/test_fake.py" in practice.files));
check("practice: files outside the editable area are not sent", !("notes.md" in practice.files) && !("INCIDENT.md" in practice.files));
check("practice: no hidden test is mounted", Object.keys(practice.files).every((p) => !p.startsWith("tests/hidden/")));
check("practice: runner config is the trusted empty ini", practice.files[RUNNER_CONFIG_PATH] === "[pytest]\n" && practice.pytestArgs.includes(RUNNER_CONFIG_PATH));
check(
  "practice: ignored paths carry reasons",
  practice.ignored.some((i) => i.path === "conftest.py" && i.reason === "runner_config_not_used") &&
    practice.ignored.some((i) => i.path === "tests/hidden/test_fake.py" && i.reason === "reserved_path") &&
    practice.ignored.some((i) => i.path === "notes.md" && i.reason === "outside_editable_area")
);

const evaluation = assembleRunWorkspace("evaluation", candidate, material);
check("evaluation: every hidden test is mounted", Object.keys(material.hidden).every((p) => evaluation.files[p] === material.hidden[p]));
check("evaluation: hidden package init exists", "tests/hidden/__init__.py" in evaluation.files);
check("evaluation: candidate tests are not collected", !evaluation.pytestArgs.includes("tests") && !evaluation.pytestArgs.includes("tests/test_my_cases.py"));
check("evaluation: provided tests and hidden mount are the targets", evaluation.pytestArgs.includes("tests/test_dispatcher.py") && evaluation.pytestArgs.includes("tests/hidden"));

// DESK-12: the hash binds to exact editable contents.
const again = assembleRunWorkspace("practice", { ...candidate }, material);
check("snapshot hash is deterministic", again.candidateSnapshotHash === practice.candidateSnapshotHash);
const edited = assembleRunWorkspace("practice", { ...candidate, "webhooks/store.py": candidate["webhooks/store.py"] + "\n" }, material);
check("any editable change changes the snapshot hash", edited.candidateSnapshotHash !== practice.candidateSnapshotHash);
const docsOnly = assembleRunWorkspace("practice", { ...candidate, "notes.md": "different" }, material);
check("non-editable files do not affect the snapshot hash", docsOnly.candidateSnapshotHash === practice.candidateSnapshotHash);

// UP-04 path rules.
throwsCode("traversal path rejected", () => assembleRunWorkspace("practice", { "../x.py": "" }, material), "PATH_UNSAFE");
throwsCode("absolute path rejected", () => assembleRunWorkspace("practice", { "/etc/passwd": "" }, material), "PATH_UNSAFE");
throwsCode("backslash path rejected", () => assembleRunWorkspace("practice", { "webhooks\\x.py": "" }, material), "PATH_UNSAFE");
throwsCode("case-colliding paths rejected", () => assembleRunWorkspace("practice", { "webhooks/a.py": "", "webhooks/A.py": "" }, material), "PATH_DUPLICATE");
throwsCode("oversized file rejected", () => assembleRunWorkspace("practice", { "webhooks/big.py": "x".repeat(1024 * 1024 + 1) }, material), "FILE_TOO_LARGE");
throwsCode("empty snapshot rejected", () => assembleRunWorkspace("practice", {}, material), "EMPTY");

// ------------------------------------------------------------ JUnit parsing
const xml = `<?xml version="1.0"?><testsuites><testsuite name="pytest">
<testcase classname="tests.test_dispatcher" name="test_ok" file="tests/test_dispatcher.py" line="3" time="0.01" />
<testcase classname="tests.test_dispatcher" name="test_bad" file="tests/test_dispatcher.py" line="9"><failure message="assert 2 == 1&#10;more">trace</failure></testcase>
<testcase classname="tests.hidden.test_hidden_update" name="test_p[429]" file="tests/hidden/test_hidden_update.py"><error message="boom &amp; &lt;x&gt;">e</error></testcase>
<testcase classname="tests.test_mine" name="test_skip" file="tests/test_mine.py"><skipped message="later" /></testcase>
</testsuite></testsuites>`;
const cases = parseJUnitXml(xml);
check("junit: four cases parsed", cases.length === 4, cases.length);
check("junit: pass", cases[0].outcome === "passed" && cases[0].id === "tests/test_dispatcher.py::test_ok");
check("junit: failure with first-line message", cases[1].outcome === "failed" && cases[1].message === "assert 2 == 1");
check("junit: error + entity decoding + param suffix", cases[2].outcome === "error" && cases[2].message === "boom & <x>" && cases[2].baseId === "tests/hidden/test_hidden_update.py::test_p");
check("junit: skipped", cases[3].outcome === "skipped");
check("junit: garbage yields nothing", parseJUnitXml("not xml <testcase>").length === 0);

// ------------------------------------------------------------ interpretation
function provider(over: Partial<ProviderResult>): ProviderResult {
  return {
    provider: "test",
    environmentVersion: "test-env",
    exitCode: 0,
    timedOut: false,
    output: "",
    outputTruncated: false,
    junitXml: null,
    infrastructureError: null,
    ...over,
  };
}
function junitFor(entries: Array<[string, "passed" | "failed"]>): string {
  const body = entries
    .map(([id, outcome]) => {
      const [file, name] = id.split("::");
      return outcome === "passed"
        ? `<testcase name="${name}" file="${file}" />`
        : `<testcase name="${name}" file="${file}"><failure message="x">x</failure></testcase>`;
    })
    .join("\n");
  return `<testsuites><testsuite>${body}</testsuite></testsuites>`;
}
const allGroupTests = material.descriptor.groups.flatMap((g) =>
  g.tests.map((t) => (t.endsWith("::") ? `${t}test_placeholder` : t))
);
const canary = material.descriptor.canary;
const healthy = junitFor([...allGroupTests.map((t) => [t, "passed"] as [string, "passed"]), [canary, "failed"]]);

const infra = interpretRun({ workspace: evaluation, material, result: provider({ infrastructureError: "sandbox quota" }) });
check("infra failure -> infrastructure_error, never a candidate result", infra.status === "infrastructure_error" && infra.classification === "platform_outage" && infra.groups.length === 0);
check("infra failure message says work is unchanged", /not a result about your code/.test(infra.statusReason ?? ""));

const good = interpretRun({ workspace: evaluation, material, result: provider({ junitXml: healthy, exitCode: 1 }) });
check("healthy evaluation -> completed", good.status === "completed", good.statusReason);
check("healthy evaluation: all groups pass", good.groups.every((g) => g.status === "pass"), good.groups);
check("canary is excluded from visible tests", good.tests.every((t) => t.baseId !== canary));
check("canary failed as expected", good.integrity.canary === "failed_as_expected");

const tampered = interpretRun({
  workspace: evaluation,
  material,
  result: provider({ junitXml: healthy.replace(`name="${canary.split("::")[1]}" file="${canary.split("::")[0]}"><failure message="x">x</failure></testcase>`, `name="${canary.split("::")[1]}" file="${canary.split("::")[0]}" />`) }),
});
check("canary reported passed -> indeterminate (tampered), not a pass", tampered.status === "indeterminate" && tampered.integrity.canary === "passed_unexpectedly");

const missing = interpretRun({
  workspace: evaluation,
  material,
  result: provider({ junitXml: junitFor([[allGroupTests[0], "passed"], [canary, "failed"]]) }),
});
check("missing expected tests -> indeterminate", missing.status === "indeterminate" && missing.integrity.missingExpected.length > 0);

const failingIncident = interpretRun({
  workspace: evaluation,
  material,
  result: provider({
    junitXml: junitFor([
      ...allGroupTests.map((t) => [t, t.includes("test_gone_endpoint") ? "failed" : "passed"] as [string, "passed" | "failed"]),
      [canary, "failed"],
    ]),
  }),
});
const incident = failingIncident.groups.find((g) => g.id === "incident_fix");
check("one failing test fails its group only", incident?.status === "fail" && failingIncident.groups.filter((g) => g.status === "fail").length === 1);

const noUpdate = interpretRun({ workspace: evaluation, material, result: provider({ junitXml: healthy }), updatePresented: () => false });
check(
  "update group is not_applicable when the update was never presented",
  noUpdate.groups.find((g) => g.id === "requirement_update")?.status === "not_applicable"
);

const importErr = interpretRun({ workspace: practice, material, result: provider({ exitCode: 2, junitXml: null, output: "ImportError: x" }) });
check("no results + exit 2 -> indeterminate code_error with guidance", importErr.status === "indeterminate" && importErr.classification === "code_error" && /import or syntax/.test(importErr.statusReason ?? ""));

const timeout = interpretRun({ workspace: practice, material, result: provider({ timedOut: true, exitCode: null }) });
check("timeout surfaces the limit, not a skill verdict", timeout.status === "indeterminate" && /limit/.test(timeout.statusReason ?? ""));

const view = toCandidateView(good);
check("candidate view never lists hidden tests", view.tests.every((t) => t.origin !== "hidden"));
check("candidate view of an evaluation carries no raw output", view.output === "");

// ------------------------------------------------------------ bootstrap parity
// The isolated worker ships its own copy of the bootstrap (it must not trust
// one sent in a request). Both copies must stay byte-identical.
check(
  "worker bootstrap.py is identical to the app's BOOTSTRAP_PY",
  readFileSync("services/engineering-runner/bootstrap.py", "utf8").replace(/\r\n/g, "\n") === BOOTSTRAP_PY.replace(/^\n/, "")
);

// ------------------------------------------------------------ envelope
const nonce = "abc123";
const blob = Buffer.from(JSON.stringify({ exitCode: 1, timedOut: false, output: "o", outputTruncated: false, junitXml: "<x/>" })).toString("base64");
const forged = Buffer.from(JSON.stringify({ exitCode: 0, timedOut: false, output: "", outputTruncated: false, junitXml: "<forged/>" })).toString("base64");
const env = parseEnvelope(`noise\nFYDELL-RESULT:wrongnonce:${forged}\nFYDELL-RESULT:${nonce}:${blob}\n`, nonce);
check("envelope: only the run's nonce is accepted", env?.junitXml === "<x/>");
check("envelope: absent -> null", parseEnvelope("FYDELL-RESULT:other:xx", nonce) === null);
check("envelope: corrupt -> null", parseEnvelope(`FYDELL-RESULT:${nonce}:%%%`, nonce) === null);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
