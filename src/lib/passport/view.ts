import type { AnalysisChecks, ContributionSignals, Entailment, RoleSuggestion } from "./github/types";
import { markSuperseded } from "./snapshots";
import type { ContributionContext, DecisionRecord, EvidenceRef } from "./context-contract";
import type { ProjectPresentation } from "./presentation";

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
  /** Absent on findings stored before entailment checks existed. */
  entailment?: Entailment | null;
};

export type PassportProject = {
  /** Snapshot (report version) id. Absent for unsaved previews. */
  id?: string;
  /** Branch the commit was resolved from at import time. */
  revisionRef?: string | null;
  analysisVersion?: string | null;
  /** Immutable version of this snapshot's analysis that a report cites. Set when a report is built. */
  snapshotVersion?: number | null;
  importerVersion?: string | null;
  /** Stored analysis outcome, kept even when `status` is marked "stale". */
  analysisStatus?: "complete" | "partial";
  repoFullName: string;
  /** "upload" projects have no hosted source: `htmlUrl` and evidence `sourceUrl` are empty. */
  sourceKind?: "github" | "upload";
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
  /** Contribution evidence captured at import. Absent on snapshots imported before it was recorded. */
  contributionSignals?: ContributionSignals | null;
  /** Comment contradictions, rejected claims and ignored instructions from the analysis. */
  checks?: AnalysisChecks | null;
};

export type Capability = { statement: string; evidenceIds: string[] };

export type CapabilitySummary = {
  /** "project": statements describe what the code shows, never the person. Summaries without it predate that rule. */
  scope?: "project";
  source: "model" | "rules";
  model?: string;
  capabilities: Capability[];
  notShown: string[];
  note?: string;
};

/**
 * An engineer's attributed statement about a finding. Context explains;
 * "inaccurate" disputes; "correction" proposes a different interpretation.
 * None of these is independently verified, and none changes the finding.
 */
export type EngineerNote = {
  id: string;
  findingId: string;
  kind: "context" | "inaccurate" | "correction";
  text: string;
  proposedInterpretation: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string;
};

export type VersionPolicy = "follow" | "pinned";

export type ShareScope = {
  versionPolicy: VersionPolicy;
  label: string;
};

export type PassportData = {
  displayName: string;
  headline: string;
  githubLogin: string | null;
  projects: PassportProject[];
  roleSuggestions: RoleSuggestion[];
  capabilities: CapabilitySummary;
  updatedAt: string | null;
  /** Engineer statements attached to findings in the included projects. */
  engineerNotes?: EngineerNote[];
  /** Present on shared projections: how the link resolves versions. */
  shareScope?: ShareScope;
  /** Engineer-written contribution statements, keyed to included repositories. */
  contributions?: ContributionContext[];
  /** Engineer-written decision records for included repositories. */
  decisions?: DecisionRecord[];
  /**
   * Engineer-authored presentation per project, including manual projects
   * with no analyzed source. Before projection this holds private entries
   * too; projectForShare removes them and the repositories they cover.
   */
  presentations?: ProjectPresentation[];
};

export const SHAREABLE_FIELDS = ["projects", "evidence", "roles", "capabilities"] as const;
export type ShareField = (typeof SHAREABLE_FIELDS)[number];

export type ShareSelection = {
  /** Repositories the link includes; null means every current project. */
  repos?: string[] | null;
  /** Exact snapshot ids for a pinned link; these resolve even after re-analysis. */
  pinnedProjectIds?: string[] | null;
  versionPolicy?: VersionPolicy;
  label?: string;
};

/**
 * Selects the project snapshots a share resolves to. Pinned links return the
 * exact snapshots recorded at creation. Following links return the latest
 * snapshot of each selected repository. Superseded snapshots never leak into
 * a following link.
 */
export function selectSharedProjects(projects: PassportProject[], selection: ShareSelection = {}): PassportProject[] {
  if (selection.versionPolicy === "pinned" && selection.pinnedProjectIds) {
    const ids = new Set(selection.pinnedProjectIds);
    return projects
      .filter((p) => p.id && ids.has(p.id))
      .map((p) => ({ ...p, status: p.status === "stale" ? (p.analysisStatus ?? "complete") : p.status }));
  }
  const current = markSuperseded(projects).filter((p) => p.status !== "stale");
  if (!selection.repos) return current;
  const wanted = new Set(selection.repos.map((r) => r.toLowerCase()));
  return current.filter((p) => wanted.has(p.repoFullName.toLowerCase()));
}

