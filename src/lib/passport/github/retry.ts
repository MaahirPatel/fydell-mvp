/**
 * Bounded retries for GitHub API access (GH-05).
 *
 * Transient failures (network timeouts, 5xx) are retried with exponential
 * backoff. Rate limits are retried at most once and only when GitHub says
 * the wait is short; anything else is terminal. `not_found` is never
 * retried: a missing repository will still be missing a second later.
 */

import { GithubError } from "./client";

export type RetryPolicy = {
  /** Total attempts including the first try. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Never wait longer than this for a rate-limit reset. */
  maxRateLimitWaitMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  maxRateLimitWaitMs: 30_000,
};

export function retryDelayMs(attempt: number, policy: RetryPolicy): number {
  return Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt);
}

export type RetryDecision =
  | { retry: false }
  | { retry: true; delayMs: number };

/** Pure decision function, exported so tests can pin the retry behaviour. */
export function shouldRetry(err: unknown, attempt: number, policy: RetryPolicy): RetryDecision {
  if (!(err instanceof GithubError)) return { retry: false };
  if (attempt + 1 >= policy.maxAttempts) return { retry: false };
  // A missing repository stays missing; a rejected credential never heals.
  if (err.code === "not_found" || err.code === "unauthorized") return { retry: false };
  if (err.code === "rate_limited") {
    const waitMs = (err.retryAfterSeconds ?? 60) * 1000;
    if (waitMs > policy.maxRateLimitWaitMs) return { retry: false };
    return { retry: true, delayMs: Math.min(waitMs, policy.maxRateLimitWaitMs) };
  }
  // "unavailable": timeouts, 5xx, refused hosts, malformed responses.
  return { retry: true, delayMs: retryDelayMs(attempt, policy) };
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
