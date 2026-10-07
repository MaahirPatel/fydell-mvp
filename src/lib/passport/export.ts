/**
 * Portable passport export (PASS-08).
 *
 * Builds a self-contained, usable record of the passport the candidate can
 * keep or hand to anyone: projects with source-linked evidence, role
 * suggestions, capability summaries, and their own corrections. It never
 * includes employer-private notes, hidden tests, or anything outside the
 * candidate's own passport data - those live in other tables and are not
 * reachable from this builder by construction.
 */

import type { Correction } from "./corrections";
import type { PassportData } from "./view";

export const PASSPORT_EXPORT_VERSION = "passport-export-v1";

export function exportPassport(passport: PassportData, corrections: Correction[] = []): Record<string, unknown> {
  const byFinding = new Map<string, Correction[]>();
  for (const c of corrections) {
    const list = byFinding.get(c.findingId) ?? [];
    list.push({
      ...c,
      // The export is the candidate's own record; internal row ids stay server-side.
      id: undefined,
      projectId: undefined,
    });
    byFinding.set(c.findingId, list);
  }

  return {
    format: PASSPORT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    owner: {
      displayName: passport.displayName,
      headline: passport.headline,
      githubLogin: passport.githubLogin,
    },
    privacy: [
      "This export contains only your own data: your profile details, projects you added, the findings extracted from them, and corrections you filed.",
      "It never contains employer-private notes, hidden assessment material, or anyone else's data.",
    ],
    projects: passport.projects.map((p) => ({
      repository: p.repoFullName,
      url: p.htmlUrl,
      commitSha: p.commitSha,
      primaryLanguage: p.primaryLanguage,
      isFork: p.isFork,
      status: p.status,
      analyzedAt: p.analyzedAt,
      coverage: p.coverage,
      notices: p.notices,
      contributionStatement: p.contributionStatement || undefined,
      evidence: p.evidence.map((e) => ({
        id: e.id,
        detector: e.detector,
        category: e.category,
        finding: e.finding,
        basis: e.basis,
        attribution: "unverified",
        path: e.path,
        lines: `${e.startLine}-${e.endLine}`,
        excerpt: e.excerpt,
        sourceUrl: e.sourceUrl,
        limitations: e.limitations,
        corrections: (byFinding.get(e.id) ?? []).map((c) => ({
          reason: c.reason,
          status: c.status,
          filedAt: c.createdAt,
          resolvedAt: c.resolvedAt,
          resolutionNote: c.resolutionNote || undefined,
        })),
      })),
    })),
    roleSuggestions: passport.roleSuggestions,
    capabilities: passport.capabilities,
    correctionsFiled: corrections.length,
  };
}
