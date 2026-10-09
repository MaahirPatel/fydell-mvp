/**
 * Route-level throttles: login lockout counts failures only, per IP and per
 * email; request limits return 429 with Retry-After once exceeded.
 *
 *   npm run test:route-limits
 */
import assert from "node:assert/strict";
import {
  LOGIN_FAILURES,
  limitRequest,
  loginIdentities,
  loginLockout,
  recordLoginFailure,
} from "../src/lib/security/route-limits";

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

function req(ip: string): Request {
  return new Request("http://localhost/api/platform/login", { method: "POST", headers: { "x-forwarded-for": ip } });
}

const t0 = 1_000_000;

console.log("\nlogin lockout");
check("no lockout before any failure", () => {
  assert.equal(loginLockout(loginIdentities(req("10.0.0.1"), "a@example.com"), t0), null);
});
check("locks after the failure limit for the same IP", () => {
  const ids = loginIdentities(req("10.0.0.2"), "b@example.com");
  for (let i = 0; i < LOGIN_FAILURES.limit; i++) {
    assert.equal(loginLockout(ids, t0), null);
    recordLoginFailure(ids, t0);
  }
  const res = loginLockout(ids, t0);
  assert.ok(res);
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get("Retry-After")) > 0);
});
check("locks one email even when every attempt comes from a new IP", () => {
  for (let i = 0; i < LOGIN_FAILURES.limit; i++) recordLoginFailure(loginIdentities(req(`10.1.0.${i}`), "target@example.com"), t0);
  const res = loginLockout(loginIdentities(req("10.9.9.9"), "target@example.com"), t0);
  assert.equal(res?.status, 429);
});
check("other emails from a fresh IP are unaffected", () => {
  assert.equal(loginLockout(loginIdentities(req("10.2.0.1"), "other@example.com"), t0), null);
});
check("lockout lifts after the window", () => {
  const ids = loginIdentities(req("10.0.0.2"), "b@example.com");
  assert.equal(loginLockout(ids, t0 + LOGIN_FAILURES.windowMs + 1), null);
});

console.log("\nrequest limits");
check("allows up to the limit, then 429", () => {
  const rule = { name: "unit", limit: 3, windowMs: 60_000 };
  for (let i = 0; i < 3; i++) assert.equal(limitRequest(rule, "user:u1", t0), null);
  assert.equal(limitRequest(rule, "user:u1", t0)?.status, 429);
  assert.equal(limitRequest(rule, "user:u2", t0), null);
});
check("bucket resets after the window", () => {
  const rule = { name: "unit-reset", limit: 1, windowMs: 1_000 };
  assert.equal(limitRequest(rule, "ip:x", t0), null);
  assert.equal(limitRequest(rule, "ip:x", t0)?.status, 429);
  assert.equal(limitRequest(rule, "ip:x", t0 + 1_001), null);
});

if (failed > 0) {
  console.log(`\n${failed} route-limit check(s) failed.`);
  process.exit(1);
}
console.log("\nAll route-limit checks passed.");
