import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { isValidDesktopState } from "./desktop-state";

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
 * Mint a single-use code bound to (user, state). Throws on invalid input.
 * `nowMs` is injectable for tests; routes call it without arguments.
 */
export function mintDesktopAuthCode(
  rec: DesktopAuthCode,
  nowMs: number = Date.now(),
): string {
  if (!isValidDesktopState(rec.state)) {
    throw new Error("desktop auth: invalid state");
  }
  if (!rec.userId || !rec.accessToken || !rec.refreshToken) {
    throw new Error("desktop auth: incomplete session");
  }
  const payload: SealedPayload = {
    ...rec,
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
    return {
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
  | { ok: false; reason: "not_found" | "expired" | "state_mismatch" };

/**
 * Redeem a code. Single-use: the code is consumed by the first redemption
 * attempt regardless of outcome, so a wrong-state guess cannot be retried
 * against the same code. `state`, when provided, must match the bound state.
 * `nowMs` is injectable for tests; routes call it without arguments.
 */
export function redeemDesktopAuthCode(
  code: string,
  state?: string,
  nowMs: number = Date.now(),
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

function statesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
