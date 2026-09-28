/**
 * Platform grind — billing (BILL-01..09) + E2E-14 payment journey.
 * In-process tests with fabricated-but-structurally-valid Stripe events signed
 * with a TEST webhook secret. No live Stripe, no real charges.
 * Run: npx tsx --conditions react-server scripts/test-platform-grind-billing.ts
 */
import { createHmac } from "node:crypto";
import type Stripe from "stripe";

import { verifyStripeSignature, processWebhookEvent, type WebhookDeps } from "../src/lib/billing/webhook";
import {
  checkoutLineItems,
  isBillingPlan,
  planFromPriceIds,
  type BillingConfig,
  type BillingPlan,
} from "../src/lib/billing/stripe";
import {
  createMemoryLedgerStore,
  grantCredit,
  grantEntitlement,
  ledgerSummary,
  recordRetryWithoutDoubleCharge,
  recordUsage,
} from "../src/lib/billing/ledger";

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
// Test-only secrets. Never real; never leave this file.
const TEST_WEBHOOK_SECRET = "whsec_test_fydell_platform_grind_0123456789abcdef";
const WRONG_SECRET = "whsec_test_wrong_secret_ffffffffffffffffffffffff";

const config: BillingConfig = {
  secretKey: "sk_test_FAKE_do_not_use_0123456789",
  webhookSecret: TEST_WEBHOOK_SECRET,
  prices: {
    starterUsage: "price_FAKE_starter_usage",
    teamBase: "price_FAKE_team_base",
    teamUsage: "price_FAKE_team_usage",
  },
};

function signPayload(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

function stripeEvent(partial: {
  id: string;
  type: string;
  object: Record<string, unknown>;
}): { event: Stripe.Event; payload: string; header: string } {
  const payload = JSON.stringify({ id: partial.id, object: "event", type: partial.type, data: { object: partial.object } });
  return { event: JSON.parse(payload) as Stripe.Event, payload, header: signPayload(payload, TEST_WEBHOOK_SECRET) };
}

function subscriptionObject(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "sub_FAKE_123",
    object: "subscription",
    customer: "cus_FAKE_org1",
    status: "active",
    start_date: 1_700_000_000,
    items: {
      object: "list",
      data: [{ id: "si_FAKE", price: { id: config.prices.teamBase }, current_period_end: 1_730_000_000 }],
    },
    ...over,
  };
}

// ---------------------------------------------------------------- BILL-03 ---
section("BILL-03 webhook signature verification (real SDK path, test secret)");

{
  const { payload, header } = stripeEvent({ id: "evt_test_1", type: "customer.subscription.created", object: subscriptionObject() });
  const verified = verifyStripeSignature(payload, header, TEST_WEBHOOK_SECRET);
  ok("valid signature verifies", verified.id === "evt_test_1" && verified.type === "customer.subscription.created");

  let wrongSecretThrows = false;
  try {
    verifyStripeSignature(payload, header, WRONG_SECRET);
  } catch {
    wrongSecretThrows = true;
  }
  ok("wrong secret rejected", wrongSecretThrows);

  let tamperedThrows = false;
  try {
    verifyStripeSignature(payload.replace("evt_test_1", "evt_test_2"), header, TEST_WEBHOOK_SECRET);
  } catch {
    tamperedThrows = true;
  }
  ok("tampered payload rejected", tamperedThrows);

  let staleThrows = false;
  try {
    const oldHeader = signPayload(payload, TEST_WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 600);
    verifyStripeSignature(payload, oldHeader, TEST_WEBHOOK_SECRET);
  } catch {
    staleThrows = true;
  }
  ok("stale timestamp rejected by SDK tolerance", staleThrows);
}

// ------------------------------------------------- BILL-04/07 + E2E-14 ------
section("BILL-04 idempotent events + BILL-07 payment lifecycle (E2E-14)");

interface FakeOrgBilling {
  customerId: string;
  subscriptionId: string | null;
  plan: BillingPlan | null;
  status: string | null;
  syncCalls: number;
}

