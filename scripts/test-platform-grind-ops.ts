/**
 * Platform grind — ops (OPS-01/03/04/06/07) + DEMO-05 backend isolation + E2E-16.
 * In-process tests over the real lib modules; no live services.
 * Run: npx tsx --conditions react-server scripts/test-platform-grind-ops.ts
 */
import {
  assertEvaluationAllowed,
  createMemoryFlagStore,
  isEvaluatorEnabled,
  isScenarioEnabled,
  setKillSwitch,
} from "../src/lib/ops/feature-flags";
import {
  checkCostCap,
  DEFAULT_ATTEMPT_COST_CAPS,
  ZERO_COST,
} from "../src/lib/ops/cost-caps";
import {
  createMemoryOperatorActionStore,
  performOperatorAction,
  validateOperatorAction,
  type OperatorActionInput,
} from "../src/lib/ops/recovery";
import {
  assertDemoMutationAllowed,
  assertDemoNamespace,
  sanitizeDemoConversion,
} from "../src/lib/ops/demo-isolation";
import { IdempotencyGuard, submissionIdempotencyKey } from "../src/lib/ops/idempotency";
import {
  correlationIdFromRequest,
  createLogger,
  newCorrelationId,
  redactSecrets,
} from "../src/lib/security/logger";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

async function main() {
function expectThrow(name: string, fn: () => void | Promise<void>, code?: string) {
  return (async () => {
    try {
      await fn();
    } catch (e) {
      const matches = code ? (e as { code?: string }).code === code : true;
      ok(name, matches, `wrong error: ${(e as Error).message}`);
      return;
    }
    ok(name, false, "did not throw");
  })();
}

// ---------------------------------------------------------------- OPS-01 ---
section("OPS-01 structured logging with correlation IDs + redaction");

{
  const lines: string[] = [];
  const logger = createLogger("billing/webhook", { sink: { write: (l) => lines.push(l) } });
  logger.info("event received", { eventId: "evt_1", stripe_secret: "sk_test_51H0123456789ABCDEFGHIJ", safe: 42 });
  const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
  ok("log line is structured JSON", typeof parsed.ts === "string" && parsed.scope === "billing/webhook" && parsed.level === "info");
  ok("log line carries correlation id", typeof parsed.correlationId === "string" && (parsed.correlationId as string).length > 8);
  ok("log line redacts secret values", !JSON.stringify(parsed).includes("sk_test_51H") && parsed.stripe_secret === "[REDACTED]");
  ok("log line preserves safe fields", parsed.safe === 42 && parsed.eventId === "evt_1");

  const child = logger.child("usage");
  child.warn("retrying", { attempt: 2 });
  const childParsed = JSON.parse(lines[1]) as Record<string, unknown>;
  ok("child logger propagates correlation id", childParsed.correlationId === parsed.correlationId);
  ok("child logger extends scope", childParsed.scope === "billing/webhook/usage");

  const id1 = newCorrelationId();
  const id2 = newCorrelationId();
  ok("correlation ids are unique", id1 !== id2);

  const withHeader = new Request("https://x.test/", { headers: { "x-correlation-id": "corr-abc-123" } });
  ok("correlation id reused from request header", correlationIdFromRequest(withHeader) === "corr-abc-123");
  const withoutHeader = new Request("https://x.test/");
  ok("correlation id minted when header missing", correlationIdFromRequest(withoutHeader).length > 8);
  const badHeader = new Request("https://x.test/", { headers: { "x-correlation-id": "bad id!!" } });
  ok("malformed header ignored", correlationIdFromRequest(badHeader) !== "bad id!!");

  ok("redactSecrets handles nested JWT", (() => {
    const out = redactSecrets({ deep: { arr: [`jwt=eyJhbGciOiJIUzI1NiJ9.${"a".repeat(40)}.${"b".repeat(40)}`] } }) as { deep: { arr: string[] } };
    return out.deep.arr[0].includes("[REDACTED]");
  })());
}

// ---------------------------------------------------------------- OPS-03 ---
section("OPS-03 operator recovery tools (actor + reason logged)");

{
  const store = createMemoryOperatorActionStore();
  const base: OperatorActionInput = {
    actorEmail: "operator@fydell.test",
    actorRoles: ["operator"],
    action: "retry_job",
    targetType: "evaluation_job",
    targetId: "job-123",
    reason: "job stalled on provider timeout; safe to retry",
  };
  ok("valid action passes validation", validateOperatorAction(base).ok);
  const record = await performOperatorAction(store, base);
  ok("action recorded with actor + reason", record.actorEmail === "operator@fydell.test" && record.reason.includes("stalled"));
  ok("action is auditable by target", (await store.listForTarget("evaluation_job", "job-123")).length === 1);

  const actions: OperatorActionInput["action"][] = ["extend_deadline", "quarantine_submission", "reissue_report", "credit_usage", "revoke_access", "restore_record"];
  for (const action of actions) {
    const input = { ...base, action, metadata: action === "credit_usage" ? { quantity: 2 } : {} };
    const rec = await performOperatorAction(store, input);
    ok(`operator action recorded: ${action}`, rec.action === action);
  }

  await expectThrow("missing reason rejected", () => performOperatorAction(store, { ...base, reason: "short" }));
  await expectThrow("missing actor rejected", () => performOperatorAction(store, { ...base, actorEmail: "not-an-email" }));
  await expectThrow("non-operator role rejected", () => performOperatorAction(store, { ...base, actorRoles: ["member"] }));
  await expectThrow(
    "external send without deliberate confirmation rejected",
    () => performOperatorAction(store, { ...base, action: "reissue_report", externalSend: true })
  );
  const confirmed = await performOperatorAction(store, {
    ...base,
    action: "reissue_report",
    externalSend: true,
    externalSendConfirmedBy: "operator@fydell.test",
    reason: "candidate requested corrected report by email",
  });
  ok("external send allowed with deliberate confirmation", confirmed.externalSendConfirmedBy === "operator@fydell.test");
  await expectThrow("credit without quantity rejected", () =>
    performOperatorAction(store, { ...base, action: "credit_usage", metadata: {} })
  );
}

// ---------------------------------------------------------------- OPS-04 ---
section("OPS-04 feature-flag kill switch");

{
  const store = createMemoryFlagStore();
  ok("evaluator enabled by default", isEvaluatorEnabled(store));
  ok("scenario enabled by default", isScenarioEnabled(store, "webhook-retry"));

  setKillSwitch(store, "evaluator", false, "oncall@fydell.test", "provider returning corrupt results");
  ok("evaluator kill switch disables", !isEvaluatorEnabled(store));
  ok("kill switch history records actor + reason", store.history("evaluator_enabled")[0]?.changedBy === "oncall@fydell.test");

  await expectThrow("evaluation held (not failed) when evaluator disabled", () => assertEvaluationAllowed(store, "webhook-retry"), "EVALUATOR_DISABLED");

  setKillSwitch(store, "evaluator", true, "oncall@fydell.test", "provider recovered; re-enabling");
  setKillSwitch(store, { scenarioId: "webhook-retry" }, false, "oncall@fydell.test", "scenario tests broken after deploy");
  ok("scenario gate disables one scenario", !isScenarioEnabled(store, "webhook-retry") && isScenarioEnabled(store, "other-scenario"));
  await expectThrow("evaluation held when scenario disabled", () => assertEvaluationAllowed(store, "webhook-retry"), "SCENARIO_DISABLED");
  ok("other scenarios unaffected", (() => { assertEvaluationAllowed(store, "other-scenario"); return true; })());

  await expectThrow("kill switch requires reason", () =>
    Promise.resolve(setKillSwitch(store, "evaluator", false, "x", "short"))
  );
}

// ---------------------------------------------------------------- OPS-06 ---
section("OPS-06 per-attempt cost caps");

{
  const caps = DEFAULT_ATTEMPT_COST_CAPS;
  const within = checkCostCap(ZERO_COST, { modelCalls: 10, computeMinutes: 5, storageMb: 100, emailsSent: 1 }, caps);
  ok("within caps allowed", within.allowed && within.exceeded.length === 0);

  const over = checkCostCap({ ...ZERO_COST, modelCalls: 39 }, { modelCalls: 5 }, caps);
  ok("over model-call cap blocked", !over.allowed && over.exceeded.includes("modelCalls"));

  const emailOver = checkCostCap(ZERO_COST, { emailsSent: 6 }, caps);
  ok("email cap blocks spam-shaped runs", !emailOver.allowed && emailOver.exceeded.includes("emailsSent"));

  const boundary = checkCostCap(ZERO_COST, { modelCalls: caps.maxModelCalls }, caps);
  ok("exactly at cap is allowed", boundary.allowed);
}

// ---------------------------------------------------------------- OPS-07 ---
section("OPS-07 recoverability: idempotent retries");

{
  const guard = new IdempotencyGuard<string>();
  let runs = 0;
  const key = submissionIdempotencyKey({ attemptId: "att-1", snapshotHash: "sha256:abc" });
  const first = await guard.run(key, async () => { runs += 1; return "accepted:receipt-1"; });
  const second = await guard.run(key, async () => { runs += 1; return "accepted:receipt-2"; });
  ok("first run executes", !first.duplicate && first.outcome === "accepted:receipt-1");
  ok("repeat returns original outcome (no duplicate submission)", second.duplicate && second.outcome === "accepted:receipt-1");
  ok("effect ran exactly once", runs === 1);
  ok("idempotency keys are deterministic", submissionIdempotencyKey({ attemptId: "att-1", snapshotHash: "sha256:abc" }) === key);
}

// ------------------------------------------------- DEMO-05 + E2E-16 --------
section("DEMO-05 demo isolation + E2E-16 anonymous demo -> signup");

{
  const demoCtx = { isDemo: true, namespace: "demo_public" };
  const liveCtx = { isDemo: false };

  await expectThrow("demo: real email blocked", () => assertDemoMutationAllowed("send_real_email", demoCtx));
  await expectThrow("demo: paid evaluation blocked", () => assertDemoMutationAllowed("paid_evaluation_job", demoCtx));
  await expectThrow("demo: charges blocked", () => assertDemoMutationAllowed("create_charge", demoCtx));
  await expectThrow("demo: live record writes blocked", () => assertDemoMutationAllowed("write_live_record", demoCtx));
  ok("demo: fixture reads allowed", (() => { assertDemoMutationAllowed("read_fixture", demoCtx); return true; })());
  ok("demo: namespace reset allowed", (() => { assertDemoMutationAllowed("reset_demo_namespace", demoCtx); return true; })());
  ok("live: mutations not demo-gated", (() => { assertDemoMutationAllowed("send_real_email", liveCtx); return true; })());

  await expectThrow("demo namespace must be demo_*", () => assertDemoNamespace("production"));
  await expectThrow("demo namespace required", () => assertDemoNamespace(undefined));
  ok("demo namespace accepted", (() => { assertDemoNamespace("demo_public"); return true; })());

  // E2E-16: anonymous visitor completes demo, then signs up. The new live
  // profile must not inherit fictional evidence.
  const demoArtifacts = { passport: { name: "Candidate01" }, report: { score: 87 }, thread: ["msg"] };
  const liveProfile = { userId: "user-new", email: "real@example.com" };
  const { profile, dropped } = sanitizeDemoConversion(liveProfile, demoArtifacts);
  ok("E2E-16: live profile keeps only real fields", !("passport" in profile) && profile.email === "real@example.com");
  ok("E2E-16: all demo artifacts dropped on conversion", dropped.length === 3);
}

console.log(`\n${failures === 0 ? "ALL OPS/DEMO TESTS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
