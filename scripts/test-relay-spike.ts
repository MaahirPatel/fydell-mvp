/**
 * Milestone 1 gate: Relay technical spike acceptance — Checkpoint A failure matrix.
 *
 * Proves, end to end, against the real ExecutionProvider contract (no mocks):
 *   1. load repo (multi-file scenario incl. router/service/prompts/telemetry)
 *   2. edit multiple files
 *   3. persist across a simulated "refresh" (snapshot -> terminate -> restore)
 *   4. run allowlisted tests, capturing stdout/stderr/exitCode/durationMs
 *   5. run evaluations (case-based + golden-set accuracy/macro-F1)
 *   6. deterministic preview (not a fake FastAPI server)
 *   7. an unsupported command returns an honest allowlist error, not a silent no-op
 *   8. a curveball file drop mid-session
 *   9. immutable submission snapshots + duplicate-submit rejection by content hash
 *  10. terminate and recover from the final snapshot
 *
 * Writes results + perf budgets to docs/checkpoint-a-runtime.md.
 *
 * Run: npx tsx scripts/test-relay-spike.ts
 */
import { createHash } from "crypto";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import {
  NodeTestExecutionProvider,
  loadScenarioSeedFiles,
} from "../src/lib/relay/node-test-provider";
import type { Snapshot } from "../src/lib/relay/execution-provider";
import { RELAY_PERF_BUDGETS } from "../src/lib/fde/flags";

interface MatrixRow {
  name: string;
  ok: boolean;
  detail: string;
  durationMs: number;
}

const matrix: MatrixRow[] = [];

