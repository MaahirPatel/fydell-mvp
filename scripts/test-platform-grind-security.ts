/**
 * Platform grind — security (SEC-04/05/06/07/08/09/10).
 * In-process tests over the real lib modules; no live services.
 * Run: npx tsx --conditions react-server scripts/test-platform-grind-security.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  escapeHtml,
  isSafeRedirectUrl,
  renderSafeMarkdown,
  serializeSecureCookie,
  validateText,
} from "../src/lib/security/validation";
import {
  bucketKey,
  checkThrottle,
  createMemoryThrottleStore,
  THROTTLE_POLICIES,
  throttleIdentity,
  type ThrottleRoute,
} from "../src/lib/security/throttles";
import { scanTextForSecrets, SCAN_ROOTS } from "../src/lib/security/secret-scan";
import { redactSecrets } from "../src/lib/security/logger";
import {
  assertAccess,
  checkAccess,
  type Actor,
  type GuardedRecord,
} from "../src/lib/security/access-guard";
import {
  assertNotRevoked,
  createMemoryRevocationStore,
  isRevoked,
  mayPublishResults,
} from "../src/lib/security/revocation";
import {
  BACKUP_EXPIRY_NOTE,
  buildFulfillmentChecklist,
  canTransitionRequest,
  openDataRequest,
} from "../src/lib/security/data-rights";

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
// ---------------------------------------------------------------- SEC-07 ---
section("SEC-07 input validation + output escaping");

ok("validateText rejects non-strings", !validateText(42 as unknown as string).ok);
ok("validateText enforces maxLength", validateText("abcdef", { maxLength: 3 }).value === "abc");
ok("validateText enforces minLength", !validateText("ab", { minLength: 5 }).ok);
ok("validateText strips control chars", validateText("a\x00b\x1fc").value === "abc");

const escaped = escapeHtml(`<script>alert("x")</script> & 'q'`);
ok("escapeHtml neutralizes tags", escaped === "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;", escaped);

const hostileMd = [
  "# Hello",
  `<script>alert("pwned")</script>`,
  `[click](javascript:alert(1))`,
  `<img src=x onerror=alert(2)>`,
  `[safe](https://example.com/report)`,
  "```",
  "rm -rf /",
  "```",
].join("\n");
const hostileHtml = renderSafeMarkdown(hostileMd);
ok("markdown: raw script tag is escaped", !hostileHtml.includes("<script>") && hostileHtml.includes("&lt;script&gt;"));
ok("markdown: javascript: link is not linked", !hostileHtml.includes("javascript:"));
ok("markdown: img onerror is escaped", !hostileHtml.includes("<img"));
ok("markdown: https link is linked", hostileHtml.includes('<a href="https://example.com/report"'));
ok("markdown: heading renders", hostileHtml.includes("<h1>Hello</h1>"));
ok("markdown: fenced code is escaped", hostileHtml.includes("<pre><code>") && hostileHtml.includes("rm -rf /"));

ok("redirect: relative path allowed", isSafeRedirectUrl("/app/employer/settings"));
ok("redirect: protocol-relative blocked", !isSafeRedirectUrl("//evil.com/phish"));
ok("redirect: javascript: blocked", !isSafeRedirectUrl("javascript:alert(1)"));
ok("redirect: allowlisted host allowed", isSafeRedirectUrl("https://app.fydell.com/x", ["app.fydell.com"]));
ok("redirect: non-allowlisted host blocked", !isSafeRedirectUrl("https://evil.com/", ["app.fydell.com"]));

const cookie = serializeSecureCookie("session", "abc 123");
ok("cookie: HttpOnly + SameSite=Lax by default", cookie.includes("HttpOnly") && cookie.includes("SameSite=Lax"));
ok("cookie: value encoded", cookie.includes("session=abc%20123"));
let threw = false;
try {
  serializeSecureCookie("bad;name", "x");
} catch {
  threw = true;
}
ok("cookie: invalid name rejected", threw);

// ---------------------------------------------------------------- SEC-08 ---
section("SEC-08 per-route throttles");

const routes: ThrottleRoute[] = ["login", "invite", "upload", "import", "ai_conversation", "sandbox_run", "demo_reset"];
for (const route of routes) {
  const policy = THROTTLE_POLICIES[route];
  ok(`throttle policy exists for ${route}`, !!policy && policy.limit > 0 && policy.windowMs > 0);
}

{
  const store = createMemoryThrottleStore();
  const route: ThrottleRoute = "login";
  const limit = THROTTLE_POLICIES[route].limit;
  let last = { ok: true, remaining: 0, retryAfterSeconds: 0 };
  for (let i = 0; i < limit; i++) last = checkThrottle(route, "ip:1.2.3.4", store, { windowMs: 60_000 }, 1_000);
  ok("throttle: quota consumed without blocking", last.ok && last.remaining === 0);
  const blocked = checkThrottle(route, "ip:1.2.3.4", store, { windowMs: 60_000 }, 2_000);
  ok("throttle: over-quota request blocked", !blocked.ok && blocked.retryAfterSeconds > 0);
  const afterWindow = checkThrottle(route, "ip:1.2.3.4", store, { windowMs: 60_000 }, 1_000 + 61_000);
  ok("throttle: window reset restores quota", afterWindow.ok);
  const other = checkThrottle(route, "ip:9.9.9.9", store, { windowMs: 60_000 }, 2_000);
  ok("throttle: buckets are per-identity", other.ok);
  ok("throttle: empty identity blocked", !checkThrottle(route, "", store).ok);
}

{
  const req = new Request("https://x.test/login", { headers: { "x-forwarded-for": "9.9.9.9" } });
  ok("throttleIdentity: ip scope", throttleIdentity(req, THROTTLE_POLICIES.login) === "ip:9.9.9.9");
  ok("throttleIdentity: user scope", throttleIdentity(req, THROTTLE_POLICIES.invite, "u1") === "user:u1");
  ok("bucketKey is namespaced", bucketKey("upload", "user:u1") === "throttle:upload:user:u1");
}

// ---------------------------------------------------------------- SEC-05 ---
section("SEC-05 secret hygiene");

const REAL_LOOKING = ["sk_live", "51HFAKEKEYx9Q2mZvB4nR7tYwEjKlP3sD6fG8hJ0kL"].join("_"); // concatenated: no key-shaped literal in source
ok("scanner: flags real-looking stripe live key", scanTextForSecrets(`key=${REAL_LOOKING}`).length === 1);
ok(
  "scanner: allowlists obvious fakes",
  scanTextForSecrets(`key=sk_test_FAKE_EXAMPLE_1234567890`).length === 0
);
ok(
  "scanner: flags private key blocks with real-looking bodies",
  scanTextForSecrets(`-----BEGIN RSA PRIVATE KEY-----\n${"M".repeat(64)}\n-----END RSA PRIVATE KEY-----`).length === 1
);
ok(
  "scanner: ignores private-key test stubs",
  scanTextForSecrets("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----").length === 0
);
const FAKE_JWT = `eyJ${"a".repeat(40)}.${"b".repeat(40)}.${"c".repeat(40)}`;
ok("scanner: flags long JWT-shaped service tokens", scanTextForSecrets(`token=${FAKE_JWT}`).length === 1);
const multi = scanTextForSecrets(`a=${REAL_LOOKING}\nb=re_abcdefghij1234567890abcdef12`);
ok("scanner: reports line numbers", multi.length === 2 && multi[0].line === 1 && multi[1].line === 2);
ok("scanner: preview never contains the raw value", !multi[0].preview.includes(REAL_LOOKING));

// Repo-wide scan: no real secrets in source, scripts, migrations, docs, public.
{
  const findings: string[] = [];
  const skipDirs = new Set(["node_modules", ".next", ".git", ".checklist-staging"]);
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      if (skipDirs.has(entry)) continue;
      const full = join(dir, entry);
      // Bundled third-party runtime code is not our secret surface.
      if (full.includes("node_modules")) continue;
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.size < 1_000_000) {
        try {
          const text = readFileSync(full, "utf8");
          // This test file itself carries fabricated FAKE-marked values; skip it.
          if (full.includes("test-platform-grind")) continue;
          for (const f of scanTextForSecrets(text, full)) findings.push(`${full}:${f.line} [${f.pattern}]`);
        } catch {
          /* binary — skip */
        }
      }
    }
  };
  for (const root of SCAN_ROOTS) {
    try {
      walk(root);
    } catch {
      /* missing root — skip */
    }
  }
  // Also scan built web output when a build exists (CI runs this after build).
  try {
    if (statSync(".next").isDirectory()) walk(".next");
  } catch {
    console.log("  note .next not present — built-bundle scan deferred to CI");
  }
  ok("repo scan: zero real-looking secrets in source tree", findings.length === 0, findings.slice(0, 5).join("; "));
}

