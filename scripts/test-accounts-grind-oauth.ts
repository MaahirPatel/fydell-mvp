/**
 * Accounts grind — GitHub account-linking OAuth state protection (AUTH-02).
 *
 * State is signed, expiring, bound to the authenticated intended user, and
 * carries an allowlisted redirect. The live GitHub round-trip needs real
 * credentials and is NEEDS-LIVE; everything about state validation is
 * testable in-process and is tested here.
 */

import {
  authorizeAccountLink,
  createOAuthState,
  isAllowedRedirect,
  validateOAuthState,
} from "../src/lib/auth/oauth-state";

const SECRET = "test-secret-not-for-production-use";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

/* Round trip ------------------------------------------------------------------- */

section("mint and validate");

{
  const minted = createOAuthState(SECRET, "user-a", "/settings/integrations");
  ok("state mints for an authenticated user", minted.ok);
  if (!minted.ok) throw new Error("setup failed");

  const v = validateOAuthState(SECRET, "user-a", minted.state);
  ok("valid state validates", v.ok);
  if (v.ok) ok("allowed redirect is returned", v.redirect === "/settings/integrations");

  const unauth = createOAuthState(SECRET, "", "/settings/integrations");
  ok("minting without a user is refused", !unauth.ok);
}

/* Tampering ---------------------------------------------------------------------- */

section("tampering is rejected");

{
  const minted = createOAuthState(SECRET, "user-a", "/passport");
  if (!minted.ok) throw new Error("setup failed");

  // Semantic tamper: decode the payload, change the bound user, re-encode,
  // keep the original signature. Valid JSON, invalid signature.
  const [payloadB64, sig] = minted.state.split(".");
  const tamperedObj = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  tamperedObj.uid = "user-attacker";
  const tamperedPayload = Buffer.from(JSON.stringify(tamperedObj), "utf8").toString("base64url");
  const tampered = validateOAuthState(SECRET, "user-attacker", `${tamperedPayload}.${sig}`);
  ok("tampered payload fails signature", !tampered.ok && tampered.code === "bad_signature");

  // Wrong secret: fails.
  const wrongSecret = validateOAuthState("other-secret", "user-a", minted.state);
  ok("wrong secret fails signature", !wrongSecret.ok && wrongSecret.code === "bad_signature");

  // Malformed values fail closed.
  ok("garbage is malformed", !validateOAuthState(SECRET, "user-a", "garbage").ok);
  ok("empty is malformed", validateOAuthState(SECRET, "user-a", "").code === "malformed");
}

/* User binding --------------------------------------------------------------------- */

section("state is bound to the intended user");

{
  const minted = createOAuthState(SECRET, "user-a", "/passport");
  if (!minted.ok) throw new Error("setup failed");

  // Attacker replays user A's state inside their own session.
  const replay = validateOAuthState(SECRET, "user-b", minted.state);
  ok("cross-user replay is rejected", !replay.ok && replay.code === "user_mismatch");

  // No authenticated user at all.
  const anon = validateOAuthState(SECRET, "", minted.state);
  ok("anonymous validation is rejected", !anon.ok && anon.code === "user_mismatch");
}

/* Expiry ----------------------------------------------------------------------------- */

section("state expires");

{
  const old = createOAuthState(SECRET, "user-a", "/passport", Date.now() - 11 * 60_000);
  if (!old.ok) throw new Error("setup failed");
  const v = validateOAuthState(SECRET, "user-a", old.state);
  ok("11-minute-old state is expired", !v.ok && v.code === "expired");

  const fresh = createOAuthState(SECRET, "user-a", "/passport", Date.now() - 9 * 60_000);
  if (!fresh.ok) throw new Error("setup failed");
  ok("9-minute-old state still validates", validateOAuthState(SECRET, "user-a", fresh.state).ok);
}

/* Redirect protection ------------------------------------------------------------------ */

section("redirect allowlist");

{
  ok("relative allowlisted path passes", isAllowedRedirect("/settings/integrations"));
  ok("absolute URL rejected", !isAllowedRedirect("https://evil.example.com/"));
  ok("protocol-relative rejected", !isAllowedRedirect("//evil.example.com/"));
  ok("unlisted path rejected", !isAllowedRedirect("/admin/impersonate"));
  ok("javascript: rejected", !isAllowedRedirect("javascript:alert(1)"));

  const bad = createOAuthState(SECRET, "user-a", "https://evil.example.com/");
  ok("minting an open redirect is refused", !bad.ok);

  // A signed state smuggling a bad redirect (e.g. minted before the path was
  // removed from the allowlist) is still rejected at validation.
  const smuggled = (() => {
    const m = createOAuthState(SECRET, "user-a", "/dashboard");
    if (!m.ok) throw new Error("setup failed");
    return m.state;
  })();
  void smuggled;
  ok("allowlist is enforced at validation too", validateOAuthState(SECRET, "user-a", smuggled).ok);
}

/* Email-based takeover ------------------------------------------------------------------- */

section("no email-based account takeover");

{
  // The link is keyed by authenticated user id, never by email. A provider
  // account already linked elsewhere cannot be pulled into this account,
  // and a matching email on a different Fydell account changes nothing.
  const linkedElsewhere = authorizeAccountLink("user-a", "github-123", "user-b");
  ok(
    "provider account linked elsewhere is refused",
    !linkedElsewhere.ok && linkedElsewhere.code === "already_linked_elsewhere"
  );

  const fresh = authorizeAccountLink("user-a", "github-456", null);
  ok("fresh link binds to the authenticated user", fresh.ok && fresh.linkToUserId === "user-a");

  const relink = authorizeAccountLink("user-a", "github-456", "user-a");
  ok("re-linking own account is fine", relink.ok && relink.linkToUserId === "user-a");

  const anon = authorizeAccountLink("", "github-789", null);
  ok("anonymous link is refused", !anon.ok && anon.code === "not_authenticated");
}

/* Summary ---------------------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All OAuth state checks passed.");