function makeDeps(): { deps: WebhookDeps; seen: Map<string, string>; orgs: Map<string, FakeOrgBilling>; usage: string[]; failed: string[]; refunds: { chargeId: string; amountCents: number }[] } {
  const seen = new Map<string, string>();
  const orgs = new Map<string, FakeOrgBilling>();
  const usage: string[] = [];
  const failed: string[] = [];
  const refunds: { chargeId: string; amountCents: number }[] = [];
  const deps: WebhookDeps = {
    config,
    async hasProcessed(eventId) {
      return seen.has(eventId);
    },
    async markProcessed(eventId, _type, result) {
      seen.set(eventId, result);
    },
    async syncSubscription(subscription) {
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const priceIds = subscription.items.data.map((i) => i.price.id);
      const plan = planFromPriceIds(priceIds, config);
      const existing = orgs.get(customerId) ?? { customerId, subscriptionId: null, plan: null, status: null, syncCalls: 0 };
      existing.subscriptionId = subscription.id;
      existing.plan = plan;
      existing.status = subscription.status;
      existing.syncCalls += 1;
      orgs.set(customerId, existing);
    },
    async retrieveSubscription() {
      throw new Error("not used in these tests");
    },
    async reportUsage(_cfg, customerId) {
      usage.push(customerId);
    },
    async onPaymentFailed(customerId, invoiceId) {
      failed.push(`${customerId}:${invoiceId}`);
    },
    async onRefund(chargeId, amountCents) {
      refunds.push({ chargeId, amountCents });
    },
  };
  return { deps, seen, orgs, usage, failed, refunds };
}

{
  const { deps, seen, orgs } = makeDeps();
  const { event } = stripeEvent({ id: "evt_dup_1", type: "customer.subscription.created", object: subscriptionObject() });

  const first = await processWebhookEvent(event, deps);
  const second = await processWebhookEvent(event, deps);
  ok("first delivery applied", first === "applied");
  ok("duplicate delivery detected", second === "duplicate");
  ok("duplicate not applied twice", orgs.get("cus_FAKE_org1")?.syncCalls === 1);
  ok("event log records both", seen.get("evt_dup_1") === "duplicate");
}

{
  // Out-of-order: updated arrives before created. Each event is an authoritative
  // snapshot; final state reconciles to the last-applied event.
  const { deps, orgs } = makeDeps();
  const updated = stripeEvent({
    id: "evt_ooo_2",
    type: "customer.subscription.updated",
    object: subscriptionObject({ status: "past_due" }),
  });
  const created = stripeEvent({
    id: "evt_ooo_1",
    type: "customer.subscription.created",
    object: subscriptionObject({ status: "active" }),
  });
  ok("out-of-order updated applied", (await processWebhookEvent(updated.event, deps)) === "applied");
  ok("late created still applied (reconciles)", (await processWebhookEvent(created.event, deps)) === "applied");
  ok("final state reflects last applied event", orgs.get("cus_FAKE_org1")?.status === "active");
}

{
  // Full payment lifecycle: success -> failure (no entitlement change) ->
  // canceled checkout (expired, no fulfillment) -> refund -> repeat (no double).
  const { deps, orgs, failed, refunds } = makeDeps();

  const created = stripeEvent({ id: "evt_lc_1", type: "customer.subscription.created", object: subscriptionObject({ status: "active" }) });
  ok("lifecycle: subscription created applied", (await processWebhookEvent(created.event, deps)) === "applied");
  ok("lifecycle: entitlement granted", orgs.get("cus_FAKE_org1")?.plan === "team");

  const payFailed = stripeEvent({
    id: "evt_lc_2",
    type: "invoice.payment_failed",
    object: { id: "in_FAKE_1", object: "invoice", customer: "cus_FAKE_org1" },
  });
  ok("lifecycle: payment_failed applied", (await processWebhookEvent(payFailed.event, deps)) === "applied");
  ok("lifecycle: failure recorded without touching entitlement", failed.length === 1 && orgs.get("cus_FAKE_org1")?.plan === "team");

  const expired = stripeEvent({
    id: "evt_lc_3",
    type: "checkout.session.expired",
    object: { id: "cs_FAKE_1", object: "checkout.session", mode: "subscription" },
  });
  ok("lifecycle: canceled/expired checkout ignored", (await processWebhookEvent(expired.event, deps)) === "ignored");

  const refunded = stripeEvent({
    id: "evt_lc_4",
    type: "charge.refunded",
    object: { id: "ch_FAKE_1", object: "charge", amount: 5000, amount_refunded: 5000 },
  });
  ok("lifecycle: refund applied", (await processWebhookEvent(refunded.event, deps)) === "applied");
  ok("lifecycle: refund recorded", refunds.length === 1 && refunds[0].amountCents === 5000);

  const repeat = stripeEvent({ id: "evt_lc_1", type: "customer.subscription.created", object: subscriptionObject({ status: "active" }) });
  ok("lifecycle: repeat event deduplicated", (await processWebhookEvent(repeat.event, deps)) === "duplicate");
  ok("lifecycle: no double credit", orgs.get("cus_FAKE_org1")?.syncCalls === 1);
}

