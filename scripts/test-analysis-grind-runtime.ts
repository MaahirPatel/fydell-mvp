/**
 * RUN-01..RUN-09 tests: independent evaluation runtime (in-process model).
 *
 *  RUN-01/02/03/05/08: sandbox spec validation + log redaction.
 *  RUN-04: sealed test bundles, path resolution, verdict-from-harness
 *          (candidate-printed summaries are never trusted).
 *  RUN-06: result classification incl. indeterminate (uncertainty surfaced).
 *  RUN-07: durable queue — idempotent run IDs, bounded retries, exhaustion,
 *          stale-worker recovery, idempotent completion.
 *  RUN-09: bounded-concurrency model — limit respected, worker crash recovered.
 *
 * What is NOT tested here: the real sandbox honoring the spec (NEEDS-LIVE).
 *
 * Run: npx tsx scripts/test-analysis-grind-runtime.ts
 */
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  DEFAULT_SANDBOX_SPEC,
  redactLog,
  validateSandboxSpec,
  type SandboxSpec,
} from "../src/lib/eval/sandboxConfig";
import { classifyRunOutcome } from "../src/lib/eval/classifier";
import {
  resolveTestPath,
  sealTestBundle,
  verdictFromHarness,
  verifyTestBundle,
} from "../src/lib/eval/isolation";
import { RunQueue } from "../src/lib/eval/queue";
import { runWithConcurrency } from "../src/lib/eval/concurrency";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ------------------------- RUN-01/02/03/05/08 ------------------------- */

check(
  "placeholder digest is flagged until deploy pins a real one",
  validateSandboxSpec(DEFAULT_SANDBOX_SPEC).some((v) => /pinned digest/.test(v)),
  "deploy must substitute the real image digest for PINNED_AT_DEPLOY_TIME",
);
const pinned: SandboxSpec = {
  ...DEFAULT_SANDBOX_SPEC,
  imageDigest:
    "registry.fydell.internal/runner@sha256:9f8e7d6c5b4a00112233445566778899aabbccddeeff00112233445566778899aa",
};
check("fully pinned spec is compliant", validateSandboxSpec(pinned).length === 0,
  JSON.stringify(validateSandboxSpec(pinned)));

const hostile: SandboxSpec = {
  ...DEFAULT_SANDBOX_SPEC,
  imageDigest: "runner:latest",
  hostMounts: ["/var/run/docker.sock", "/data"],
  dockerSocketMounted: true,
  credentialsInScope: "prod-db",
  allowNetworkEgress: true,
  invocation: { channel: "signed-harness", argv: [], resultSignature: "none" },
  artifacts: { ...DEFAULT_SANDBOX_SPEC.artifacts, wipeBetweenRuns: false, redactPatterns: [] },
};
const violations = validateSandboxSpec(hostile);
for (const id of ["RUN-01", "RUN-02", "RUN-03", "RUN-05", "RUN-08"]) {
  check(`hostile spec violates ${id}`, violations.some((v) => v.startsWith(id)), violations.join(" | "));
}
check("floating tag rejected", violations.some((v) => /pinned digest/.test(v)));

const egressNoAllowlist: SandboxSpec = {
  ...DEFAULT_SANDBOX_SPEC,
  allowNetworkEgress: true,
  allowedEgressHosts: [],
};
check(
  "egress without allowlist is rejected",
  validateSandboxSpec(egressNoAllowlist).some((v) => v.startsWith("RUN-02")),
);

// Log redaction: secrets scrubbed, size bounded.
const redacted = redactLog(
  "api_key: sk-live-SECRET123\n-----BEGIN RSA PRIVATE KEY-----\nok line",
  DEFAULT_SANDBOX_SPEC,
);
check("secret is redacted", !redacted.includes("SECRET123") && redacted.includes("[REDACTED]"));
check("private key is redacted", !redacted.includes("BEGIN RSA PRIVATE KEY"));
const long = redactLog("x".repeat(1_000_000), DEFAULT_SANDBOX_SPEC);
check(
  "log is size-bounded",
  Buffer.byteLength(long, "utf8") <= DEFAULT_SANDBOX_SPEC.artifacts.maxLogBytes + 100,
);

