/**
 * Desktop auth tests (W1): single-use code store + token-exchange endpoint.
 *
 * Covers the exchange contract the desktop app's `exchange_code` expects:
 *   POST /api/auth/desktop/exchange  { "code": "<one-time>" }
 *   → 200 { access_token, refresh_token, expires_at, user: { id, email } }
 *
 * Cases: valid, reused, expired, wrong-state, unknown/missing/malformed code,
 * and PKCE (S256): matching, missing, wrong, and verifier-on-legacy-code.
 * Pure in-process tests: no Supabase, no network, no database.
 *
 * Run via `npm run test:desktop-auth`.
 */
import {
  desktopAuthorizePath,
  isValidDesktopState,
  isValidPkceChallenge,
  isValidPkceVerifier,
} from "../src/lib/auth/desktop-state";
import {
  mintDesktopAuthCode,
  redeemDesktopAuthCode,
  type DesktopAuthCode,
} from "../src/lib/auth/desktop-codes";
import { POST as exchangePOST } from "../src/app/api/auth/desktop/exchange/route";

process.env.NEXTAUTH_SECRET ||= "test-only-desktop-auth-secret";

// RFC 7636 Appendix B.
const RFC_VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const RFC_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`,
  );
}

function makeRecord(state = "9f2c4a1b-7d3e-4a5f-8b6c-1d2e3f4a5b6c"): DesktopAuthCode {
  return {
    userId: "user-123",
    email: "candidate@example.com",
    accessToken: "access-token-value",
    refreshToken: "refresh-token-value",
    expiresAt: 1_800_000_000,
    state,
  };
}

async function exchangeCall(body: unknown, ip?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ip) headers["x-forwarded-for"] = ip;
  const res = await exchangePOST(
    new Request("http://localhost/api/auth/desktop/exchange", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: res.status, json: await res.json() };
}

function syncTests() {
  console.log("\ndesktop state validator");
  check("accepts uuid v4", isValidDesktopState("9f2c4a1b-7d3e-4a5f-8b6c-1d2e3f4a5b6c"), true);
  check("accepts alphanumerics", isValidDesktopState("abcXYZ019_-"), true);
  check("rejects empty", isValidDesktopState(""), false);
  check("rejects >256 chars", isValidDesktopState("a".repeat(257)), false);
  check("accepts 256 chars", isValidDesktopState("a".repeat(256)), true);
  check("rejects spaces", isValidDesktopState("has space"), false);
  check("rejects url metachars", isValidDesktopState("a?b=c&d#e"), false);
  check("rejects quotes/brackets", isValidDesktopState('a"b<c>d'), false);
  check("rejects newline", isValidDesktopState("a\nb"), false);
  check("rejects non-string", isValidDesktopState(12345), false);
  check("rejects null", isValidDesktopState(null), false);

  console.log("\ncode store: mint + redeem");
  {
    const rec = makeRecord();
    const code = mintDesktopAuthCode(rec);
    check("code is url-safe", /^[A-Za-z0-9_-]+$/.test(code), true);
    const res = redeemDesktopAuthCode(code);
    check("redeem ok", res.ok, true);
    if (res.ok) {
      check("record userId", res.record.userId, "user-123");
      check("record email", res.record.email, "candidate@example.com");
      check("record accessToken", res.record.accessToken, "access-token-value");
      check("record refreshToken", res.record.refreshToken, "refresh-token-value");
      check("record expiresAt", res.record.expiresAt, 1_800_000_000);
      check("record state", res.record.state, rec.state);
    }
  }

  console.log("\ncode store: single-use (reused)");
  {
    const code = mintDesktopAuthCode(makeRecord());
    const first = redeemDesktopAuthCode(code);
    check("first redeem ok", first.ok, true);
    const second = redeemDesktopAuthCode(code);
    check("second redeem fails", second.ok, false);
    if (!second.ok) check("reason not_found", second.reason, "not_found");
  }

  console.log("\ncode store: expiry");
  {
    const now = Date.now();
    const freshCode = mintDesktopAuthCode(makeRecord(), now);
    const fresh = redeemDesktopAuthCode(freshCode, undefined, now + 4 * 60 * 1000);
    check("redeem inside ttl ok", fresh.ok, true);
    const oldCode = mintDesktopAuthCode(makeRecord(), now);
    const late = redeemDesktopAuthCode(oldCode, undefined, now + 6 * 60 * 1000);
    check("redeem after ttl fails", late.ok, false);
    if (!late.ok) check("reason expired", late.reason, "expired");
  }

  console.log("\ncode store: wrong state");
  {
    const code = mintDesktopAuthCode(makeRecord("state-aaa"));
    const wrong = redeemDesktopAuthCode(code, "state-bbb");
    check("wrong state fails", wrong.ok, false);
    if (!wrong.ok) check("reason state_mismatch", wrong.reason, "state_mismatch");
    const retry = redeemDesktopAuthCode(code, "state-aaa");
    check("code consumed by wrong-state attempt", retry.ok, false);
  }

  console.log("\ncode store: correct state passes");
  {
    const code = mintDesktopAuthCode(makeRecord("state-aaa"));
    const res = redeemDesktopAuthCode(code, "state-aaa");
    check("correct state ok", res.ok, true);
  }

  console.log("\ncode store: mint validation");
  {
    let threw = false;
    try {
      mintDesktopAuthCode(makeRecord("bad state!"));
    } catch {
      threw = true;
    }
    check("invalid state throws", threw, true);
    threw = false;
    try {
      mintDesktopAuthCode({ ...makeRecord(), accessToken: "" });
    } catch {
      threw = true;
    }
    check("incomplete session throws", threw, true);
  }

  console.log("\ncode store: sealed, tamper-evident");
  {
    const code = mintDesktopAuthCode(makeRecord());
    check("code does not expose the token", code.includes("access-token-value"), false);
    const flipped = code.slice(0, 20) + (code[20] === "A" ? "B" : "A") + code.slice(21);
    const tampered = redeemDesktopAuthCode(flipped);
    check("tampered code fails", tampered.ok, false);
    check("original still redeems", redeemDesktopAuthCode(code).ok, true);
  }

  console.log("\npkce validators");
  check("challenge: rfc vector", isValidPkceChallenge(RFC_CHALLENGE), true);
  check("challenge: wrong length", isValidPkceChallenge(RFC_CHALLENGE.slice(1)), false);
  check("challenge: padded", isValidPkceChallenge(`${RFC_CHALLENGE.slice(1)}=`), false);
  check("verifier: rfc vector", isValidPkceVerifier(RFC_VERIFIER), true);
  check("verifier: too short", isValidPkceVerifier("a".repeat(42)), false);
  check("verifier: too long", isValidPkceVerifier("a".repeat(129)), false);
  check("verifier: bad char", isValidPkceVerifier(`${"a".repeat(42)}+`), false);
  check(
    "authorize path carries challenge",
    desktopAuthorizePath("state-aaa", RFC_CHALLENGE),
    `/auth/desktop/authorize?state=state-aaa&code_challenge=${RFC_CHALLENGE}&code_challenge_method=S256`,
  );
  check("authorize path legacy", desktopAuthorizePath("state-aaa", null), "/auth/desktop/authorize?state=state-aaa");

  console.log("\ncode store: pkce");
  {
    const good = mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE);
    check("matching verifier ok", redeemDesktopAuthCode(good, undefined, undefined, RFC_VERIFIER).ok, true);

    const wrong = mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE);
    const wrongRes = redeemDesktopAuthCode(wrong, undefined, undefined, "x".repeat(43));
    check("wrong verifier fails", wrongRes.ok, false);
    if (!wrongRes.ok) check("reason pkce_mismatch", wrongRes.reason, "pkce_mismatch");
    check(
      "code consumed by wrong-verifier attempt",
      redeemDesktopAuthCode(wrong, undefined, undefined, RFC_VERIFIER).ok,
      false,
    );

    const missing = mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE);
    check("missing verifier fails", redeemDesktopAuthCode(missing).ok, false);

    const legacy = mintDesktopAuthCode(makeRecord());
    check("verifier on a legacy code fails", redeemDesktopAuthCode(legacy, undefined, undefined, RFC_VERIFIER).ok, false);

    let threw = false;
    try {
      mintDesktopAuthCode(makeRecord(), undefined, "not-a-challenge");
    } catch {
      threw = true;
    }
    check("invalid challenge throws", threw, true);
  }

  console.log("\ncode store: uniqueness");
  {
    const a = mintDesktopAuthCode(makeRecord());
    const b = mintDesktopAuthCode(makeRecord());
    check("codes differ", a !== b, true);
    redeemDesktopAuthCode(a);
    redeemDesktopAuthCode(b);
  }
}

async function routeTests() {
  console.log("\nexchange endpoint: valid code");
  {
    const code = mintDesktopAuthCode(makeRecord());
    const { status, json } = await exchangeCall({ code });
    check("status 200", status, 200);
    check("access_token", json.access_token, "access-token-value");
    check("refresh_token", json.refresh_token, "refresh-token-value");
    check("expires_at", json.expires_at, 1_800_000_000);
    check("user.id", json.user?.id, "user-123");
    check("user.email", json.user?.email, "candidate@example.com");
    check("no extra top-level keys", Object.keys(json).sort(), [
      "access_token",
      "expires_at",
      "refresh_token",
      "user",
    ]);
  }

  console.log("\nexchange endpoint: reused / unknown / expired / wrong state");
  {
    const code = mintDesktopAuthCode(makeRecord());
    await exchangeCall({ code });
    const reused = await exchangeCall({ code });
    check("reused → 401", reused.status, 401);
    check("reused error", reused.json.error, "invalid_code");

    const unknown = await exchangeCall({ code: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
    check("unknown → 401", unknown.status, 401);
    check("unknown error", unknown.json.error, "invalid_code");

    const old = mintDesktopAuthCode(makeRecord(), Date.now() - 6 * 60 * 1000);
    const expired = await exchangeCall({ code: old });
    check("expired → 401", expired.status, 401);
    check("expired error", expired.json.error, "invalid_code");

    const bound = mintDesktopAuthCode(makeRecord("state-aaa"));
    const wrongState = await exchangeCall({ code: bound, state: "state-bbb" });
    check("wrong state → 401", wrongState.status, 401);
    check("wrong state error", wrongState.json.error, "invalid_code");
  }

  console.log("\nexchange endpoint: pkce");
  {
    const good = mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE);
    const ok = await exchangeCall({ code: good, code_verifier: RFC_VERIFIER });
    check("matching verifier → 200", ok.status, 200);
    check("matching verifier access_token", ok.json.access_token, "access-token-value");

    const noVerifier = await exchangeCall({ code: mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE) });
    check("missing verifier → 401", noVerifier.status, 401);
    check("missing verifier error", noVerifier.json.error, "invalid_code");

    const wrong = await exchangeCall({
      code: mintDesktopAuthCode(makeRecord(), undefined, RFC_CHALLENGE),
      code_verifier: "y".repeat(43),
    });
    check("wrong verifier → 401", wrong.status, 401);

    const legacy = await exchangeCall({ code: mintDesktopAuthCode(makeRecord()), code_verifier: RFC_VERIFIER });
    check("verifier on legacy code → 401", legacy.status, 401);
  }

  console.log("\nexchange endpoint: malformed requests");
  {
    const missing = await exchangeCall({});
    check("missing code → 400", missing.status, 400);
    check("missing code error", missing.json.error, "code_required");

    const malformed = await exchangeCall("not-json{{{");
    check("malformed json → 400", malformed.status, 400);

    const nonString = await exchangeCall({ code: 12345 });
    check("non-string code → 400", nonString.status, 400);
  }

  console.log("\nexchange endpoint: rate limiting");
  {
    const ip = "203.0.113.99";
    let last = 0;
    for (let i = 0; i < 31; i++) {
      const r = await exchangeCall({}, ip);
      last = r.status;
    }
    check("31st request from one ip → 429", last, 429);
  }
}

async function main() {
  syncTests();
  await routeTests();
  console.log(failures === 0 ? "\nAll desktop auth tests passed." : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("test harness error:", err);
  process.exit(1);
});
