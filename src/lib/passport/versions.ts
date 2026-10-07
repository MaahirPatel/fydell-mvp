import type { PassportEvidence, PassportProject } from "./view";

/** All snapshots of one repository, newest first. */
export function versionsOf(projects: PassportProject[], repoFullName: string): PassportProject[] {
  const repo = repoFullName.toLowerCase();
  return projects
    .filter((p) => p.repoFullName.toLowerCase() === repo)
    .sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt));
}

export type FindingDiff = {
  added: PassportEvidence[];
  removed: PassportEvidence[];
  /** Same detector and file, but the cited lines moved or changed. */
  changed: Array<{ before: PassportEvidence; after: PassportEvidence }>;
  unchanged: number;
};

/**
 * Finding ids are tied to a commit, so versions are compared by what was
 * observed (detector and file), not by id.
 */
function observationKey(e: PassportEvidence): string {
  return `${e.detector}\u0000${e.path}`;
}

export function diffFindings(previous: PassportEvidence[], current: PassportEvidence[]): FindingDiff {
  const before = new Map<string, PassportEvidence[]>();
  for (const e of previous) {
    const k = observationKey(e);
    before.set(k, [...(before.get(k) ?? []), e]);
  }
  const diff: FindingDiff = { added: [], removed: [], changed: [], unchanged: 0 };
  for (const e of current) {
    const k = observationKey(e);
    const pool = before.get(k);
    if (!pool?.length) {
      diff.added.push(e);
      continue;
    }
    const exact = pool.findIndex((p) => p.startLine === e.startLine && p.endLine === e.endLine && p.excerpt.join("\n") === e.excerpt.join("\n"));
    const match = pool.splice(exact >= 0 ? exact : 0, 1)[0];
    if (exact >= 0) diff.unchanged += 1;
    else diff.changed.push({ before: match, after: e });
  }
  for (const rest of before.values()) diff.removed.push(...rest);
  return diff;
}
