/**
 * Milestone 1 gate: Relay technical spike acceptance.
 * Proves: load repo, edit file, persist across "refresh", run tests,
 * capture stdout/stderr/exit/duration, apply curveball, immutable snapshot,
 * recover after terminate.
 *
 * Run: npx tsx scripts/test-relay-spike.ts
 */
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import {
  NodeTestExecutionProvider,
  loadScenarioSeedFiles,
} from "../src/lib/relay/node-test-provider";

async function main() {
  const scenarioRoot = resolve(process.cwd(), "scenarios/project-relay");
  const work = mkdtempSync(join(tmpdir(), "relay-spike-"));
  const provider = new NodeTestExecutionProvider(scenarioRoot, work);
  const seed = loadScenarioSeedFiles(scenarioRoot);

  console.log("1. initialize");
  await provider.initializeSession(seed);
  const files = await provider.listFiles();
  if (!files.includes("src/triage.py")) throw new Error("missing triage.py");

  console.log("2. edit file");
  let triage = await provider.readFile("src/triage.py");
  triage = triage.replace(
    'confidence: "heuristic_v1"',
    'reason: "heuristic_v1_spike_edit"'
  );
  await provider.writeFile("src/triage.py", triage);

  console.log("3. persist across refresh (restore from memory snapshot)");
  const mid = await provider.snapshot("mid-edit");
  await provider.terminate();
  const provider2 = new NodeTestExecutionProvider(scenarioRoot, work + "-restored");
  await provider2.restore(mid);
  const restored = await provider2.readFile("src/triage.py");
  if (!restored.includes("heuristic_v1_spike_edit")) {
    throw new Error("edit did not persist across restore");
  }

  console.log("4. run allowlisted tests");
  const tests = await provider2.runTests();
  console.log(JSON.stringify({
    ok: tests.ok,
    exitCode: tests.exitCode,
    durationMs: tests.durationMs,
    stdout: tests.stdout.slice(0, 400),
    stderr: tests.stderr.slice(0, 400),
  }));
  if (!tests.ok) throw new Error("tests failed");

  console.log("5. run evals");
  const evals = await provider2.runEvaluations();
  console.log(JSON.stringify({
    ok: evals.ok,
    exitCode: evals.exitCode,
    durationMs: evals.durationMs,
  }));
  if (!evals.ok) throw new Error("evals failed");

  console.log("6. preview (deterministic request/response — not a fake FastAPI server)");
  const preview = await provider2.runCommand("preview");
  if (!preview.ok) throw new Error("preview failed");

  console.log("7. curveball marker applied");
  await provider2.writeFile(
    "docs/curveball.md",
    "CURVEBALL: model API rate limiting and latency spike. Revise plan and recommendation."
  );

  console.log("8. immutable submission snapshot");
  const snap = await provider2.snapshot("submission");
  const frozen = JSON.stringify(snap.files);
  await provider2.writeFile("src/triage.py", "# tamper after submit\n");
  if (JSON.stringify(snap.files) !== frozen) {
    throw new Error("snapshot mutated");
  }
  if (snap.files["src/triage.py"].includes("tamper")) {
    throw new Error("snapshot not immutable relative to later writes");
  }

  console.log("9. recover after terminate");
  await provider2.terminate();
  const provider3 = new NodeTestExecutionProvider(scenarioRoot, work + "-final");
  await provider3.restore(snap);
  const again = await provider3.readFile("src/triage.py");
  if (!again.includes("heuristic_v1_spike_edit")) {
    throw new Error("recovery failed");
  }
  if (!again.includes("CURVEBALL") && !(await provider3.readFile("docs/curveball.md")).includes("CURVEBALL")) {
    throw new Error("curveball file missing after recovery");
  }

  rmSync(work, { recursive: true, force: true });
  rmSync(work + "-restored", { recursive: true, force: true });
  rmSync(work + "-final", { recursive: true, force: true });

  console.log("RELAY_SPIKE_OK");
}

main().catch((err) => {
  console.error("RELAY_SPIKE_FAILED", err);
  process.exit(1);
});
