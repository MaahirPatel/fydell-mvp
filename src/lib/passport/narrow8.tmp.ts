import { validateExpiryInput } from "./sharing";
export function f(opts: { expiresAt?: unknown }) {
  const expiry = validateExpiryInput(opts.expiresAt);
  const probe: "must-error" = expiry;
  if (!expiry.ok) {
    return { error: expiry.error };
  }
  return { ok: expiry.expiresAt };
}
