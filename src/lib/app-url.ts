/** Canonical public app URL for auth redirects (password reset, email links). */
export function appUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const raw = (fromEnv || "http://localhost:3000").replace(/\/$/, "");
  return raw;
}
