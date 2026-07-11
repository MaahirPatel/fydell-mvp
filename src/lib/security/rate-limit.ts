import "server-only";

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Simple in-process rate limiter (per serverless instance). */
export function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60 * 60 * 1000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}
