import type { RoleSuggestion } from "./github/types";
import { markSuperseded } from "./snapshots";

export type PassportEvidence = {
  id: string;
  repo: string;
  detector: string;
  category: string;
  finding: string;
  basis: "repository_observation" | "dependency_declaration";
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string[];
  sourceUrl: string;
  limitations: string[];
};

export type PassportProject = {
  repoFullName: string;
  htmlUrl: string;
  commitSha: string;
  primaryLanguage: string | null;
  isFork: boolean;
  contributionStatement: string;
  /** "stale" = superseded by a newer import of the same repository (GH-10). */
  status: "complete" | "partial" | "failed" | "stale";
  coverage: {
    totalFiles: number;
    analyzedFiles: number;
    skippedFiles: number;
    /** Languages observed in the analyzed files (GH-09). */
    languages: string[];
    /** Skipped-file counts by reason, so coverage is shown with reasons (GH-09). */
    skipReasons: Record<string, number>;
    treeTruncated: boolean;
  };
  analyzedAt: string;
  notices: string[];
  evidence: PassportEvidence[];
};

export type Capability = { statement: string; evidenceIds: string[] };

export type CapabilitySummary = {
  source: "model" | "rules";
  model?: string;
  capabilities: Capability[];
  notShown: string[];
  note?: string;
};

export type PassportData = {
  displayName: string;
  headline: string;
  githubLogin: string | null;
  projects: PassportProject[];
  roleSuggestions: RoleSuggestion[];
  capabilities: CapabilitySummary;
  updatedAt: string | null;
};

export const SHAREABLE_FIELDS = ["projects", "evidence", "roles", "capabilities"] as const;
export type ShareField = (typeof SHAREABLE_FIELDS)[number];

/** Projects a passport onto the fields a share link allows. Nothing outside the allowlist leaves the server. */
export function projectForShare(passport: PassportData, fields: readonly ShareField[]): PassportData {
  const allow = new Set(fields);
  // Superseded snapshots are never shared: shares always show current
  // evidence, and previously shared records keep pointing at the evidence
  // they cited rather than being silently rewritten (GH-10). Reconciled
  // here as well as at load time so no caller can leak a stale snapshot.
  const current = markSuperseded(passport.projects).filter((p) => p.status !== "stale");
  return {
    displayName: passport.displayName,
    headline: passport.headline,
    githubLogin: passport.githubLogin,
    projects: allow.has("projects")
      ? current.map((p) => ({ ...p, evidence: allow.has("evidence") ? p.evidence : [] }))
      : [],
    roleSuggestions: allow.has("roles") ? passport.roleSuggestions : [],
    capabilities: allow.has("capabilities") && allow.has("evidence")
      ? passport.capabilities
      : { source: passport.capabilities.source, capabilities: [], notShown: [] },
    updatedAt: passport.updatedAt,
  };
}

/**
 * One-line coverage statement for display (GH-09). Partial coverage is
 * stated as partial — it is never presented as a complete skill profile.
 */
export function describeCoverage(p: PassportProject): string {
  const { totalFiles, analyzedFiles, skippedFiles, languages, skipReasons, treeTruncated } = p.coverage;
  const langs = languages.length ? ` (${languages.join(", ")})` : "";
  const reasons = Object.entries(skipReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, n]) => `${n} ${reason.replace(/_/g, " ")}`)
    .join(", ");
  const skipped = skippedFiles > 0 ? `; ${skippedFiles} skipped${reasons ? ` (${reasons})` : ""}` : "";
  const truncated = treeTruncated ? "; file list truncated by GitHub" : "";
  const partial = p.status === "partial" ? " — partial analysis" : "";
  return `Analyzed ${analyzedFiles} of ${totalFiles} files${langs}${skipped}${truncated}${partial}.`;
}

/**
 * Empty-passport statement (PASS-04). No repositories means there is not
 * enough portfolio evidence to assess — never a claim about ability.
 */
export function emptyPassportNote(): string {
  return "No public repositories have been added yet, so there is not enough portfolio evidence to assess. This says nothing about ability — candidates can also demonstrate skill through a Fydell simulation, which needs no GitHub history.";
}
