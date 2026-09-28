/**
 * Snapshot reconciliation for idempotent reimports (GH-10).
 *
 * Retrying the same snapshot (same repository, same commit SHA) must not
 * duplicate findings: finding ids are deterministic in the commit SHA, and
 * evidence rows are keyed by (project_id, finding id). Importing a newer
 * snapshot must not silently rewrite what was shared: older snapshots of the
 * same repository are kept and marked "stale" so provenance is preserved and
 * previously shared records still resolve to the evidence they cited.
 */

import type { PassportProject } from "./view";

const repoKey = (fullName: string) => fullName.toLowerCase();

/**
 * Marks every snapshot of a repository except the most recently analyzed
 * one as "stale". Pure: the store applies it to loaded projects and the
 * share projection drops stale snapshots.
 */
export function markSuperseded(projects: PassportProject[]): PassportProject[] {
  const latest = new Map<string, PassportProject>();
  for (const p of projects) {
    const key = repoKey(p.repoFullName);
    const current = latest.get(key);
    if (!current || p.analyzedAt >= current.analyzedAt) latest.set(key, p);
  }
  const latestIds = new Set([...latest.values()].map((p) => `${repoKey(p.repoFullName)}|${p.commitSha}|${p.analyzedAt}`));
  return projects.map((p) =>
    latestIds.has(`${repoKey(p.repoFullName)}|${p.commitSha}|${p.analyzedAt}`) ? p : { ...p, status: "stale" as const },
  );
}

/** Snapshots currently shown to the candidate and eligible for sharing. */
export function currentSnapshots(projects: PassportProject[]): PassportProject[] {
  return markSuperseded(projects).filter((p) => p.status !== "stale");
}

/**
 * Idempotency check: two extractions of the same snapshot must yield the
 * same finding ids in the same set, so a retry can upsert without
 * duplicating or losing findings.
 */
export function findingsAreIdempotent(a: Array<{ id: string }>, b: Array<{ id: string }>): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((f) => f.id));
  return b.every((f) => ids.has(f.id));
}
