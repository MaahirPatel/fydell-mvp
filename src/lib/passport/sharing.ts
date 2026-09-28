/**
 * Scoped sharing rules (PASS-06). Pure logic kept out of the DB layer so it
 * can be tested in-process.
 *
 * A share grants access to specific fields of the passport for a specific
 * audience, optionally until an expiry time, and can be revoked at any
 * moment. Revocation and expiry stop future access; they cannot retract
 * copies an employer already downloaded (see removal.ts).
 */

export type ShareState = "active" | "revoked" | "expired";

export function shareState(input: { revokedAt: string | null; expiresAt: string | null }, now: Date = new Date()): ShareState {
  if (input.revokedAt) return "revoked";
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) return "expired";
  return "active";
}

const MAX_SHARE_DAYS = 366;

/**
 * Single-shape result (not a discriminated union): callers only need
 * property access, so this never depends on narrowing behaviour.
 */
export type ExpiryValidation = { ok: boolean; expiresAt: string; error: string };

export function validateExpiryInput(value: unknown): ExpiryValidation {
  if (value === undefined || value === null || value === "") return { ok: true, expiresAt: "", error: "" };
  if (typeof value !== "string") return { ok: false, expiresAt: "", error: "Expiry must be an ISO date string." };
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return { ok: false, expiresAt: "", error: "Expiry is not a valid date." };
  const now = Date.now();
  if (when.getTime() <= now) return { ok: false, expiresAt: "", error: "Expiry must be in the future." };
  if (when.getTime() - now > MAX_SHARE_DAYS * 24 * 3600 * 1000) {
    return { ok: false, expiresAt: "", error: `Expiry cannot be more than ${MAX_SHARE_DAYS} days out.` };
  }
  return { ok: true, expiresAt: when.toISOString(), error: "" };
}

/**
 * Human-readable description of what a share grants, shown before the
 * candidate creates the link so they preview exactly what sharing reveals
 * (PASS-05).
 */
export function describeShareGrant(fields: readonly string[], expiresAt: string | null): string {
  const list = fields.length ? fields.join(", ") : "nothing";
  const until = expiresAt ? ` until ${expiresAt}` : " until you revoke it";
  return `Anyone with the link can view: ${list}${until}. They cannot see your email, employer-private notes, or hidden assessment material.`;
}
