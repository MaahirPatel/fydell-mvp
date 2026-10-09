export const BUILDER_ANALYSIS_VERSION = "builder-analysis-v2";

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

export type Narrative = {
  source: "model" | "template";
  model?: string;
  summary: string;
  paragraphs: NarrativeParagraph[];
};

export type BuilderAnalysisReport = {
  version: typeof BUILDER_ANALYSIS_VERSION;
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
};
