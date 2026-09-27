import { suggestRoles } from "./rules";
import type { ExtractionResult } from "./github/types";
import { summariseCapabilities } from "./interpret";
import type { PassportData, PassportProject } from "./view";

export function projectFromResult(result: ExtractionResult, contributionStatement: string): PassportProject | null {
  if (!result.repository || !result.commitSha || result.status === "failed") return null;
  const repo = result.repository.fullName;
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
      treeTruncated: result.coverage.treeTruncated,
    },
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
  const evidence = projects.flatMap((p) => p.evidence);
  const roleSuggestions = suggestRoles(evidence);
  const capabilities = await summariseCapabilities(evidence, roleSuggestions);
  return { ...meta, projects, roleSuggestions, capabilities };
}
