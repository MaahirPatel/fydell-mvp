/**
 * Engineering run orchestration (RUN-07, DESK-13, SEC-08, UP-08) with an
 * in-memory store and a fake provider. No Python, network or database.
 *
 * Run: npx tsx --conditions react-server scripts/test-engineering-runs.ts
 */
import { loadTrustedMaterial } from "../src/lib/engineering/descriptor";
import { ABANDON_GRACE_MS, RATE_LIMIT, RunRefused, runEvaluation, runPractice } from "../src/lib/engineering/run";
import { createMemoryTestRunStore } from "../src/lib/engineering/store";
import { engineeringBillingState } from "../src/lib/engineering/billing";
import { buildScenarioPackage } from "../src/lib/simulations/scenario-package";
import type { ExecutionProvider, ProviderRequest, ProviderResult } from "../src/lib/engineering/types";

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

const material = loadTrustedMaterial("webhook-retry-incident");
const files = buildScenarioPackage("webhook-retry-incident").files;
const canary = material.descriptor.canary;

function fakeProvider(outcome: Partial<ProviderResult> | ((req: ProviderRequest) => Partial<ProviderResult>)) {
  const calls: ProviderRequest[] = [];
  const provider: ExecutionProvider & { calls: ProviderRequest[] } = {
    id: "fake",
    calls,
    async run(req) {
      calls.push(req);
      const o = typeof outcome === "function" ? outcome(req) : outcome;
      return {
        provider: "fake",
        environmentVersion: "fake-env",
        exitCode: 1,
        timedOut: false,
        output: "",
        outputTruncated: false,
        junitXml: null,
        infrastructureError: null,
        ...o,
      };
    },
  };
  return provider;
}

const practiceXml = `<testsuites><testsuite>
<testcase name="test_successful_delivery_is_marked_delivered" file="tests/test_dispatcher.py" />
<testcase name="test_gone_endpoint_is_not_retried" file="tests/test_dispatcher.py"><failure message="assert 8 == 1">x</failure></testcase>
</testsuite></testsuites>`;