/* -------------------------------- RUN-04 ------------------------------ */

const bundle = sealTestBundle("suite-v3", [
  { path: "tests/test_merge.py", content: "def test_x():\n    assert True\n" },
]);
check("sealed bundle verifies", verifyTestBundle(bundle) === null);

const tampered = { ...bundle, files: [{ path: "tests/test_merge.py", content: "def test_x():\n    assert False\n" }] };
check("tampered bundle fails verification", verifyTestBundle(tampered) !== null);

check("valid test path resolves", resolveTestPath(bundle, "tests/test_merge.py") === "tests/test_merge.py");
for (const evil of ["../secret.py", "/etc/passwd", "tests/../../x.py"]) {
  let threw = false;
  try {
    resolveTestPath(bundle, evil);
  } catch {
    threw = true;
  }
  check(`hostile test path rejected: ${evil}`, threw);
}
let unknownThrew = false;
try {
  resolveTestPath(bundle, "tests/not_in_bundle.py");
} catch {
  unknownThrew = true;
}
check("path outside the bundle is rejected", unknownThrew);

// The verdict comes from harness signals, never candidate-printed text.
const lie = verdictFromHarness({ exitCode: 1, timedOut: false, stdout: "ALL TESTS PASSED (12/12)\n" });
check("printed 'ALL TESTS PASSED' with exit 1 is still failed", lie.verdict === "failed");
check("ignored candidate summary is reported", lie.ignoredCandidateSummary === true);
const clean = verdictFromHarness({ exitCode: 0, timedOut: false, stdout: "ok\n" });
check("exit 0 with no timeout is passed", clean.verdict === "passed" && !clean.ignoredCandidateSummary);

/* -------------------------------- RUN-06 ------------------------------ */

const c = (s: Parameters<typeof classifyRunOutcome>[0]) => classifyRunOutcome(s);
check(
  "test failure classified",
  c({ phase: "test", exitCode: 1, timedOut: false, testsStarted: true, harnessError: false, platformHealthy: true }).classification === "test_failure",
);
check(
  "code crash classified as code_error",
  c({ phase: "test", signal: "SIGSEGV", timedOut: false, testsStarted: true, harnessError: false, platformHealthy: true }).classification === "code_error",
);
check(
  "wall-clock kill after tests start is timeout",
  c({ phase: "test", timedOut: true, testsStarted: true, harnessError: false, platformHealthy: true }).classification === "timeout",
);
check(
  "setup exit before tests is setup_incompatibility",
  c({ phase: "setup", exitCode: 2, timedOut: false, testsStarted: false, harnessError: false, platformHealthy: true }).classification === "setup_incompatibility",
);
const outage = c({ phase: "test", timedOut: false, testsStarted: false, harnessError: true, platformHealthy: false });
check("platform outage classified and not candidate fault", outage.classification === "platform_outage" && outage.notCandidateFault);
check(
  "harness error on healthy platform is indeterminate, not candidate fault",
  (() => {
    const r = c({ phase: "unknown", timedOut: false, testsStarted: false, harnessError: true, platformHealthy: true });
    return r.classification === "indeterminate" && r.notCandidateFault;
  })(),
);
check(
  "timeout before tests start is indeterminate, not a skill failure",
  c({ phase: "setup", timedOut: true, testsStarted: false, harnessError: false, platformHealthy: true }).classification === "indeterminate",
);

/* -------------------------------- RUN-07 ------------------------------ */

const dir = mkdtempSync(join(tmpdir(), "runqueue-"));
const q = new RunQueue({ dataDir: dir, workerTimeoutMs: 1000 });

