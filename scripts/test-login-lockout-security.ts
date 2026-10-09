/**
 * Shared sign-in lockout (migration 074 + src/lib/security/login-lockout.ts).
 *
 * Runs against the dev database with disposable, made-up identities and
 * deletes its rows afterwards. Covers: lockout at the limit, no lockout
 * below it, lockout seen by an instance whose in-process counter is empty,
 * window rollover, hashed storage, and that anon cannot read the table or
 * call the counter function.
 *
 * Run via `npm run test:login-lockout`.
 */
import { createHmac, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { checkLoginLockout, recordFailedLogin } from "../src/lib/security/login-lockout";
import { LOGIN_FAILURES } from "../src/lib/security/route-limits";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env; run with --env-file=.env.local");
  process.exit(1);
}
if (url.includes("qtrhwrcxthtqvkeerptp")) {
  console.error("Refusing to run against production.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`);
}

function keyFor(identity: string): string {
  return createHmac("sha256", serviceKey).update(`login-failure:${identity.trim().toLowerCase()}`).digest("hex");
}

function identitiesFor(tag: string): string[] {
  return [`ip:198.51.100.${tag}`, `email:lockout-${tag}@example.com`];
}

const created: string[] = [];

async function main() {
  const run = randomBytes(4).toString("hex");
  const longAgo = Date.now() - 60 * 60_000;

  console.log("\nlocks at the limit, not below it");
  {
    const ids = identitiesFor(`${run}-a`);
    created.push(...ids.map(keyFor));
    for (let i = 0; i < LOGIN_FAILURES.limit - 1; i++) await recordFailedLogin(ids);
    check("below limit: not locked", (await checkLoginLockout(ids)) === null, true);
    await recordFailedLogin(ids);
    const locked = await checkLoginLockout(ids);
    check("at limit: 429", locked?.status, 429);
    const retry = Number(locked?.headers.get("Retry-After"));
    check("Retry-After within window", retry > 0 && retry <= LOGIN_FAILURES.windowMs / 1000, true);
  }

  console.log("\nanother instance sees the shared count");
  {
    // Recording with a clock an hour back leaves this process's counter
    // already expired, as if the failures happened on a different instance.
    const ids = identitiesFor(`${run}-b`);
    created.push(...ids.map(keyFor));
    for (let i = 0; i < LOGIN_FAILURES.limit; i++) await recordFailedLogin(ids, longAgo);
    const locked = await checkLoginLockout(ids);
    check("locked from the database alone", locked?.status, 429);
  }

  console.log("\nemail is locked regardless of IP");
  {
    const email = `email:lockout-${run}-c@example.com`;
    created.push(keyFor(email));
    for (let i = 0; i < LOGIN_FAILURES.limit; i++) {
      const ip = `ip:203.0.113.${i}-${run}`;
      created.push(keyFor(ip));
      await recordFailedLogin([ip, email], longAgo);
    }
    const fresh = `ip:192.0.2.1-${run}`;
    created.push(keyFor(fresh));
    check("new IP, same email: 429", (await checkLoginLockout([fresh, email]))?.status, 429);
  }

  console.log("\nwindow rollover");
  {
    const ids = identitiesFor(`${run}-d`);
    const keys = ids.map(keyFor);
    created.push(...keys);
    for (let i = 0; i < LOGIN_FAILURES.limit; i++) await recordFailedLogin(ids, longAgo);
    await admin.from("auth_login_failures").update({ reset_at: new Date(Date.now() - 1000).toISOString() }).in("key_hash", keys);
    check("expired window: not locked", (await checkLoginLockout(ids)) === null, true);
    await recordFailedLogin(ids, longAgo);
    const { data } = await admin.from("auth_login_failures").select("failures").in("key_hash", keys);
    check("new window restarts at 1", (data ?? []).map((r) => r.failures), [1, 1]);
  }

  console.log("\nstorage and access");
  {
    const { data } = await admin.from("auth_login_failures").select("key_hash").in("key_hash", created);
    const stored = (data ?? []).map((r) => String(r.key_hash));
    check("rows are hashed, never raw", stored.every((k) => /^[0-9a-f]{64}$/.test(k)), true);
    const read = await anon.from("auth_login_failures").select("key_hash").limit(1);
    check("anon cannot read the table", read.error !== null || (read.data ?? []).length === 0, true);
    const call = await anon.rpc("record_auth_login_failures", { p_keys: [keyFor(`anon-${run}`)], p_window_seconds: 60 });
    check("anon cannot call the counter", call.error !== null, true);
  }
}

async function cleanup() {
  const unique = [...new Set(created)];
  await admin.from("auth_login_failures").delete().in("key_hash", unique);
  const { count } = await admin.from("auth_login_failures").select("key_hash", { count: "exact", head: true }).in("key_hash", unique);
  console.log(`\ncleanup: ${count ?? "?"} test rows left`);
}

main()
  .catch((err) => {
    failures += 1;
    console.error("test harness error:", err);
  })
  .finally(async () => {
    await cleanup();
    console.log(failures === 0 ? "All login lockout tests passed." : `${failures} FAILURE(S)`);
    process.exit(failures === 0 ? 0 : 1);
  });
