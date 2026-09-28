/**
 * Authoring-time validation of an engineering scenario (SCEN-01/03, RUN-04/05).
 *
 * Runs every solution variant in `.hidden/solutions/` through the SAME
 * workspace assembly, bootstrap and result interpretation the production
 * runner uses, with the local development provider, and checks each group's
 * outcome against the expected matrix in `.fydell/evaluation.json`. Then runs
 * adversarial fixtures: reporting tamper, conftest injection, a weakened
 * provided test, and an infinite loop.
 *
 * Requires Python 3.11+ with pytest on PATH (FYDELL_LOCAL_PYTHON overrides).
 * This executes the variants on this machine: use it only on author/CI
 * machines, never with candidate submissions.
 *
 * Run: npx tsx --conditions react-server scripts/validate-engineering-scenario.ts [scenarioId]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { loadTrustedMaterial } from "../src/lib/engineering/descriptor";
import { assembleRunWorkspace } from "../src/lib/engineering/workspace";
import { interpretRun } from "../src/lib/engineering/evaluate";
import { createLocalProvider } from "../src/lib/engineering/providers/local";
import { buildScenarioPackage, scenariosRoot } from "../src/lib/simulations/scenario-package";
import type { EngineeringRunResult, RunKind, TrustedMaterial } from "../src/lib/engineering/types";

const scenarioId = process.argv[2] || "webhook-retry-incident";
const material = loadTrustedMaterial(scenarioId);
const pkg = buildScenarioPackage(scenarioId);
const provider = createLocalProvider();
const root = join(scenariosRoot(), scenarioId);
const validation = JSON.parse(readFileSync(join(root, ".fydell", "evaluation.json"), "utf8")).validation as {
  variantsDir: string;
  expected: Record<string, Record<string, "pass" | "fail">>;
};

let failures = 0;
function report(ok: boolean, name: string, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

function readTree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const abs = join(d, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else out[relative(dir, abs).split(sep).join("/")] = readFileSync(abs, "utf8");
    }
  };
  walk(dir);
  return out;
}

async function run(kind: RunKind, files: Record<string, string>, m: TrustedMaterial = material): Promise<EngineeringRunResult> {
  const workspace = assembleRunWorkspace(kind, files, m);
  const result = await provider.run({
    files: workspace.files,
    pytestArgs: workspace.pytestArgs,
    timeoutSeconds: m.descriptor.runtime.timeoutSeconds,
    maxOutputBytes: m.descriptor.runtime.maxOutputBytes,
  });
  return interpretRun({ workspace, material: m, result });
}

function groupSummary(r: EngineeringRunResult): string {
  return r.groups.map((g) => `${g.id}=${g.status}(${g.passed}/${g.total})`).join(" ");
}

async function main() {
  console.log(`Validating ${scenarioId} ${material.descriptor.scenarioVersion} (${material.descriptor.suiteVersion})\n`);

  // 1. Solution matrix.
  const variantsRoot = join(root, validation.variantsDir);
  for (const [variant, expected] of Object.entries(validation.expected)) {
    const files = { ...pkg.files };
    if (variant !== "__shipped__") Object.assign(files, readTree(join(variantsRoot, variant)));
    const r = await run("evaluation", files);
    const mismatches = Object.entries(expected).filter(
      ([group, want]) => r.groups.find((g) => g.id === group)?.status !== want
    );
    report(
      r.status === "completed" && mismatches.length === 0,
      `variant ${variant}`,
      r.status !== "completed" ? `${r.status}: ${r.statusReason}` : groupSummary(r)
    );
  }
  const onDisk = readdirSync(variantsRoot).filter((d) => statSync(join(variantsRoot, d)).isDirectory());
  const unlisted = onDisk.filter((d) => !(d in validation.expected));
  report(unlisted.length === 0, "every solution variant has an expected outcome", unlisted.join(", "));

  // 2. Candidate-visible red state: practice run on the shipped code.
  const red = await run("practice", { ...pkg.files });
  const redFailures = red.tests.filter((t) => t.outcome !== "passed").map((t) => t.baseId);
  report(
    red.status === "completed" &&
      redFailures.length === 2 &&
      redFailures.every((id) => /test_gone_endpoint_is_not_retried|test_republished_event_is_delivered_once/.test(id)),
    "shipped code: exactly the two incident reproductions fail in a practice run",
    redFailures.join(", ")
  );
  report(red.tests.every((t) => t.origin !== "hidden"), "practice run exposes no hidden tests");

  // 3. Candidate-authored tests run and are labelled.
  const withOwn = await run("practice", {
    ...pkg.files,
    "tests/test_my_cases.py": "def test_mine():\n    assert 2 + 2 == 4\n",
  });
  report(
    withOwn.tests.some((t) => t.origin === "candidate" && t.outcome === "passed"),
    "candidate-added test runs and is labelled as the candidate's"
  );

  const reference = readTree(join(variantsRoot, "reference"));

  // 4. Weakening a provided test has no effect (restored before the run).
  const weakened = await run("evaluation", {
    ...pkg.files,
    "tests/test_dispatcher.py": "def test_gone_endpoint_is_not_retried():\n    assert True\n",
  });
  report(
    weakened.restoredTrusted.includes("tests/test_dispatcher.py") &&
      weakened.groups.find((g) => g.id === "incident_fix")?.status === "fail",
    "weakened provided test is restored; the incident still fails"
  );

  // 5. conftest.py that forces every test to pass is ignored.
  const conftest = await run("evaluation", {
    ...pkg.files,
    "tests/conftest.py":
      "import pytest\n@pytest.hookimpl(hookwrapper=True)\ndef pytest_runtest_makereport(item, call):\n    out = yield\n    rep = out.get_result()\n    rep.outcome = 'passed'\n",
  });
  report(
    conftest.ignored.some((i) => i.path === "tests/conftest.py") &&
      conftest.status === "completed" &&
      conftest.groups.find((g) => g.id === "incident_fix")?.status === "fail",
    "conftest.py injection is dropped; results stay honest"
  );

  // 6. Reporting tamper from inside the candidate's package is detected by the canary.
  const tamper = await run("evaluation", {
    ...pkg.files,
    "webhooks/__init__.py":
      pkg.files["webhooks/__init__.py"] +
      "\ntry:\n    import _pytest.reports as _r\n    _init = _r.TestReport.__init__\n    def _patched(self, *a, **k):\n        _init(self, *a, **k)\n        self.outcome = 'passed'\n        self.longrepr = None\n    _r.TestReport.__init__ = _patched\nexcept Exception:\n    pass\n",
  });
  report(
    tamper.status === "indeterminate" && tamper.integrity.canary === "passed_unexpectedly",
    "reporting tamper is detected (canary) and never scored as a pass",
    `${tamper.status} canary=${tamper.integrity.canary}`
  );

  // 7. An infinite loop hits the wall-clock limit and is reported as such.
  const loopMaterial: TrustedMaterial = {
    ...material,
    descriptor: { ...material.descriptor, runtime: { ...material.descriptor.runtime, timeoutSeconds: 8 } },
  };
  const loop = await run(
    "evaluation",
    {
      ...pkg.files,
      ...reference,
      "webhooks/signing.py": pkg.files["webhooks/signing.py"].replace(
        "def sign(secret: str, timestamp: int, body: bytes) -> str:\n",
        "def sign(secret: str, timestamp: int, body: bytes) -> str:\n    while True:\n        pass\n"
      ),
    },
    loopMaterial
  );
  report(loop.status === "indeterminate" && /limit/.test(loop.statusReason ?? ""), "infinite loop hits the time limit", loop.statusReason ?? "");

  console.log(`\n${failures === 0 ? "VALIDATION PASSED" : `VALIDATION FAILED (${failures})`}`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
