/**
 * Webhook signature checks: Resend (Svix) and Stripe reject unsigned,
 * tampered, stale and wrongly keyed requests.
 *
 *   npm run test:webhook-security
 */
import assert from "node:assert/strict";
import StripeSDK from "stripe";
import { signSvix, verifySvixSignature, SVIX_TOLERANCE_SECONDS } from "../src/lib/security/webhook-signature";
import { verifyStripeSignature } from "../src/lib/billing/webhook";

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${err instanceof Error ? err.message : String(err)}`);
  }
}

const secret = `whsec_${Buffer.from("test-signing-key-0123456789").toString("base64")}`;
const otherSecret = `whsec_${Buffer.from("another-signing-key-987654").toString("base64")}`;
const body = JSON.stringify({ type: "email.delivered", id: "evt_1", data: { email_id: "em_1" } });
const now = 1_760_000_000;
const ts = String(now);
const id = "msg_1";
const sig = signSvix(secret, id, ts, body);

console.log("\nResend (Svix)");
check("accepts a valid signature", () => {
  assert.deepEqual(verifySvixSignature(body, { id, timestamp: ts, signature: `v1,${sig}` }, secret, now), { ok: true });
});
check("accepts when any of several rotated signatures matches", () => {
  const old = signSvix(otherSecret, id, ts, body);
  assert.equal(verifySvixSignature(body, { id, timestamp: ts, signature: `v1,${old} v1,${sig}` }, secret, now).ok, true);
});
check("rejects missing headers", () => {
  assert.equal(verifySvixSignature(body, { id: null, timestamp: ts, signature: `v1,${sig}` }, secret, now).ok, false);
  assert.equal(verifySvixSignature(body, { id, timestamp: ts, signature: null }, secret, now).ok, false);
});
check("rejects a tampered body", () => {
  assert.equal(verifySvixSignature(body.replace("delivered", "bounced"), { id, timestamp: ts, signature: `v1,${sig}` }, secret, now).ok, false);
});
check("rejects a different message id", () => {
  assert.equal(verifySvixSignature(body, { id: "msg_2", timestamp: ts, signature: `v1,${sig}` }, secret, now).ok, false);
});
check("rejects a signature made with another secret", () => {
  const forged = signSvix(otherSecret, id, ts, body);
  assert.equal(verifySvixSignature(body, { id, timestamp: ts, signature: `v1,${forged}` }, secret, now).ok, false);
});
check("rejects a replay outside the tolerance", () => {
  const later = now + SVIX_TOLERANCE_SECONDS + 1;
  assert.deepEqual(verifySvixSignature(body, { id, timestamp: ts, signature: `v1,${sig}` }, secret, later), {
    ok: false,
    reason: "stale_timestamp",
  });
});
check("rejects an unknown signature version", () => {
  assert.equal(verifySvixSignature(body, { id, timestamp: ts, signature: `v2,${sig}` }, secret, now).ok, false);
});
check("rejects a malformed secret", () => {
  assert.equal(verifySvixSignature(body, { id, timestamp: ts, signature: `v1,${sig}` }, "whsec_", now).ok, false);
});

console.log("\nStripe");
const stripeSecret = "whsec_stripe_test_secret";
const stripeBody = JSON.stringify({ id: "evt_s1", object: "event", type: "invoice.paid", data: { object: {} } });
const stripe = new StripeSDK("sk_test_unused");
check("accepts a valid Stripe signature", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload: stripeBody, secret: stripeSecret });
  assert.equal(verifyStripeSignature(stripeBody, header, stripeSecret).id, "evt_s1");
});
check("rejects a Stripe signature over a different body", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload: stripeBody, secret: stripeSecret });
  assert.throws(() => verifyStripeSignature(stripeBody.replace("invoice.paid", "invoice.voided"), header, stripeSecret));
});
check("rejects a Stripe signature from another secret", () => {
  const header = stripe.webhooks.generateTestHeaderString({ payload: stripeBody, secret: "whsec_other" });
  assert.throws(() => verifyStripeSignature(stripeBody, header, stripeSecret));
});
check("rejects a stale Stripe timestamp", () => {
  const header = stripe.webhooks.generateTestHeaderString({
    payload: stripeBody,
    secret: stripeSecret,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  });
  assert.throws(() => verifyStripeSignature(stripeBody, header, stripeSecret));
});

if (failed > 0) {
  console.log(`\n${failed} webhook check(s) failed.`);
  process.exit(1);
}
console.log("\nAll webhook signature checks passed.");