async function main() {
  // ---------------------------------------------------------------- practice
  {
    const store = createMemoryTestRunStore();
    const provider = fakeProvider({ junitXml: practiceXml });
    const deps = { store, provider, material };
    const a = await runPractice(deps, { sessionId: "s1", userId: "u1", clientRunId: "click-00000001", files });
    check("practice run completes", a.result?.status === "completed");
    check("practice result is bound to the snapshot hash", /^[a-f0-9]{64}$/.test(a.result?.candidateSnapshotHash ?? ""));
    const b = await runPractice(deps, { sessionId: "s1", userId: "u1", clientRunId: "click-00000001", files });
    check("same client run id -> same run, no second execution", b.reused && b.runId === a.runId && provider.calls.length === 1);
    const c = await runPractice(deps, { sessionId: "s1", userId: "u1", clientRunId: "click-00000002", files });
    check("a new click runs again", !c.reused && provider.calls.length === 2);
    check("provider receives the pinned timeout and output bound", provider.calls[0].timeoutSeconds === material.descriptor.runtime.timeoutSeconds && provider.calls[0].maxOutputBytes === material.descriptor.runtime.maxOutputBytes);
  }

  // In-progress refusal and abandonment.
  {
    const store = createMemoryTestRunStore();
    const provider = fakeProvider({ junitXml: practiceXml });
    await store.insert({
      sessionId: "s2", kind: "practice", clientRunId: "stuck-000001", submissionId: null,
      candidateSnapshotHash: "a".repeat(64), scenarioId: "webhook-retry-incident", scenarioVersion: "1.0.0",
      suiteVersion: material.descriptor.suiteVersion, requestedBy: "u2",
    });
    let refused: unknown = null;
    try {
      await runPractice({ store, provider, material }, { sessionId: "s2", userId: "u2", clientRunId: null, files });
    } catch (err) {
      refused = err;
    }
    check("a second run while one is in progress is refused", refused instanceof RunRefused && refused.code === "RUN_IN_PROGRESS");
    const later = Date.now() + material.descriptor.runtime.timeoutSeconds * 1000 + ABANDON_GRACE_MS + 1000;
    const r = await runPractice({ store, provider, material, now: () => later }, { sessionId: "s2", userId: "u2", clientRunId: null, files });
    check("a run stuck past its deadline is abandoned, not blocking forever", r.result?.status === "completed" && store.rows[0].status === "infrastructure_error");
  }

  // Rate limit.
  {
    const store = createMemoryTestRunStore();
    const provider = fakeProvider({ junitXml: practiceXml });
    for (let i = 0; i < RATE_LIMIT; i++) {
      await runPractice({ store, provider, material }, { sessionId: "s3", userId: "u3", clientRunId: null, files });
    }
    let refused: unknown = null;
    try {
      await runPractice({ store, provider, material }, { sessionId: "s3", userId: "u3", clientRunId: null, files });
    } catch (err) {
      refused = err;
    }
    check(`run ${RATE_LIMIT + 1} within the window is rate limited`, refused instanceof RunRefused && refused.code === "RATE_LIMITED");
    const other = await runPractice({ store, provider, material }, { sessionId: "s4", userId: "u4", clientRunId: null, files });
    check("the limit is per attempt", other.result?.status === "completed");
  }

  // Not configured: truthful, recorded, nothing executed.
  {
    const store = createMemoryTestRunStore();
    const r = await runPractice({ store, provider: null, material }, { sessionId: "s5", userId: "u5", clientRunId: null, files });
    check("no provider -> not_configured, never a fake pass", r.result?.status === "not_configured" && r.result.tests.length === 0);
    check("not_configured says the work is saved and nothing was evaluated", /nothing about your code was evaluated/.test(r.result?.statusReason ?? ""));
  }

  // Infrastructure failure is not a candidate failure.
  {
    const store = createMemoryTestRunStore();
    const provider = fakeProvider({ infrastructureError: "sandbox quota exceeded" });
    const r = await runPractice({ store, provider, material }, { sessionId: "s6", userId: "u6", clientRunId: null, files });
    check("infra failure recorded as infrastructure_error", r.result?.status === "infrastructure_error" && store.rows[0].status === "infrastructure_error");
  }

  // -------------------------------------------------------------- evaluation
  {
    const allTests = material.descriptor.groups.flatMap((g) => g.tests.map((t) => (t.endsWith("::") ? `${t}test_x` : t)));
    const evalXml =
      "<testsuites><testsuite>" +
      allTests.map((t) => `<testcase name="${t.split("::")[1]}" file="${t.split("::")[0]}" />`).join("") +
      `<testcase name="${canary.split("::")[1]}" file="${canary.split("::")[0]}"><failure message="canary">x</failure></testcase>` +
      "</testsuite></testsuites>";
    const store = createMemoryTestRunStore();
    const provider = fakeProvider((req) => {
      const hiddenMounted = Object.keys(req.files).some((p) => p.startsWith("tests/hidden/test_"));
      return { junitXml: hiddenMounted ? evalXml : null };
    });
    const deps = { store, provider, material };
    const args = { sessionId: "s7", submissionId: "sub-7", files, updatePresented: () => true };
    const first = await runEvaluation(deps, args);
    check("evaluation mounts hidden tests and completes", first.result?.status === "completed" && first.result.groups.every((g) => g.status === "pass"));
    const again = await runEvaluation(deps, args);
    check("evaluation retry reuses the result (no duplicate run or usage)", again.reused && again.runId === first.runId && provider.calls.length === 1);
    const notPresented = await runEvaluation(
      { store: createMemoryTestRunStore(), provider, material },
      { ...args, updatePresented: () => false }
    );
    check(
      "update group is not scored when the update was never presented",
      notPresented.result?.groups.find((g) => g.id === "requirement_update")?.status === "not_applicable"
    );
  }

  {
    const store = createMemoryTestRunStore();
    const failing = fakeProvider({ infrastructureError: "runner down" });
    const args = { sessionId: "s8", submissionId: "sub-8", files, updatePresented: () => true };
    const first = await runEvaluation({ store, provider: failing, material }, args);
    check("evaluation infra failure is recorded", first.result?.status === "infrastructure_error");
    const recovered = fakeProvider({ junitXml: "<testsuites/>" });
    const second = await runEvaluation({ store, provider: recovered, material }, args);
    check("after an infra failure, a retry actually runs again", !second.reused && recovered.calls.length === 1);
  }

  {
    const store = createMemoryTestRunStore();
    const args = { sessionId: "s9", submissionId: "sub-9", files, updatePresented: () => true };
    const a = await runEvaluation({ store, provider: null, material }, args);
    const b = await runEvaluation({ store, provider: null, material }, args);
    check("not_configured evaluation is recorded once per snapshot", a.result?.status === "not_configured" && b.reused && store.rows.length === 1);
  }

  // ------------------------------------------------------------ billing gate
  check("no evaluation yet -> usage held", engineeringBillingState([]) === "hold");
  check("only infra failures / not configured -> usage held", engineeringBillingState(["infrastructure_error", "not_configured"]) === "hold");
  check("a completed evaluation -> billable", engineeringBillingState(["infrastructure_error", "completed"]) === "billable");
  check("indeterminate (tests ran, needs review) -> billable", engineeringBillingState(["indeterminate"]) === "billable");
  check("still running -> held", engineeringBillingState(["running"]) === "hold");

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
