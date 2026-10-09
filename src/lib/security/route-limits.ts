import "server-only";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

/**
 * Route-level throttles for auth and spend-sensitive endpoints.
 *
 * Buckets are in-process per server instance, the same store semantics as
 * rate-limit.ts. They bound brute force and cost per instance; they are not a
 * global quota across a fleet.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

function prune(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

function current(key: string, now: number): Bucket | null {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return null;
  return bucket;
}

function hit(key: string, windowMs: number, now: number): Bucket {
  prune(now);
  const bucket = current(key, now);
  if (bucket) {
    bucket.count += 1;
    return bucket;
  }
  const fresh = { count: 1, resetAt: now + windowMs };
  buckets.set(key, fresh);
  return fresh;
}

function retryAfter(bucket: Bucket, now: number): number {
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Hashed so raw emails and IPs never sit in memory as bucket keys. */
function keyPart(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function tooManyRequests(retryAfterSeconds: number, message = "Too many requests. Try again later."): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" } }
  );
}

export interface LimitRule {
  /** bucket namespace, e.g. "signup" */
  name: string;
  limit: number;
  windowMs: number;
}

/** Counts every call. Returns a 429 response once the caller exceeds the rule, otherwise null. */
export function limitRequest(rule: LimitRule, identity: string, now: number = Date.now()): NextResponse | null {
  const bucket = hit(`req:${rule.name}:${keyPart(identity)}`, rule.windowMs, now);
  if (bucket.count > rule.limit) return tooManyRequests(retryAfter(bucket, now));
  return null;
}

export function limitByIp(req: Request, rule: LimitRule): NextResponse | null {
  return limitRequest(rule, `ip:${clientIp(req)}`);
}

export function limitByUser(userId: string, rule: LimitRule): NextResponse | null {
  return limitRequest(rule, `user:${userId}`);
}

/**
 * Failure-only counter for credential checks: successful sign-ins never use
 * up the budget, failed ones lock the identity out until the window passes.
 */
export const LOGIN_FAILURES: LimitRule = { name: "login-failure", limit: 10, windowMs: 15 * 60_000 };

export function loginLockout(identities: string[], now: number = Date.now()): NextResponse | null {
  for (const identity of identities) {
    const bucket = current(`fail:${LOGIN_FAILURES.name}:${keyPart(identity)}`, now);
    if (bucket && bucket.count >= LOGIN_FAILURES.limit) {
      return tooManyRequests(retryAfter(bucket, now), "Too many failed sign-in attempts. Try again later.");
    }
  }
  return null;
}

export function recordLoginFailure(identities: string[], now: number = Date.now()): void {
  for (const identity of identities) {
    hit(`fail:${LOGIN_FAILURES.name}:${keyPart(identity)}`, LOGIN_FAILURES.windowMs, now);
  }
}

export function loginIdentities(req: Request, email: string): string[] {
  return [`ip:${clientIp(req)}`, `email:${email}`];
}

/** Named rules so the same endpoint class gets the same budget everywhere. */
export const ROUTE_LIMITS = {
  signup: { name: "signup", limit: 10, windowMs: 60 * 60_000 },
  modelCall: { name: "model-call", limit: 120, windowMs: 60 * 60_000 },
  analysis: { name: "analysis", limit: 30, windowMs: 60 * 60_000 },
  importJob: { name: "import-job", limit: 20, windowMs: 60 * 60_000 },
  invite: { name: "invite", limit: 60, windowMs: 60 * 60_000 },
  upload: { name: "upload", limit: 60, windowMs: 60 * 60_000 },
} as const satisfies Record<string, LimitRule>;
