import "server-only";
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { isValidDesktopState, isValidPkceChallenge, isValidPkceVerifier } from "./desktop-state";

/**
 * Single-use desktop authorization codes (web addition W1).
 *
 * After a candidate signs in through `{platform}/login?desktop=1&state=...`,
 * the authorize route mints a code bound to (user, state) and redirects to
 * `fydell://auth/callback?code=<code>&state=<state>`. The desktop trades the
 * code at `POST /api/auth/desktop/exchange` for the Supabase session.
 *
 * The code is the session record sealed with AES-256-GCM under a key derived
 * from NEXTAUTH_SECRET, so the exchange works on whichever serverless
 * instance receives it. Codes expire after 5 minutes and are bound to the
 * desktop's random state. Reuse is refused per instance; across instances
 * the 5-minute expiry and state binding are the bound on replay.
 *
 * PKCE: when the desktop sends an S256 `code_challenge`, it is sealed into
 * the code and the exchange must present the matching `code_verifier`, so an
 * app that intercepts the `fydell://` deep link cannot redeem the code. A
 * code minted without a challenge refuses any verifier, so the two flows
 * cannot be mixed to skip the check.
 */

const CODE_TTL_MS = 5 * 60 * 1000;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export interface DesktopAuthCode {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  /** Unix seconds, taken from the Supabase session. */
  expiresAt: number;
  state: string;
}

interface SealedPayload extends DesktopAuthCode {
  codeChallenge: string | null;
  createdAtMs: number;
  nonce: string;
}

const redeemed = new Map<string, number>();

function sealingKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("desktop auth: NEXTAUTH_SECRET is not configured");
  return Buffer.from(hkdfSync("sha256", secret, "fydell-desktop", "desktop-auth-code-v1", 32));
}

function sweepRedeemed(nowMs: number): void {
  for (const [nonce, createdAtMs] of redeemed) {
    if (createdAtMs + CODE_TTL_MS <= nowMs) redeemed.delete(nonce);
  }
}

/**
 * Mint a single-use code bound to (user, state) and, when given, an S256
 * PKCE challenge. Throws on invalid input. `nowMs` is injectable for tests.
 */
export function mintDesktopAuthCode(
  rec: DesktopAuthCode,
  nowMs: number = Date.now(),
  codeChallenge: string | null = null,
): string {
  if (!isValidDesktopState(rec.state)) {
    throw new Error("desktop auth: invalid state");
  }
  if (!rec.userId || !rec.accessToken || !rec.refreshToken) {
    throw new Error("desktop auth: incomplete session");
  }
  if (codeChallenge !== null && !isValidPkceChallenge(codeChallenge)) {
    throw new Error("desktop auth: invalid code challenge");
  }
  const payload: SealedPayload = {
    ...rec,
    codeChallenge,
    createdAtMs: nowMs,
    nonce: randomBytes(16).toString("base64url"),
  };
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", sealingKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

function unseal(code: string): SealedPayload | null {
  try {
    const raw = Buffer.from(code, "base64url");
    if (raw.length <= IV_BYTES + TAG_BYTES) return null;
    const iv = raw.subarray(0, IV_BYTES);
    const tag = raw.subarray(raw.length - TAG_BYTES);
    const body = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", sealingKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (
      typeof p.userId !== "string" ||
      typeof p.email !== "string" ||
      typeof p.accessToken !== "string" ||
      typeof p.refreshToken !== "string" ||
      typeof p.expiresAt !== "number" ||
      typeof p.state !== "string" ||
      typeof p.createdAtMs !== "number" ||
      typeof p.nonce !== "string"
    ) {
      return null;
    }
    // Codes sealed before PKCE support carry no field: treat as no challenge.
    let codeChallenge: string | null = null;
    if (typeof p.codeChallenge === "string") codeChallenge = p.codeChallenge;
    else if (p.codeChallenge !== undefined && p.codeChallenge !== null) return null;
    return {
      codeChallenge,
      userId: p.userId,
      email: p.email,
      accessToken: p.accessToken,
      refreshToken: p.refreshToken,
      expiresAt: p.expiresAt,
      state: p.state,
      createdAtMs: p.createdAtMs,
      nonce: p.nonce,
    };
  } catch {
    return null;
  }
}

export type RedeemResult =
  | { ok: true; record: DesktopAuthCode }
  | { ok: false; reason: "not_found" | "expired" | "state_mismatch" | "pkce_mismatch" };

/**
 * Redeem a code. Single-use: the code is consumed by the first redemption
 * attempt regardless of outcome, so a wrong-state or wrong-verifier guess
 * cannot be retried against the same code. `state`, when provided, must match
 * the bound state. A code minted with a PKCE challenge requires the matching
 * `codeVerifier`; a code minted without one refuses any verifier.
 * `nowMs` is injectable for tests; routes pass `undefined`.
 */
export function redeemDesktopAuthCode(
  code: string,
  state?: string,
  nowMs: number = Date.now(),
  codeVerifier?: string,
): RedeemResult {
  const rec = unseal(code);
  if (!rec || redeemed.has(rec.nonce)) {
    return { ok: false, reason: "not_found" };
  }
  sweepRedeemed(nowMs);
  redeemed.set(rec.nonce, rec.createdAtMs);
  if (rec.createdAtMs + CODE_TTL_MS <= nowMs) {
    return { ok: false, reason: "expired" };
  }
  if (state !== undefined && !statesEqual(state, rec.state)) {
    return { ok: false, reason: "state_mismatch" };
  }
  if (!pkceSatisfied(rec.codeChallenge, codeVerifier)) {
    return { ok: false, reason: "pkce_mismatch" };
  }
  return {
    ok: true,
    record: {
      userId: rec.userId,
      email: rec.email,
      accessToken: rec.accessToken,
      refreshToken: rec.refreshToken,
      expiresAt: rec.expiresAt,
      state: rec.state,
    },
  };
}

function pkceSatisfied(challenge: string | null, verifier: string | undefined): boolean {
  if (challenge === null) return verifier === undefined;
  if (!isValidPkceVerifier(verifier)) return false;
  return statesEqual(createHash("sha256").update(verifier, "ascii").digest("base64url"), challenge);
}

function statesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