const e1 = q.enqueue("run-1", { candidate: "a" });
const e2 = q.enqueue("run-1", { candidate: "a" });
check("idempotent enqueue: same runId, not duplicated", !e2.created && e1.job === e2.job);
check("double enqueue keeps one job", q.counts().queued === 1);

const claimed = q.claim("w-1")!;
check("worker claims the job", claimed.runId === "run-1" && claimed.status === "running" && claimed.attempts === 1);
check("second claim gets nothing", q.claim("w-2") === null);
q.heartbeat("run-1");

// Transient failure retries with backoff, bounded.
const t0 = Date.now();
q.failTransient("run-1", "boom", t0);
const afterFail = q.get("run-1")!;
check("transient failure requeues with backoff", afterFail.status === "failed_transient" && !!afterFail.nextRetryAt);
check("backoff is in the future", Date.parse(afterFail.nextRetryAt!) > t0);
check("not claimable before backoff", q.claim("w-2", t0) === null);
const retried = q.claim("w-2", t0 + 120_000)!;
check("claimable after backoff", retried.runId === "run-1" && retried.attempts === 2);

// Exhaustion is explicit and terminal.
q.failTransient("run-1", "boom", t0 + 120_000); // attempt 2 of maxAttempts... default 3
q.claim("w-3", t0 + 300_000);
q.failTransient("run-1", "boom", t0 + 300_000); // attempt 3
const exhausted = q.get("run-1")!;
check("retries are bounded: exhausted after maxAttempts", exhausted.status === "exhausted");
check("exhausted job is not re-claimed", q.claim("w-9", t0 + 600_000) === null);

// Stale worker recovery.
q.enqueue("run-2", {}, 3);
q.claim("w-1", t0);
const stale = q.requeueStaleWorkers(t0 + 5000);
check("stale worker detected and requeued", stale.includes("run-2"));
const reclaimed = q.claim("w-2", t0 + 5000)!;
check("requeued job is claimable", reclaimed.runId === "run-2");

// Idempotent completion.
q.complete("run-2", { ok: true });
const again = q.complete("run-2", { ok: true });
check("duplicate completion is a no-op", again.status === "succeeded");

// Durability: a new instance over the same dir sees the jobs.
const q2 = new RunQueue({ dataDir: dir, workerTimeoutMs: 1000 });
check("queue state survives process restart", q2.get("run-1")?.status === "exhausted" && q2.get("run-2")?.status === "succeeded");

/* -------------------------------- RUN-09 ------------------------------ */

async function main(): Promise<void> {
const dir2 = mkdtempSync(join(tmpdir(), "runqueue-c-"));
const qc = new RunQueue({ dataDir: dir2, workerTimeoutMs: 300 });
const ids = Array.from({ length: 9 }, (_, i) => `c-${i}`).concat(["c-hung"]);
for (const id of ids) qc.enqueue(id, {}, 3);

let inFlight = 0;
let maxInFlight = 0;
const report = await runWithConcurrency({
  queue: qc,
  runIds: ids,
  limit: 3,
  work: async (runId, attempt, heartbeat) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      const n = attempt; // 1-based attempt number from the queue
      if (runId === "c-hung" && n === 1) {
        // Simulate a crashed worker: hang forever, never heartbeat.
        await new Promise(() => {});
      }
      heartbeat();
      await new Promise((r) => setTimeout(r, 20));
      heartbeat();
      if (runId === "c-3" && n === 1) throw new Error("transient wobble");
      return { ok: true };
    } finally {
      inFlight -= 1;
    }
  },
});
check("concurrency limit respected", report.limitRespected && report.maxObservedConcurrency <= 3, `max=${report.maxObservedConcurrency}`);
check("all jobs completed (retries + crash recovery)", report.completed === 10, `completed=${report.completed}`);
check("crashed worker was detected and recovered", report.staleRecovered.includes("c-hung"), report.staleRecovered.join(","));
check("queue model agrees", qc.counts().succeeded === 10);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