{
  // Delayed event: invoice.created for a subscription cycle triggers usage
  // reporting exactly once per customer.
  const { deps, usage } = makeDeps();
  const invoice = stripeEvent({
    id: "evt_delay_1",
    type: "invoice.created",
    object: { id: "in_FAKE_2", object: "invoice", customer: "cus_FAKE_org1", billing_reason: "subscription_cycle" },
  });
  ok("delayed invoice triggers usage report", (await processWebhookEvent(invoice.event, deps)) === "applied");
  ok("usage reported once", usage.length === 1 && usage[0] === "cus_FAKE_org1");
}

// ---------------------------------------------------------------- BILL-06 ---
section("BILL-06 usage ledger");

{
  const store = createMemoryLedgerStore();
  const org = "org-ledger-1";

  await grantEntitlement(store, {
    organizationId: org,
    quantity: 10,
    periodStart: "2026-09-01T00:00:00Z",
    periodEnd: "2026-10-01T00:00:00Z",
    reason: "team plan monthly inclusion",
    idempotencyKey: "ent:org-ledger-1:2026-09",
  });

  const u1 = await recordUsage(store, { organizationId: org, idempotencyKey: "sim:attempt-1", reason: "completed simulation attempt-1" });
  const u1dup = await recordUsage(store, { organizationId: org, idempotencyKey: "sim:attempt-1", reason: "completed simulation attempt-1" });
  ok("ledger: usage recorded once per idempotency key", u1.id === u1dup.id);

  await recordUsage(store, { organizationId: org, idempotencyKey: "sim:attempt-2", reason: "completed simulation attempt-2" });

  const retry = await recordRetryWithoutDoubleCharge(store, "sim:attempt-1", org);
  ok("ledger: platform-failure retry does not double charge", !retry.doubleCharged && retry.entry?.id === u1.id);

  const credit = await grantCredit(store, {
    organizationId: org,
    quantity: 3,
    reason: "goodwill credit for evaluator outage",
    actor: "operator@fydell.test",
    idempotencyKey: "credit:org-ledger-1:outage-1",
  });
  ok("ledger: manual credit logged with actor", credit.actor === "operator@fydell.test");

  let creditNoReason = false;
  try {
    await grantCredit(store, { organizationId: org, quantity: 1, reason: "x", actor: "op", idempotencyKey: "credit:bad" });
  } catch {
    creditNoReason = true;
  }
  ok("ledger: credit requires descriptive reason", creditNoReason);

  let creditNoActor = false;
  try {
    await grantCredit(store, { organizationId: org, quantity: 1, reason: "a valid reason here", actor: "", idempotencyKey: "credit:bad2" });
  } catch {
    creditNoActor = true;
  }
  ok("ledger: credit requires actor", creditNoActor);

  const summary = await ledgerSummary(store, org);
  ok("ledger: summary math (10 included + 3 credit - 2 used = 11)", summary.remaining === 11, JSON.stringify(summary));
  ok("ledger: consumed counts deduplicated usage", summary.consumed === 2);
}

// ------------------------------------------------- BILL-05 + BILL-01/02 -----
section("BILL-05 server-side plan mapping (no client-trusted amounts)");

ok("planFromPriceIds: team base -> team", planFromPriceIds([config.prices.teamBase], config) === "team");
ok("planFromPriceIds: starter usage -> starter", planFromPriceIds([config.prices.starterUsage], config) === "starter");
ok("planFromPriceIds: unknown price -> null", planFromPriceIds(["price_unknown"], config) === null);
ok("isBillingPlan rejects junk", !isBillingPlan("enterprise") && isBillingPlan("starter") && isBillingPlan("team"));

{
  const items = checkoutLineItems("starter", config);
  ok("checkout: starter line items use server prices", items.length === 1 && (items[0] as { price: string }).price === config.prices.starterUsage);
  const teamItems = checkoutLineItems("team", config);
  ok(
    "checkout: team line items use server prices",
    teamItems.length === 2 && teamItems.every((i) => Object.values(config.prices).includes((i as { price: string }).price))
  );
}

console.log(`\n${failures === 0 ? "ALL BILLING TESTS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
