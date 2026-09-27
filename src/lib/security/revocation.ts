import "server-only";

/**
 * Revocation enforcement (SEC-10).
 *
 * Revoked access must prevent FUTURE imports/shares as defined, and in-flight
 * jobs must check permissions before publishing results. This module owns the
 * check; the durable store is public.revoked_grants (migration 030).
 */

export type RevocationScope = "import" | "share" | "read" | "write" | "all";

export interface RevocationEntry {
  subjectType: "user" | "organization" | "share_token" | "api_token" | "import_grant";
  subjectId: string;
  scope: RevocationScope;
  revokedAt: string;
  revokedBy?: string;
  reason?: string;
}

export interface RevocationStore {
  list(subjectType: RevocationEntry["subjectType"], subjectId: string): Promise<RevocationEntry[]>;
  revoke(entry: Omit<RevocationEntry, "revokedAt">): Promise<RevocationEntry>;
}

export function createMemoryRevocationStore(): RevocationStore & { entries: RevocationEntry[] } {
  const entries: RevocationEntry[] = [];
  return {
    entries,
    async list(subjectType, subjectId) {
      return entries.filter((e) => e.subjectType === subjectType && e.subjectId === subjectId);
    },
    async revoke(entry) {
      const full: RevocationEntry = { ...entry, revokedAt: new Date().toISOString() };
      const existing = entries.findIndex(
        (e) => e.subjectType === full.subjectType && e.subjectId === full.subjectId && e.scope === full.scope
      );
      if (existing >= 0) entries[existing] = full;
      else entries.push(full);
      return full;
    },
  };
}

/** True when any revocation covers the requested scope ('all' covers everything). */
export async function isRevoked(
  store: RevocationStore,
  subjectType: RevocationEntry["subjectType"],
  subjectId: string,
  scope: RevocationScope
): Promise<boolean> {
  const entries = await store.list(subjectType, subjectId);
  return entries.some((e) => e.scope === "all" || e.scope === scope);
}

/** Throws when the subject may not perform new processing in this scope. */
export async function assertNotRevoked(
  store: RevocationStore,
  subjectType: RevocationEntry["subjectType"],
  subjectId: string,
  scope: RevocationScope
): Promise<void> {
  if (await isRevoked(store, subjectType, subjectId, scope)) {
    const err = new Error(`Revoked: ${subjectType}:${subjectId} may not ${scope}.`);
    (err as { status?: number }).status = 403;
    throw err;
  }
}

/**
 * In-flight job guard: before publishing results, re-check that neither the
 * candidate's import grant nor the share token is revoked. Returns false when
 * the job must be dropped instead of published.
 */
export async function mayPublishResults(
  store: RevocationStore,
  opts: { candidateUserId: string; shareTokenId?: string | null }
): Promise<boolean> {
  if (await isRevoked(store, "user", opts.candidateUserId, "import")) return false;
  if (opts.shareTokenId && (await isRevoked(store, "share_token", opts.shareTokenId, "share"))) return false;
  return true;
}
