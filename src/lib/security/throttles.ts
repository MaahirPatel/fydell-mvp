import "server-only";

/**
 * Per-route throttles for abuse- and spend-sensitive endpoints (SEC-08):
 * login, invites, uploads, imports, AI conversations, sandbox runs.
 *
 * The production store is in-process per serverless instance (see
 * src/lib/security/rate-limit.ts). These named policies give every sensitive
 * route the same semantics; route handlers call checkThrottle() before doing
 * any expensive work (auth, email sends, compute).
 */

export type ThrottleRoute =
  | "login"
  | "invite"
  | "upload"
  | "import"
  | "ai_conversation"
  | "sandbox_run"
  | "demo_reset"
  | "demo_teammate"
  | "demo_teammate_global";

export interface ThrottlePolicy {
  /** max attempts per window */
  limit: number;
  /** window length in ms */
  windowMs: number;
  /** scope of the bucket key: per-IP, per-user, or global */
  scope: "ip" | "user" | "global";
  retryAfterSeconds: number;
}

export const THROTTLE_POLICIES: Record<ThrottleRoute, ThrottlePolicy> = {
  login: { limit: 10, windowMs: 10 * 60_000, scope: "ip", retryAfterSeconds: 600 },
  invite: { limit: 20, windowMs: 60 * 60_000, scope: "user", retryAfterSeconds: 3600 },
  upload: { limit: 30, windowMs: 60 * 60_000, scope: "user", retryAfterSeconds: 3600 },
  import: { limit: 10, windowMs: 60 * 60_000, scope: "user", retryAfterSeconds: 3600 },
  ai_conversation: { limit: 60, windowMs: 60 * 60_000, scope: "user", retryAfterSeconds: 3600 },
  sandbox_run: { limit: 10, windowMs: 60 * 60_000, scope: "user", retryAfterSeconds: 3600 },
  demo_reset: { limit: 5, windowMs: 60 * 60_000, scope: "ip", retryAfterSeconds: 3600 },
  demo_teammate: { limit: 40, windowMs: 60 * 60_000, scope: "ip", retryAfterSeconds: 3600 },
  demo_teammate_global: { limit: 600, windowMs: 60 * 60_000, scope: "global", retryAfterSeconds: 3600 },
};

interface Bucket {
  count: number;
  resetAt: number;
}

export interface ThrottleStore {
  get(key: string): Bucket | undefined;
  set(key: string, bucket: Bucket): void;
  clear?(): void;
}

export function createMemoryThrottleStore(): ThrottleStore {
  const map = new Map<string, Bucket>();
  return {
    get: (key) => map.get(key),
    set: (key, bucket) => map.set(key, bucket),
    clear: () => map.clear(),
  };
}

export interface ThrottleCheck {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function bucketKey(route: ThrottleRoute, identity: string): string {
  return `throttle:${route}:${identity}`;
}

/**
 * Returns { ok: false } when the caller has exhausted the route's quota.
 * `now` is injectable so tests can advance time without sleeping.
 */
export function checkThrottle(
  route: ThrottleRoute,
  identity: string,
  store: ThrottleStore,
  policyOverride?: Partial<ThrottlePolicy>,
  now: number = Date.now()
): ThrottleCheck {
  const policy = { ...THROTTLE_POLICIES[route], ...policyOverride };
  if (!identity) return { ok: false, remaining: 0, retryAfterSeconds: policy.retryAfterSeconds };
  const key = bucketKey(route, identity);
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { ok: true, remaining: policy.limit - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= policy.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  store.set(key, current);
  return { ok: true, remaining: policy.limit - current.count, retryAfterSeconds: 0 };
}

/** Extracts the throttle identity from a request for a given policy scope. */
export function throttleIdentity(req: Request, policy: ThrottlePolicy, userId?: string | null): string {
  if (policy.scope === "user") return userId ? `user:${userId}` : "";
  if (policy.scope === "global") return "global";
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${forwarded || "unknown"}`;
}
