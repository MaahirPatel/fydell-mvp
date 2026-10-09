import { ROLE_REQUIREMENTS } from "./catalog";
import type { CapabilityEntry, CapabilityReview, Coverage } from "./types";

export type ProfileCapabilityExample = {
  title: string;
  project: string;
  snapshotId: string | null;
  findingId: string | null;
  scope: CapabilityEntry["scope"];
};

export type ProfileCapabilityGroup = {
  requirementId: string;
  label: string;
  coverage: Coverage;
  /** Distinct capabilities linked to the engineer by commits. Identical code in forks or copies counts once. */
  linked: number;
  /** Distinct capabilities seen only in projects nothing links the engineer to. */
  projectOnly: number;
  projects: string[];
  examples: ProfileCapabilityExample[];
  followUp: string | null;
};

const RANK: Record<Coverage, number> = { supports: 0, partially_supports: 1, contradicted: 2, insufficient_evidence: 3, not_assessed: 4 };

function dedupeKey(c: CapabilityEntry): string {
  const at = c.evidence.find((e) => e.kind === "source_lines" || e.kind === "test_file");
  return at && (at.kind === "source_lines" || at.kind === "test_file") ? `${c.detector}:${at.path}:${at.startLine}-${at.endLine}` : `${c.detector}:${c.title}`;
}

/**
 * Profile-level capability groups across stored project reports. Coverage is
 * the strongest any one project gives for the requirement; counts and
 * examples are deduplicated so a fork and its original count once.
 */
export function profileCapabilityGroups(reviews: CapabilityReview[]): ProfileCapabilityGroup[] {
  const labels = new Map(Object.values(ROLE_REQUIREMENTS).flatMap((r) => r.requirements.map((q) => [q.id, q.label] as const)));
  const out = new Map<string, ProfileCapabilityGroup & { seen: Set<string> }>();
  for (const review of reviews) {
    for (const set of review.requirementSets) {
      for (const req of set.requirements) {
        if (req.coverage === "not_assessed" && !req.capabilityIds.length) continue;
        const g =
          out.get(req.id) ??
          ({ requirementId: req.id, label: labels.get(req.id) ?? req.label, coverage: req.coverage, linked: 0, projectOnly: 0, projects: [], examples: [], followUp: null, seen: new Set<string>() } as ProfileCapabilityGroup & { seen: Set<string> });
        if (RANK[req.coverage] < RANK[g.coverage]) g.coverage = req.coverage;
        for (const id of req.capabilityIds) {
          const c = review.capabilities.find((x) => x.id === id);
          if (!c || c.status !== "supported") continue;
          const key = dedupeKey(c);
          if (g.seen.has(key)) continue;
          g.seen.add(key);
          if (c.scope === "person") g.linked += 1;
          else g.projectOnly += 1;
          if (!g.projects.includes(c.project)) g.projects.push(c.project);
          g.examples.push({ title: c.title, project: c.project, snapshotId: review.subject.snapshotId, findingId: c.findingIds[0] ?? null, scope: c.scope });
          if (!g.followUp && c.scope === "person") g.followUp = c.followUp;
        }
        out.set(req.id, g);
      }
    }
  }
  return [...out.values()]
    .filter((g) => g.linked + g.projectOnly > 0 || g.coverage === "contradicted")
    .map((g) => ({
      requirementId: g.requirementId,
      label: g.label,
      coverage: g.coverage,
      linked: g.linked,
      projectOnly: g.projectOnly,
      projects: g.projects,
      followUp: g.followUp,
      examples: [...g.examples].sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "person" ? -1 : 1)).slice(0, 3) }))
    .sort((a, b) => RANK[a.coverage] - RANK[b.coverage] || b.linked - a.linked || a.label.localeCompare(b.label));
}