async function step(name: string, fn: () => Promise<string>): Promise<void> {
  const started = Date.now();
  try {
    const detail = await fn();
    matrix.push({ name, ok: true, detail, durationMs: Date.now() - started });
    console.log(`PASS ${name}: ${detail}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    matrix.push({ name, ok: false, detail, durationMs: Date.now() - started });
    console.error(`FAIL ${name}: ${detail}`);
    throw err;
  }
}

function hashSnapshot(files: Record<string, string>): string {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}

/** Simulates the backend's "one accepted submission per content hash" rule. */
function makeSubmissionLedger() {
  const seen = new Set<string>();
  return {
    trySubmit(hash: string): boolean {
      if (seen.has(hash)) return false;
      seen.add(hash);
      return true;
    },
  };
}

async function main() {
  const scenarioRoot = resolve(process.cwd(), "scenarios/project-relay");
  const work = mkdtempSync(join(tmpdir(), "relay-spike-"));
  const cleanupDirs = [work];

  const seed = loadScenarioSeedFiles(scenarioRoot);
  let provider = new NodeTestExecutionProvider(scenarioRoot, work);

  await step("initialize_session", async () => {
    await provider.initializeSession(seed);
    const files = await provider.listFiles();
    for (const required of ["src/triage.py", "src/policy.py", "src/router.py", "src/service.py", "src/prompts.py", "src/telemetry.py"]) {
      if (!files.includes(required)) throw new Error(`missing ${required}`);
    }
    return `${files.length} files seeded`;
  });

  await step("edit_multi_file", async () => {
    const triage = (await provider.readFile("src/triage.py")).replace(
      '"reason": "heuristic_v1",',
      '"reason": "heuristic_v1_spike_edit",'
    );
    await provider.writeFile("src/triage.py", triage);

    const router = (await provider.readFile("src/router.py")).replace(
      "CONFIDENCE_ESCALATION_THRESHOLD = 0.6",
      "CONFIDENCE_ESCALATION_THRESHOLD = 0.6  # spike_edit_marker"
    );
    await provider.writeFile("src/router.py", router);
    return "edited src/triage.py and src/router.py";
  });

  await step("persist_across_refresh", async () => {
    const mid = await provider.snapshot("mid-edit");
    await provider.terminate();

    const restoredDir = work + "-restored";
    cleanupDirs.push(restoredDir);
    const restored = new NodeTestExecutionProvider(scenarioRoot, restoredDir);
    await restored.restore(mid);

    const triage = await restored.readFile("src/triage.py");
    const router = await restored.readFile("src/router.py");
    if (!triage.includes("heuristic_v1_spike_edit")) {
      throw new Error("triage.py edit did not survive snapshot/restore");
    }
    if (!router.includes("spike_edit_marker")) {
      throw new Error("router.py edit did not survive snapshot/restore");
    }
    provider = restored;
    return "both file edits survived snapshot -> terminate -> restore";
  });

  await step("run_tests_captured", async () => {
    const tests = await provider.runTests();
    if (typeof tests.stdout !== "string" || typeof tests.stderr !== "string") {
      throw new Error("test result missing stdout/stderr strings");
    }
    if (typeof tests.exitCode !== "number" || typeof tests.durationMs !== "number") {
      throw new Error("test result missing exitCode/durationMs numbers");
    }
    if (!tests.ok) {
      throw new Error(`tests failed: exit=${tests.exitCode} stderr=${tests.stderr.slice(0, 300)}`);
    }
    return `exit=${tests.exitCode} durationMs=${tests.durationMs} stdout="${tests.stdout.trim().slice(0, 80)}"`;
  });

  await step("run_evaluations", async () => {
    const evals = await provider.runEvaluations();
    if (!evals.ok) {
      throw new Error(`evals failed: exit=${evals.exitCode} stderr=${evals.stderr.slice(0, 300)}`);
    }
    return `exit=${evals.exitCode} durationMs=${evals.durationMs}`;
  });

  await step("preview_deterministic", async () => {
    const preview = await provider.runCommand("preview");
    if (!preview.ok) throw new Error(`preview failed: ${preview.stderr.slice(0, 300)}`);
    return "deterministic request/response preview succeeded (not a live FastAPI server)";
  });

  await step("unsupported_command_honest_error", async () => {
    const result = await provider.runCommand("rm -rf /");
    if (result.ok) throw new Error("unsupported command was not rejected");
    if (result.exitCode !== 127) throw new Error(`expected exitCode 127, got ${result.exitCode}`);
    if (!result.stderr.toLowerCase().includes("not allowed")) {
      throw new Error(`expected an honest allowlist error, got: ${result.stderr}`);
    }
    return `rejected with exit=127 stderr="${result.stderr}"`;
  });

  await step("curveball_file_drop", async () => {
    await provider.writeFile(
      "docs/curveball.md",
      "CURVEBALL: model API rate limiting and latency spike. Revise plan and recommendation."
    );
    const back = await provider.readFile("docs/curveball.md");
    if (!back.includes("CURVEBALL")) throw new Error("curveball file did not persist");
    return "curveball file dropped mid-session";
  });

  let finalSnapshot: Snapshot | null = null;
  await step("immutable_snapshot_and_duplicate_submit", async () => {
    const ledger = makeSubmissionLedger();

    const submission1 = await provider.snapshot("submission");
    const frozenJson = JSON.stringify(submission1.files);
    const hash1 = hashSnapshot(submission1.files);

    const firstAccepted = ledger.trySubmit(hash1);
    if (!firstAccepted) throw new Error("first submission should be accepted");

    // Second submit attempt with an unchanged workspace — same content hash.
    const submission2 = await provider.snapshot("submission-retry");
    const hash2 = hashSnapshot(submission2.files);
    if (hash1 !== hash2) throw new Error("expected identical hash for an unchanged workspace");

    const secondAccepted = ledger.trySubmit(hash2);
    if (secondAccepted) throw new Error("duplicate submission with the same content hash was accepted");

    // Tamper the live workspace after snapshotting — snapshot must not change.
    await provider.writeFile("src/triage.py", "# tamper after submit\n");
    if (JSON.stringify(submission1.files) !== frozenJson) {
      throw new Error("snapshot object mutated after being taken");
    }
    if (submission1.files["src/triage.py"].includes("tamper")) {
      throw new Error("snapshot not immutable relative to later writes");
    }

    finalSnapshot = submission1;
    return `submission accepted once (hash ${hash1.slice(0, 12)}…), duplicate rejected, snapshot immutable`;
  });

  await step("terminate_and_recover", async () => {
    await provider.terminate();
    const finalDir = work + "-final";
    cleanupDirs.push(finalDir);
    const recovered = new NodeTestExecutionProvider(scenarioRoot, finalDir);
    if (!finalSnapshot) throw new Error("no snapshot to recover from");
    await recovered.restore(finalSnapshot);

    const triage = await recovered.readFile("src/triage.py");
    if (!triage.includes("heuristic_v1_spike_edit")) {
      throw new Error("recovery lost the earlier edit");
    }
    const curveball = await recovered.readFile("docs/curveball.md");
    if (!curveball.includes("CURVEBALL")) {
      throw new Error("recovery lost the curveball file");
    }
    return "recovered edit + curveball file after terminate";
  });

  for (const dir of cleanupDirs) {
    rmSync(dir, { recursive: true, force: true });
  }

  writeRuntimeReport();
  console.log("RELAY_SPIKE_OK");
}

function writeRuntimeReport(): void {
  const outPath = resolve(process.cwd(), "docs/checkpoint-a-runtime.md");
  mkdirSync(dirname(outPath), { recursive: true });

  const budgetRows = Object.entries(RELAY_PERF_BUDGETS)
    .map(([key, value]) => `| \`${key}\` | ${value}ms |`)
    .join("\n");

  const matrixRows = matrix
    .map((row) => `| ${row.name} | ${row.ok ? "PASS" : "FAIL"} | ${row.durationMs}ms | ${row.detail.replace(/\|/g, "\\|")} |`)
    .join("\n");

  const allOk = matrix.every((r) => r.ok);

  const content = `# Checkpoint A — Runtime proof

Generated by \`npm run test:relay-spike\` (\`scripts/test-relay-spike.ts\`) against the real
\`NodeTestExecutionProvider\` — no mocks. Regenerate this file by re-running that script.

Overall result: **${allOk ? "RELAY_SPIKE_OK" : "FAILED"}**

Generated at: ${new Date().toISOString()}

## Performance budgets (\`RELAY_PERF_BUDGETS\`)

Targets for the browser workspace (Pyodide + Monaco), not enforced by this Node-side spike.

| Budget | Value |
| --- | --- |
${budgetRows}

## Failure matrix

| Scenario | Result | Duration | Detail |
| --- | --- | --- | --- |
${matrixRows}
`;

  writeFileSync(outPath, content, "utf8");
  console.log(`wrote ${outPath}`);
}

main().catch((err) => {
  writeRuntimeReport();
  console.error("RELAY_SPIKE_FAILED", err);
  process.exit(1);
});