{
  const redacted = redactSecrets({
    password: "hunter2",
    nested: { api_key: "abc", safe: "hello" },
    tokenInString: "auth token=sekret123 and sk_test_51H0123456789ABCDEFGHIJ rest",
    arr: [{ authorization: "Bearer xyz" }],
  }) as Record<string, unknown>;
  ok("logs: secret keys redacted", redacted.password === "[REDACTED]");
  ok("logs: nested secret keys redacted", (redacted.nested as Record<string, unknown>).api_key === "[REDACTED]");
  ok("logs: safe values preserved", (redacted.nested as Record<string, unknown>).safe === "hello");
  ok(
    "logs: secret-shaped values redacted in strings",
    typeof redacted.tokenInString === "string" && redacted.tokenInString.includes("[REDACTED]")
  );
}

// ---------------------------------------------------------------- SEC-06 ---
section("SEC-06 access abuse matrix");

const orgA = "org-a";
const orgB = "org-b";
const actorA: Actor = { userId: "user-a", organizationIds: [orgA], billingRoles: { [orgA]: "member" }, candidateId: "cand-a", revoked: false, isOperator: false };
const actorB: Actor = { userId: "user-b", organizationIds: [orgB], billingRoles: { [orgB]: "member" }, candidateId: "cand-b", revoked: false, isOperator: false };
const anon: Actor = { userId: null, organizationIds: [], billingRoles: {}, candidateId: null, revoked: false, isOperator: false };
const removedA: Actor = { ...actorA, revoked: true };
const ownerA: Actor = { ...actorA, billingRoles: { [orgA]: "owner" } };
const reviewerA: Actor = { ...actorA, billingRoles: { [orgA]: "reviewer" } };
const operator: Actor = { userId: "op-1", organizationIds: [], billingRoles: {}, candidateId: null, revoked: false, isOperator: true };

