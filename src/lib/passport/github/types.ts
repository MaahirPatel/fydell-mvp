export const ANALYSIS_VERSION = "github-extract-v1";

export const LIMITS = {
  maxFilesPerRepository: 80,
  maxBytesPerFile: 128 * 1024,
  maxBytesPerRepository: 2 * 1024 * 1024,
  maxRepositoriesPerImport: 3,
} as const;

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

export type EvidenceCategory = "backend" | "frontend" | "testing" | "ml_engineering" | "applied_ai" | "delivery";

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
  coverage: {
    totalFiles: number;
    analyzedFiles: number;
    analyzedBytes: number;
    treeTruncated: boolean;
    skipped: SkippedFile[];
  };
  findings: RepoFinding[];
  rejectedFindings: number;
  roleSuggestions: RoleSuggestion[];
  notices: string[];
  error: ExtractionError | null;
};
