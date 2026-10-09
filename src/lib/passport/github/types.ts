/**
 * v6: every finding carries an entailment record (unused, unreachable,
 * stubbed, skipped or assertion-free code cannot support a claim), comments
 * that claim behaviour the code lacks are recorded as contradictions,
 * instruction-like README text is flagged and ignored, and GitHub imports
 * record contribution signals for the connected login.
 */
export const ANALYSIS_VERSION = "github-extract-v6";

/**
 * Supported intake (GH-01). Passport import starts with explicitly selected
 * public repositories. Private repositories remain unavailable until scoped
 * authorization, privacy and provider controls are verified. This constant
 * is returned by the intake endpoint and referenced in docs so the supported
 * scope is stated in code, not just in prose.
 */
export const INTAKE_SCOPE = {
  scope: "public",
  repositories: "public-only",
  privateRepositories: "unavailable",
  note: "Import starts with explicitly selected public repositories. Private repositories remain unavailable until scoped authorization, privacy and provider controls are verified.",
} as const;

export const LIMITS = {
  maxFilesPerRepository: 80,
  maxBytesPerFile: 128 * 1024,
  maxBytesPerRepository: 2 * 1024 * 1024,
  maxRepositoriesPerImport: 3,
} as const;

export type SelectionLimits = { maxFilesPerRepository: number; maxBytesPerFile: number; maxBytesPerRepository: number };

/** Uploaded files are already in memory, so an upload is read far more fully than a GitHub fetch. Bounded by the 300-file archive limit. */
export const UPLOAD_LIMITS: SelectionLimits = {
  maxFilesPerRepository: 300,
  maxBytesPerFile: 256 * 1024,
  maxBytesPerRepository: 6 * 1024 * 1024,
};

export type RepoRef = { owner: string; repo: string };

export type ParsedInput =
  | { kind: "repository"; ref: RepoRef }
  | { kind: "profile"; user: string };

export type RepositoryMeta = {
  id: number;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string;
  fork: boolean;
  archived: boolean;
  primaryLanguage: string | null;
  sizeKb: number;
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree" | "commit";
  mode: string;
  size?: number;
  /** Git blob id, so each manifest entry identifies exact file content. */
  sha?: string;
};

/** Version of the import pipeline (selection rules, limits, manifest shape). */
export const IMPORTER_VERSION = "github-public-import-v2";

/**
 * One file in an immutable snapshot manifest. `included` files were read
 * and analyzed; everything else carries the reason it was left out.
 */
export type ManifestEntry = {
  path: string;
  size: number | null;
  blobSha: string | null;
  included: boolean;
  reason?: SkipReason;
};

/** Manifest storage cap. Skip-reason counts stay exact beyond it. */
export const MANIFEST_MAX_ENTRIES = 600;

export type ExtractionProgress = {
  stage: "resolving" | "listing" | "fetching" | "analyzing";
  filesFetched?: number;
  filesSelected?: number;
};

export type SkipReason =
  | "binary"
  | "vendored_or_generated"
  | "lockfile"
  | "minified"
  | "possible_secret"
  | "symlink"
  | "submodule"
  | "too_large"
  | "file_limit"
  | "byte_limit"
  | "fetch_failed"
  | "not_text";

export type SkippedFile = { path: string; reason: SkipReason };

export type EvidenceCategory = "backend" | "software" | "frontend" | "testing" | "ml_engineering" | "applied_ai" | "delivery";

export type EvidenceBasis = "repository_observation" | "dependency_declaration";

export type RepoFinding = {
  id: string;
  detector: string;
  category: EvidenceCategory;
  finding: string;
  basis: EvidenceBasis;
  path: string;
  startLine: number;
  endLine: number;
  excerpt: string[];
  sourceUrl: string;
  attribution: "unverified";
  limitations: string[];
  /** Absent on findings stored before github-extract-v6. */
  entailment?: Entailment;
};

/**
 * Reasons cited lines cannot support the finding as stated. Reading code is
 * never execution, so no finding ever supports a runtime claim on its own.
 */
export type EntailmentCheck =
  | "unused_function"
  | "unreachable_code"
  | "stub_body"
  | "comment_only"
  | "skipped_test"
  | "assertion_free_test"
  | "broken_import"
  | "not_executed";

export type Entailment = {
  /** supported: the cited code does what the finding says, as far as reading shows. narrowed: the lines exist but do not carry the claim. */
  status: "supported" | "narrowed";
  checks: Array<{ check: EntailmentCheck; detail: string }>;
  /** Enclosing function, method or test name, when one could be identified. */
  symbol: string | null;
  /** Fydell does not run imported code. */
  executed: false;
};

/** A comment that claims behaviour no supported finding in the same file shows. */
export type CommentContradiction = {
  path: string;
  line: number;
  text: string;
  claims: string;
  detail: string;
};

/** Text in a README or doc that reads like instructions to an analyzer. It is recorded and ignored. */
export type UntrustedInstruction = { path: string; line: number; excerpt: string };

/** A draft finding the entailment checks removed entirely, kept so the report can say what was rejected and why. */
export type RejectedClaim = { detector: string; path: string; startLine: number; endLine: number; reason: string };

export type AnalysisChecks = {
  contradictions: CommentContradiction[];
  untrustedInstructions: UntrustedInstruction[];
  rejectedClaims: RejectedClaim[];
};

/**
 * Contribution evidence captured at import: how the snapshot relates to the
 * connected GitHub account. Commit metadata is a signal with limits (it can
 * be rewritten, squashed or co-authored); it is never proof of authorship.
 */
export type ContributionSignals = {
  login: string | null;
  repositoryOwner: string;
  ownerMatchesLogin: boolean;
  fork: boolean;
  checked: "checked" | "no_login" | "upload_no_history" | "unavailable";
  /** Cited paths checked against history up to the analyzed revision. */
  paths: Array<{ path: string; commitsByLogin: number; latest: { sha: string; subject: string; authoredAt: string } | null }>;
  checkedAt: string;
};

export type RoleFamily = "backend" | "frontend" | "full_stack" | "applied_ai" | "ml_engineering";

export type RoleSuggestion = {
  family: RoleFamily;
  status: "supported" | "partial";
  requirement: string;
  evidenceIds: string[];
  gaps: string[];
};

export type ExtractionStatus = "complete" | "partial" | "failed";

export type ExtractionErrorCode =
  | "invalid_input"
  | "not_found"
  | "private_repository"
  | "empty_repository"
  | "rate_limited"
  | "github_unavailable";

export type ExtractionError = { code: ExtractionErrorCode; message: string; retryAfterSeconds?: number };

export type ExtractionResult = {
  analysisVersion: typeof ANALYSIS_VERSION;
  status: ExtractionStatus;
  repository: RepositoryMeta | null;
  commitSha: string | null;
  /** Branch or ref the commit was resolved from. */
  revisionRef?: string | null;
  manifest?: ManifestEntry[];
  coverage: {
    totalFiles: number;
    analyzedFiles: number;
    analyzedBytes: number;
    /** Languages observed in the analyzed files, for the coverage display (GH-09). */
    languages: string[];
    treeTruncated: boolean;
    skipped: SkippedFile[];
  };
  findings: RepoFinding[];
  rejectedFindings: number;
  roleSuggestions: RoleSuggestion[];
  notices: string[];
  error: ExtractionError | null;
  checks?: AnalysisChecks;
  contributionSignals?: ContributionSignals;
};
