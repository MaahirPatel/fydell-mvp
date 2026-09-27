import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { isValidDesktopState } from "./desktop-state";

/**
 * Single-use desktop authorization codes (web addition W1).
 *
 * After a candidate signs in through `{platform}/login?desktop=1&state=...`,
 * the authorize route mints a code bound to (user, state) and redirects to
 * `fydell://auth/callback?code=<code>&state=<state>`. The desktop trades the
 * code at `POST /api/auth/desktop/exchange` for the Supabase session.
 *
 * Codes are 256-bit random, single-use, and expire after 5 minutes. The store
 * is in-process: on a multi-instance deployment the exchange must reach the
 * instance that minted the code (sticky routing) or this must move to a
 * shared store. For the v1 desktop flow the exchange happens within seconds
 * of minting, on the same instance in practice.
 */

const CODE_TTL_MS = 5 * 60 * 1000;
const CODE_BYTES = 32;

export interface DesktopAuthCode {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  /** Unix seconds, taken from the Supabase session. */
  expiresAt: number;
  state: string;
}

interface StoredCode extends DesktopAuthCode {
  createdAtMs: number;
}

const codes = new Map<string, StoredCode>();

function sweepExpired(nowMs: number): void {
  for (const [code, rec] of codes) {
    if (rec.createdAtMs + CODE_TTL_MS <= nowMs) {
      codes.delete(code);
    }
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
  sweepExpired(nowMs);
  const code = randomBytes(CODE_BYTES).toString("base64url");
  codes.set(code, { ...rec, createdAtMs: nowMs });
  return code;
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
  const rec = codes.get(code);
  if (rec) {
    codes.delete(code);
  }
  if (!rec) {
    return { ok: false, reason: "not_found" };
  }
  if (rec.createdAtMs + CODE_TTL_MS <= nowMs) {
    return { ok: false, reason: "expired" };
  }
  if (state !== undefined && !statesEqual(state, rec.state)) {
    return { ok: false, reason: "state_mismatch" };
  }
  const { createdAtMs: _createdAtMs, ...record } = rec;
  return { ok: true, record };
}

function statesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
