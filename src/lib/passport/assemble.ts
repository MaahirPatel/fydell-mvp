import { suggestRoles } from "./rules";
import type { ExtractionResult } from "./github/types";
import { summariseCapabilities } from "./interpret";
import type { PassportData, PassportProject } from "./view";

export function projectFromResult(result: ExtractionResult, contributionStatement: string): PassportProject | null {
  if (!result.repository || !result.commitSha || result.status === "failed") return null;
  const repo = result.repository.fullName;
  const skipReasons: Record<string, number> = {};
  for (const s of result.coverage.skipped) skipReasons[s.reason] = (skipReasons[s.reason] ?? 0) + 1;
  return {
    repoFullName: repo,
    htmlUrl: result.repository.htmlUrl,
    commitSha: result.commitSha,
    primaryLanguage: result.repository.primaryLanguage,
    isFork: result.repository.fork,
    contributionStatement,
    status: result.status,
    coverage: {
      totalFiles: result.coverage.totalFiles,
      analyzedFiles: result.coverage.analyzedFiles,
      skippedFiles: result.coverage.skipped.length,
      languages: result.coverage.languages,
      skipReasons,
      treeTruncated: result.coverage.treeTruncated,
    },
    analyzedAt: new Date().toISOString(),
    notices: result.notices,
    evidence: result.findings.map((f) => ({
      id: f.id,
      repo,
      detector: f.detector,
      category: f.category,
      finding: f.finding,
      basis: f.basis,
      path: f.path,
      startLine: f.startLine,
      endLine: f.endLine,
      excerpt: f.excerpt,
      sourceUrl: f.sourceUrl,
      limitations: f.limitations,
    })),
  };
}

export async function assemblePassport(
  projects: PassportProject[],
  meta: { displayName: string; headline: string; githubLogin: string | null; updatedAt: string | null },
): Promise<PassportData> {
  // Summaries and role suggestions are built from current snapshots only;
  // superseded (stale) evidence stays visible for provenance but no longer
  // feeds new interpretations (GH-10).
  const current = projects.filter((p) => p.status !== "stale");
  const evidence = current.flatMap((p) => p.evidence);
  const roleSuggestions = suggestRoles(evidence);
  const capabilities = await summariseCapabilities(evidence, roleSuggestions);
  return { ...meta, projects, roleSuggestions, capabilities };
}
