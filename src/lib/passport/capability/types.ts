/**
 * Capability review: six separately stored evidence layers and a bounded
 * synthesis built only from explicitly linked evidence.
 *
 *   project observation    what exists in one source snapshot
 *   contribution evidence  what connects a change to this engineer
 *   task demonstration     what happened in a scoped, observed task
 *   engineer statement     context the engineer supplied, unverified
 *   reviewer judgment      a human interpretation, attributed
 *   capability synthesis   a bounded conclusion from linked evidence
 *
 * Evidence basis and requirement coverage are separate dimensions: "Executed
 * test" says how something was observed; "Supports this requirement" says
 * what it means for one requirement. Nothing here is a single "Observed" flag.
 */
import type { RoleKey } from "@/lib/simulations/types";
import type { ProjectRelationship } from "../context-contract";

export const CAPABILITY_SCHEMA_VERSION = "capability-review-v1";

export type EvidenceBasis = "inspected_code" | "executed_test" | "task_demonstration" | "engineer_statement" | "reviewer_judgment";

export const BASIS_LABEL: Record<EvidenceBasis, string> = {
  inspected_code: "Inspected code",
  executed_test: "Executed test",
  task_demonstration: "Task demonstration",
  engineer_statement: "Engineer statement",
  reviewer_judgment: "Reviewer judgment",
};

export type Coverage = "supports" | "partially_supports" | "insufficient_evidence" | "contradicted" | "not_assessed";

export const COVERAGE_LABEL: Record<Coverage, string> = {
  supports: "Supports this requirement",
  partially_supports: "Partly supports this requirement",
  insufficient_evidence: "Insufficient evidence",
  contradicted: "Contradicted by the source",
  not_assessed: "Not assessed",
};

/** Roles in the simulation catalog that the source analysis has dimensions for. */
export type SupportedRole = Extract<RoleKey, "backend_engineer" | "applied_ai_engineer">;

export type AttributionLevel = "commit_signal" | "partial_commit_signal" | "statement_only" | "none" | "not_assessable";

export type AutomaticAttributionReason =
  | "fork"
  | "owner_mismatch"
  | "no_login"
  | "no_history"
  | "history_unavailable"
  | "not_recorded"
  | "reference_declared"
  | "no_commits_on_cited_paths";

export type PathSignal = { path: string; commitsByLogin: number; latest: { sha: string; subject: string; authoredAt: string } | null };

export type Attribution = {
  level: AttributionLevel;
  /** True when at least one cited path carries contribution evidence for this engineer. */
  personClaimsAllowed: boolean;
  relationship: ProjectRelationship;
  relationshipSource: "engineer" | "not_stated";
  automatic: Array<{ reason: AutomaticAttributionReason; detail: string }>;
  /** Plain-language contribution status. */
  summary: string;
  limits: string[];
  paths: PathSignal[];
  login: string | null;
  repositoryOwner: string | null;
};

export type ProjectObservation = {
  findingId: string;
  detector: string;
  /** Project-scoped: what this snapshot contains, never what someone can do. */
  statement: string;
  path: string;
  startLine: number;
  endLine: number;
  revision: string;
  sourceUrl: string | null;
  symbol: string | null;
  basis: "inspected_code";
  status: "supported" | "narrowed";
  narrowedBecause: string[];
  executed: false;
};

export type ContributionEvidenceItem = {
  kind: "commits_on_path" | "repository_owner" | "fork" | "no_history" | "not_checked";
  path: string | null;
  detail: string;
  commit: { sha: string; subject: string; authoredAt: string; url: string | null } | null;
  strength: "signal" | "none";
};

export type TaskDemonstration = {
  id: string;
  title: string;
  /** e.g. "Public tests executed in the Fydell sandbox: 6 of 6 passed". Only from recorded runs. */
  outcome: string;
  executed: boolean;
  at: string;
  href: string | null;
  requirementIds: string[];
};