/** Projects a passport onto the fields a share link allows. Nothing outside the allowlist leaves the server. */
export function projectForShare(passport: PassportData, fields: readonly ShareField[], selection: ShareSelection = {}): PassportData {
  const allow = new Set(fields);
  const privateRepos = new Set(
    (passport.presentations ?? []).filter((p) => p.visibility === "private" && p.sourceKind !== "manual").map((p) => p.projectKey.toLowerCase()),
  );
  const included = selectSharedProjects(passport.projects, selection).filter((p) => !privateRepos.has(p.repoFullName.toLowerCase()));
  const includedFindings = new Set(included.flatMap((p) => p.evidence.map((e) => e.id)));
  const evidenceAllowed = allow.has("evidence");
  const projected: PassportData = {
    displayName: passport.displayName,
    headline: passport.headline,
    githubLogin: passport.githubLogin,
    projects: allow.has("projects")
      ? included.map((p) => ({ ...p, evidence: evidenceAllowed ? p.evidence : [] }))
      : [],
    roleSuggestions: allow.has("roles") ? passport.roleSuggestions : [],
    capabilities: allow.has("capabilities") && evidenceAllowed
      ? {
          ...passport.capabilities,
          capabilities: passport.capabilities.capabilities.filter((c) => c.evidenceIds.some((id) => includedFindings.has(id))),
        }
      : { source: passport.capabilities.source, capabilities: [], notShown: [] },
    updatedAt: passport.updatedAt,
  };
  if (evidenceAllowed && passport.engineerNotes) {
    projected.engineerNotes = passport.engineerNotes.filter((n) => includedFindings.has(n.findingId));
  }
  if (allow.has("projects")) {
    const repos = new Set(included.map((p) => p.repoFullName));
    const snapshotIds = new Set(included.map((p) => p.id).filter((id): id is string => !!id));
    // References may only point into the snapshots this link actually shows.
    const scopeRefs = (refs: EvidenceRef[]) =>
      evidenceAllowed ? refs.filter((r) => snapshotIds.has(r.projectId) && (!r.findingId || includedFindings.has(r.findingId))) : [];
    if (passport.contributions) {
      projected.contributions = passport.contributions
        .filter((c) => repos.has(c.repoFullName))
        .map((c) => ({ ...c, evidenceRefs: scopeRefs(c.evidenceRefs) }));
    }
    if (passport.decisions) {
      projected.decisions = passport.decisions
        .filter((d) => repos.has(d.repoFullName) && !d.withdrawnAt)
        .map((d) => ({ ...d, evidenceRefs: scopeRefs(d.evidenceRefs) }));
    }
    if (passport.presentations) {
      const lowerRepos = new Set([...repos].map((r) => r.toLowerCase()));
      const wanted = selection.repos ? new Set(selection.repos.map((r) => r.toLowerCase())) : null;
      projected.presentations = passport.presentations
        .filter((p) => p.visibility === "shareable")
        .filter((p) => (p.sourceKind === "manual" ? !wanted || wanted.has(p.projectKey.toLowerCase()) : lowerRepos.has(p.projectKey.toLowerCase())))
        .map((p) => ({ ...p, id: null, version: 0 }));
    }
  }
  if (selection.versionPolicy) projected.shareScope = { versionPolicy: selection.versionPolicy, label: selection.label ?? "" };
  return projected;
}

/**
 * One-line coverage statement for display (GH-09). Partial coverage is
 * stated as partial - it is never presented as a complete skill profile.
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
  const partial = p.status === "partial" ? ". Partial analysis" : "";
  return `Analyzed ${analyzedFiles} of ${totalFiles} files${langs}${skipped}${truncated}${partial}.`;
}

/**
 * Empty-passport statement (PASS-04). No repositories means there is not
 * enough portfolio evidence to assess - never a claim about ability.
 */
export function emptyPassportNote(): string {
  return "No public repositories have been added yet, so there is not enough portfolio evidence to assess. This says nothing about ability. Candidates can also demonstrate skill through a Fydell simulation, which needs no GitHub history.";
}