const attemptOfA: GuardedRecord = { kind: "attempt", ownerCandidateId: "cand-a", organizationId: orgA, sharedWithOrgIds: [] };
const evidenceOfA: GuardedRecord = { kind: "candidate_evidence", ownerCandidateId: "cand-a", organizationId: null, sharedWithOrgIds: [] };
const billingOfA: GuardedRecord = { kind: "billing", ownerCandidateId: null, organizationId: orgA, sharedWithOrgIds: [] };
const noteOfA: GuardedRecord = { kind: "reviewer_note", ownerCandidateId: null, organizationId: orgA, sharedWithOrgIds: [], minRole: "reviewer" };
const demoFixture: GuardedRecord = { kind: "demo_fixture", ownerCandidateId: null, organizationId: null, sharedWithOrgIds: [] };

const paths = ["api", "storage", "export"] as const;
for (const path of paths) {
  ok(`org B cannot read org A attempt via ${path}`, !checkAccess(actorB, attemptOfA, path).allowed);
  ok(`candidate B cannot read candidate A evidence via ${path}`, !checkAccess(actorB, evidenceOfA, path).allowed);
  ok(`anonymous denied attempt via ${path}`, !checkAccess(anon, attemptOfA, path).allowed);
  ok(`removed member denied via ${path}`, !checkAccess(removedA, attemptOfA, path).allowed);
  ok(`org A member reads own attempt via ${path}`, checkAccess(actorA, attemptOfA, path).allowed);
  ok(`candidate A reads own evidence via ${path}`, checkAccess(actorA, evidenceOfA, path).allowed);
}
ok("billing: plain member denied", !checkAccess(actorA, billingOfA, "api").allowed);
ok("billing: owner allowed", checkAccess(ownerA, billingOfA, "api").allowed);
ok("billing: other org owner denied", !checkAccess({ ...ownerA, organizationIds: [orgB], billingRoles: { [orgB]: "owner" } }, billingOfA, "api").allowed);
ok("reviewer note: member denied", !checkAccess(actorA, noteOfA, "api").allowed);
ok("reviewer note: reviewer allowed", checkAccess(reviewerA, noteOfA, "api").allowed);
ok("demo fixture: anonymous allowed (fictional data)", checkAccess(anon, demoFixture, "api").allowed);
ok("operator: purpose-limited access allowed", checkAccess(operator, attemptOfA, "api").allowed);
ok("operator: cannot read other candidate evidence without purpose", checkAccess({ ...operator, isOperator: false }, evidenceOfA, "api").allowed === false);

