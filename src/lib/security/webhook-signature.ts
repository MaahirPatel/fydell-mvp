import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix webhook signatures, the scheme Resend uses.
 *
 * Signed content is `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256
 * keyed with the base64 part of the `whsec_` secret, base64 encoded. The
 * `svix-signature` header holds one or more space-separated `v1,<sig>` values
 * (several during secret rotation). Timestamps outside the tolerance are
 * rejected so a captured request cannot be replayed later.
 */

export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export type SvixVerification = { ok: true } | { ok: false; reason: "missing_headers" | "bad_secret" | "stale_timestamp" | "bad_signature" };

export function svixHeaders(headers: Headers): SvixHeaders {
  return {
    id: headers.get("svix-id") ?? headers.get("webhook-id"),
    timestamp: headers.get("svix-timestamp") ?? headers.get("webhook-timestamp"),
    signature: headers.get("svix-signature") ?? headers.get("webhook-signature"),
  };
}

function secretKey(secret: string): Buffer | null {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const key = Buffer.from(encoded, "base64");
  return key.length > 0 ? key : null;
}

export function signSvix(secret: string, id: string, timestamp: string, rawBody: string): string {
  const key = secretKey(secret);
  if (!key) throw new Error("Invalid webhook secret.");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
}

export function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): SvixVerification {
  if (!headers.id || !headers.timestamp || !headers.signature) return { ok: false, reason: "missing_headers" };
  if (!secretKey(secret)) return { ok: false, reason: "bad_secret" };
  if (!/^\d{1,12}$/.test(headers.timestamp)) return { ok: false, reason: "stale_timestamp" };
  const timestamp = Number(headers.timestamp);
  if (Math.abs(nowSeconds - timestamp) > SVIX_TOLERANCE_SECONDS) return { ok: false, reason: "stale_timestamp" };

  const expected = Buffer.from(signSvix(secret, headers.id, headers.timestamp, rawBody));
  for (const entry of headers.signature.split(" ")) {
    const [version, signature] = entry.split(",", 2);
    if (version !== "v1" || !signature) continue;
    const given = Buffer.from(signature);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return { ok: true };
  }
  return { ok: false, reason: "bad_signature" };
}
