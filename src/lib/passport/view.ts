import type { RoleSuggestion } from "./github/types";

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
  status: "complete" | "partial" | "failed";
  coverage: { totalFiles: number; analyzedFiles: number; skippedFiles: number; treeTruncated: boolean };
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
  return {
    displayName: passport.displayName,
    headline: passport.headline,
    githubLogin: passport.githubLogin,
    projects: allow.has("projects")
      ? passport.projects.map((p) => ({ ...p, evidence: allow.has("evidence") ? p.evidence : [] }))
      : [],
    roleSuggestions: allow.has("roles") ? passport.roleSuggestions : [],
    capabilities: allow.has("capabilities") && allow.has("evidence")
      ? passport.capabilities
      : { source: passport.capabilities.source, capabilities: [], notShown: [] },
    updatedAt: passport.updatedAt,
  };
}
