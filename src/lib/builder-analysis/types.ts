import type { AnalysisInputSnapshot, CapabilityStatement, LedgerEntry } from "./ledger";

export const BUILDER_ANALYSIS_VERSION = "builder-analysis-v3";
/** Stored reports from these versions still render; v2 predates the ledger and run record. */
export const READABLE_ANALYSIS_VERSIONS = ["builder-analysis-v2", BUILDER_ANALYSIS_VERSION] as const;
export type AnalysisVersion = (typeof READABLE_ANALYSIS_VERSIONS)[number];

export const NO_GITHUB_LOGIN_LIMIT = "No GitHub username is linked, so release and commit activity were not read.";

export const ANALYSIS_LIMITS = {
  /** Public repositories scanned per run (GitHub unauthenticated quota is 60 requests an hour). */
  maxScannedRepos: 12,
  /** Commits sampled per repository: one API page. */
  commitsPerRepo: 100,
  /** README characters read for structure checks. */
  readmeChars: 20_000,
  /** Minimum minutes between runs for one owner. */
  cooldownMinutes: 10,
} as const;

/** Never a score: how much observable evidence supports the area. */
export type EvidenceLevel = "strong" | "developing" | "limited" | "insufficient_evidence";

export type DimensionId = "quality" | "reliability" | "delivery" | "architecture" | "communication" | "applied_ai";

/**
 * Something the report can point to. `finding` refs are cited code lines from
 * an imported project; `activity` refs are measurements of public repository
 * metadata and commit history.
 */
export type SignalRef =
  | { kind: "finding"; id: string; repo: string; label: string; url: string | null }
  | { kind: "activity"; id: string; repo: string | null; label: string; url: string | null };

export type Practice = {
  key: string;
  label: string;
  repos: string[];
  refs: SignalRef[];
};

export type Dimension = {
  id: DimensionId;
  label: string;
  question: string;
  level: EvidenceLevel;
  summary: string;
  practices: Practice[];
  /** Practices this area looks for that were not observed. Absence is not proof of absence. */
  notObserved: string[];
  limits: string[];
};

export type Strength = {
  id: string;
  title: string;
  detail: string;
  dimension: DimensionId;
  refs: SignalRef[];
};

export type RecurringPattern = {
  id: string;
  title: string;
  detail: string;
  repos: string[];
  refs: SignalRef[];
};

export type GrowthItem = {
  id: string;
  title: string;
  observation: string;
  whyItMatters: string;
  nextStep: string;
  basis: "observation" | "inference";
  repos: string[];
  refs: SignalRef[];
};

export type WorkingStyle = {
  id: string;
  label: string;
  description: string;
  reasons: string[];
  basis: "inference";
};

export type CommitMessageStats = {
  sampled: number;
  medianSubjectLength: number;
  descriptivePct: number;
  conventionalPct: number;
};

export type RepoActivity = {
  repo: string;
  url: string;
  language: string | null;
  description: string | null;
  fork: boolean;
  archived: boolean;
  pushedAt: string | null;
  sizeKb: number | null;
  stars: number | null;
  defaultBranch: string;
  /** Null when commit history could not be read. */
  commits: {
    byYou: number;
    capped: boolean;
    activeWeeks: number;
    firstAt: string | null;
    lastAt: string | null;
    months: Record<string, number>;
    messages: CommitMessageStats | null;
  } | null;
  releases: number | null;
  structure: {
    totalFiles: number;
    testFiles: number;
    sourceFiles: number;
    hasCi: boolean;
    hasLicense: boolean;
    hasDocsDir: boolean;
    hasChangelog: boolean;
    hasContributing: boolean;
    hasContainer: boolean;
    hasTypeConfig: boolean;
    hasLintConfig: boolean;
    topLevelDirs: number;
    extensions: Record<string, number>;
    truncated: boolean;
  } | null;
  readme: { chars: number; sections: string[]; hasSetup: boolean; hasUsage: boolean } | null;
  /** Repository was fully reused from an earlier run because it had not changed. */
  reused: boolean;
  errors: string[];
};

export type ProjectBreakdown = {
  repo: string;
  url: string | null;
  depth: "deep" | "scan";
  language: string | null;
  description: string | null;
  findings: number;
  practices: string[];
  commitsByYou: number | null;
  activeWeeks: number | null;
  lastActiveAt: string | null;
};

export type NarrativeParagraph = { text: string; refs: string[] };

export type ClaimRejection = { reason: "unknown_citation" | "judgment" | "authorship" | "trait" | "execution_claim" | "raw_id" | "length"; excerpt: string };

/** Result of checking model prose against the ledger. The model may explain evidence; it may not add any. */
export type ClaimCheck = { proposed: number; kept: number; rejected: ClaimRejection[]; fellBackToTemplate: boolean };

export type Narrative = {
  source: "model" | "template";
  model?: string;
  summary: string;
  paragraphs: NarrativeParagraph[];
  claimCheck?: ClaimCheck;
};

/** How this run was produced: what it read, with which rules, and which run it replaces. */
export type RunRecord = {
  runId: string;
  inputHash: string;
  input: AnalysisInputSnapshot;
  config: {
    analysisVersion: typeof BUILDER_ANALYSIS_VERSION;
    ledgerVersion: string;
    limits: typeof ANALYSIS_LIMITS;
    narrative: { provider: string; model: string } | { provider: "template" };
  };
  /** The complete run this one replaces as the current report, if any. That run is kept unchanged. */
  supersedes: string | null;
};

export type BuilderAnalysisReport = {
  version: AnalysisVersion;
  run?: RunRecord;
  ledger?: LedgerEntry[];
  capabilityStatements?: CapabilityStatement[];
  generatedAt: string;
  subject: { displayName: string; githubLogin: string | null };
  scope: {
    deepProjects: number;
    scannedRepos: number;
    forksExcluded: number;
    archivedIncluded: number;
    listingTruncated: boolean;
    skipped: Array<{ repo: string; reason: string }>;
    commitsSampled: number;
  };
  headline: string;
  workingStyle: WorkingStyle;
  dimensions: Dimension[];
  strengths: Strength[];
  patterns: RecurringPattern[];
  growth: GrowthItem[];
  projects: ProjectBreakdown[];
  activityByMonth: Array<{ month: string; commits: number }>;
  narrative: Narrative;
  limits: string[];
  /** Raw repository measurements, kept so unchanged repositories can be reused next run. */
  activity: RepoActivity[];
};

export type AnalysisRow = {
  id: string;
  status: "running" | "complete" | "failed";
  report: BuilderAnalysisReport | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  reportHash: string | null;
  supersedesId: string | null;
};

/** One stored run in the owner's history. Complete runs are immutable. */
export type AnalysisVersionSummary = {
  id: string;
  status: AnalysisRow["status"];
  createdAt: string;
  completedAt: string | null;
  reportHash: string | null;
  inputHash: string | null;
  supersedesId: string | null;
  /** True for the newest complete run: the report the engineer sees by default. */
  current: boolean;
  error: string | null;
};