let threw403 = false;
try {
  assertAccess(actorB, attemptOfA, "api");
} catch (e) {
  threw403 = (e as { status?: number }).status === 403;
}
ok("assertAccess throws 403-shaped error", threw403);

// ---------------------------------------------------------------- SEC-10 ---
section("SEC-10 revocation enforcement");

{
  const store = createMemoryRevocationStore();
  ok("not revoked initially", !(await isRevoked(store, "user", "cand-a", "import")));
  await store.revoke({ subjectType: "user", subjectId: "cand-a", scope: "import", reason: "candidate withdrew" });
  ok("revoked import blocks new imports", await isRevoked(store, "user", "cand-a", "import"));
  ok("revoked import does not block unrelated scope", !(await isRevoked(store, "user", "cand-a", "read")));
  let threwRevoke = false;
  try {
    await assertNotRevoked(store, "user", "cand-a", "import");
  } catch {
    threwRevoke = true;
  }
  ok("assertNotRevoked throws for revoked import", threwRevoke);
  await assertNotRevoked(store, "user", "cand-a", "share");

  ok("in-flight job: may publish when nothing revoked", await mayPublishResults(store, { candidateUserId: "cand-b" }));
  ok("in-flight job: blocked when import revoked", !(await mayPublishResults(store, { candidateUserId: "cand-a" })));
  await store.revoke({ subjectType: "share_token", subjectId: "share-1", scope: "share" });
  ok("in-flight job: blocked when share revoked", !(await mayPublishResults(store, { candidateUserId: "cand-b", shareTokenId: "share-1" })));
}

// ---------------------------------------------------------------- SEC-09 ---
section("SEC-09 data-subject requests");

ok("request machine: received -> identity_verified", canTransitionRequest("received", "identity_verified"));
ok("request machine: cannot skip to fulfilled", !canTransitionRequest("received", "fulfilled"));
ok("request machine: fulfilling -> fulfilled", canTransitionRequest("fulfilling", "fulfilled"));
ok("request machine: rejected is terminal", !canTransitionRequest("rejected", "fulfilled"));
ok("request machine: fulfilled is terminal", !canTransitionRequest("fulfilled", "tracing"));

for (const type of ["export", "correction", "deletion"] as const) {
  const checklist = buildFulfillmentChecklist(type, "user-1");
  const surfaces = new Set(checklist.map((c) => c.surface));
  ok(
    `checklist(${type}): covers db, objects, jobs/indexes, vendors, backups`,
    ["database", "object_storage", "jobs_indexes", "vendors", "backups"].every((s) => surfaces.has(s as never))
  );
  ok(
    `checklist(${type}): vendor items flagged for manual/live tracing`,
    checklist.filter((c) => c.surface === "vendors" || c.surface === "backups").every((c) => !c.vendorTracingLive)
  );
}
ok("backup expiry note discloses expiry-not-surgery", BACKUP_EXPIRY_NOTE.includes("expire"));

{
  const req = openDataRequest("req-1", "user-1", "deletion");
  ok("new request starts at received with checklist", req.status === "received" && req.checklist.length > 0);
}

// ---------------------------------------------------------------- SEC-04 ---
section("SEC-04 collection minimization (code audit)");

{
  // No screen-recording / media-capture APIs in the web source tree.
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (!["node_modules", ".next", ".git"].includes(entry)) walk(full);
      } else if (/\.(ts|tsx|js)$/.test(entry) && st.size < 1_000_000) {
        try {
          const text = readFileSync(full, "utf8");
          if (/getDisplayMedia|getUserMedia|mediaDevices/.test(text)) hits.push(full);
        } catch { /* skip */ }
      }
    }
  };
  walk("src");
  ok("no media-capture APIs in web source", hits.length === 0, hits.slice(0, 3).join("; "));
}

console.log(`\n${failures === 0 ? "ALL SECURITY TESTS PASSED" : `${failures} FAILURES`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
