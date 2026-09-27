function localValidate(value: unknown): { ok: true; expiresAt: string } | { ok: false; error: string } {
  return { ok: false, error: "x" };
}
export function f(opts: { expiresAt?: unknown }) {
  const expiry = localValidate(opts.expiresAt);
  if (!expiry.ok) {
    return { error: expiry.error };
  }
  return { ok: expiry.expiresAt };
}
