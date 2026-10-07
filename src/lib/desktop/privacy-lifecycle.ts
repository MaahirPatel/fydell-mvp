/**
 * Local privacy lifecycle (DESK-18).
 *
 * Documents what is cached locally (code, messages, drafts, diagnostics),
 * how the cache is scoped, and how sign-out is handled safely:
 *  - Cache is scoped to account+attempt: another signed-in user never sees
 *    prior work.
 *  - Tokens live in OS-protected storage, never in the cache or logs.
 *  - Sign-out with unsynced drafts warns and keeps local drafts; it never
 *    silently discards candidate work.
 *
 * Actual OS keychain access is platform code (NEEDS-LIVE); the scoping and
 * sign-out rules here are pure and unit-tested.
 */

export interface CacheScope {
  accountId: string;
  attemptId: string;
}

/** Storage key prefix scoping every cached entry to account+attempt. */
export function scopeKey(scope: CacheScope): string {
  return `account:${scope.accountId}:attempt:${scope.attemptId}`;
}

/** True when a cached entry belongs to the currently signed-in account. */
export function cacheVisibleToAccount(
  entryAccountId: string,
  currentAccountId: string
): boolean {
  return entryAccountId === currentAccountId;
}

export type CachedKind = "code" | "messages" | "draft" | "diagnostics";

/** Everything the app may cache locally, with retention notes. */
export const CACHED_KINDS: readonly { kind: CachedKind; note: string }[] = [
  { kind: "code", note: "Working copies of assignment files for offline editing." },
  { kind: "messages", note: "Teammate updates and brief snapshots for offline reading." },
  { kind: "draft", note: "Unsynced edits, kept until the sync layer acknowledges them." },
  { kind: "diagnostics", note: "Capped local error ring for support; no code or secrets." },
];

/** Token handling rules. Tokens are never cached with work data. */
export const TOKEN_RULES: readonly string[] = [
  "Sign-in tokens are stored in OS-protected storage only.",
  "Tokens are never written to the work cache, logs, or diagnostics.",
  "Tokens are never placed in URLs.",
];

export type SignOutPlan =
  | {
      action: "purge";
      detail: string;
    }
  | {
      action: "warn_keep_local";
      unsyncedDrafts: number;
      detail: string;
    };

/**
 * Decide sign-out handling. With unsynced drafts the app warns and keeps
 * local drafts (scoped to the account, invisible to the next user) rather
 * than discarding work. Without drafts it purges the scoped cache.
 */
export function planSignOut(args: { unsyncedDrafts: number }): SignOutPlan {
  if (args.unsyncedDrafts > 0) {
    return {
      action: "warn_keep_local",
      unsyncedDrafts: args.unsyncedDrafts,
      detail: `You have ${args.unsyncedDrafts} unsynced draft(s). They stay on this device, visible only to your account. Sign in again to sync, or discard them explicitly.`,
    };
  }
  return {
    action: "purge",
    detail: "No unsynced work. The account-scoped cache (code, messages, diagnostics) will be deleted.",
  };
}

/** Manifest of what purging a scope deletes - used by the purge routine and docs. */
export function purgeScopeManifest(scope: CacheScope): { scopeKey: string; kinds: CachedKind[] } {
  return {
    scopeKey: scopeKey(scope),
    kinds: CACHED_KINDS.map((c) => c.kind),
  };
}
