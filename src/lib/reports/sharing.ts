/**
 * Employer chunk - REP-07: secure report sharing.
 *
 * A share token grants exactly one capability: viewing one report version.
 * It does not grant org membership, does not expose private notes or
 * decision history, and expires. The share viewer is served the
 * candidateSafeReport-equivalent reviewer surface minus internal material.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface ReportShare {
  id: string;
  reportId: string;
  reportVersion: number;
  orgId: string;
  tokenHash: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  /** Share links never carry reviewer-internal material. */
  scope: "report_view";
}

export interface ShareStore {
  shares: Map<string, ReportShare>; // key: tokenHash
}

export function createShareMemoryStore(): ShareStore {
  return { shares: new Map() };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function matches(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export type ShareError = "not_found" | "expired" | "revoked";

export type ShareResult<T> = { ok: true; value: T } | { ok: false; code: ShareError; message: string };

/** Create a scoped share link. Plaintext token returned exactly once. */
export function createReportShare(
  store: ShareStore,
  input: {
    reportId: string;
    reportVersion: number;
    orgId: string;
    createdBy: string;
    ttlHours?: number;
  }
): { share: ReportShare; token: string } {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const share: ReportShare = {
    id: `share-${tokenHash.slice(0, 12)}`,
    reportId: input.reportId,
    reportVersion: input.reportVersion,
    orgId: input.orgId,
    tokenHash,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (input.ttlHours ?? 168) * 3600_000).toISOString(),
    revokedAt: null,
    scope: "report_view",
  };
  store.shares.set(tokenHash, share);
  return { share, token };
}

/** Resolve a presented share token to its strictly-scoped grant. */
export function resolveReportShare(
  store: ShareStore,
  token: string
): ShareResult<{ reportId: string; reportVersion: number; orgId: string; scope: "report_view" }> {
  const share = [...store.shares.values()].find((s) => matches(token, s.tokenHash));
  if (!share) return { ok: false, code: "not_found", message: "share link not recognized" };
  if (share.revokedAt) return { ok: false, code: "revoked", message: "share link was revoked" };
  if (new Date(share.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: "expired", message: "share link expired" };
  }
  return {
    ok: true,
    value: {
      reportId: share.reportId,
      reportVersion: share.reportVersion,
      orgId: share.orgId,
      scope: share.scope,
    },
  };
}

export function revokeReportShare(store: ShareStore, shareId: string): boolean {
  const share = [...store.shares.values()].find((s) => s.id === shareId);
  if (!share) return false;
  share.revokedAt = new Date().toISOString();
  return true;
}