export type EngineerStatement = {
  kind: "relationship" | "contribution" | "decision";
  label: string;
  text: string;
  findingIds: string[];
  version: number | null;
  updatedAt: string | null;
};

export type ReviewerJudgment = {
  reviewer: string;
  text: string;
  findingIds: string[];
  at: string;
};

export type CapabilityEvidence =
  | { kind: "source_lines"; findingId: string; path: string; startLine: number; endLine: number; revision: string; url: string | null }
  | { kind: "test_file"; findingId: string; path: string; startLine: number; endLine: number; revision: string; url: string | null; executed: false }
  | { kind: "commit"; sha: string; subject: string; authoredAt: string; url: string | null }
  | { kind: "statement"; text: string }
  | { kind: "task_event"; demonstrationId: string; outcome: string };

export type ContributionStatus = "linked_by_commits" | "stated_only" | "not_linked" | "reference_project" | "no_history";

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
  linked_by_commits: "Commits by the connected account",
  stated_only: "Engineer statement only",
  not_linked: "Not linked to the engineer",
  reference_project: "Reference project",
  no_history: "No commit history",
};

export type CapabilityEntry = {
  id: string;
  /** person: contribution evidence links the engineer. project_only: it describes the project and makes no claim about the person. */
  scope: "person" | "project_only";
  status: "supported" | "narrowed";
  detector: string;
  title: string;
  specificWork: string;
  evidence: CapabilityEvidence[];
  basis: EvidenceBasis[];
  contribution: { status: ContributionStatus; text: string; limits: string[] };
  result: string;
  limits: string[];
  followUp: string;
  requirementIds: string[];
  findingIds: string[];
  /** Identical code seen in several projects (forks, copies) counts once. */
  independentSources: number;
  alsoSeenIn: string[];
  project: string;
};

export type RequirementCoverage = {
  id: string;
  label: string;
  coverage: Coverage;
  why: string;
  capabilityIds: string[];
  whatWouldCount: string;
};

export type RequirementSet = { role: SupportedRole; label: string; requirements: RequirementCoverage[] };

export type CapabilityGroup = {
  requirementId: string;
  label: string;
  summary: string;
  coverage: Coverage;
  basis: EvidenceBasis[];
  projects: string[];
  capabilityIds: string[];
  gaps: string[];
};

export type UnansweredQuestion = { id: string; question: string; why: string; findingIds: string[] };

export type EnrichmentRecord = {
  source: "model" | "template";
  model: string | null;
  accepted: number;
  rejected: Array<{ capabilityId: string; field: string; reason: string }>;
  narrowedByModel: Array<{ capabilityId: string; reason: string }>;
};

export type CapabilityReview = {
  schemaVersion: typeof CAPABILITY_SCHEMA_VERSION;
  analysisVersion: string | null;
  inputHash: string;
  subject: {
    project: string;
    revision: string;
    snapshotId: string | null;
    sourceKind: "github" | "upload";
    url: string | null;
    languages: string[];
    analyzedAt: string;
  };
  attribution: Attribution;
  layers: {
    projectObservations: ProjectObservation[];
    contributionEvidence: ContributionEvidenceItem[];
    taskDemonstrations: TaskDemonstration[];
    engineerStatements: EngineerStatement[];
    reviewerJudgments: ReviewerJudgment[];
  };
  capabilities: CapabilityEntry[];
  groups: CapabilityGroup[];
  requirementSets: RequirementSet[];
  questions: UnansweredQuestion[];
  contradictions: Array<{ path: string; line: number; text: string; claims: string; detail: string }>;
  rejectedClaims: Array<{ path: string; startLine: number; reason: string }>;
  ignoredInstructions: Array<{ path: string; line: number }>;
  overview: {
    purpose: string | null;
    contributionScope: string;
    strongest: string[];
    limits: string[];
    nextAction: string;
  };
  method: { enrichment: EnrichmentRecord; coverage: string; notRun: string };
};
