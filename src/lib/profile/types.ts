/**
 * Unified Engineering Profile hub types.
 *
 * The profile is the engineer's resume stack: identity, connected accounts,
 * and evidence aggregated across every source. Provenance is marked on every
 * evidence item - the profile never lets self-supplied data look observed.
 */

/** Where an evidence item came from. Never invent new values without updating PROVENANCE_LABELS. */
export type EvidenceProvenance = "observed-simulation" | "repository-observation" | "local-import";

export const PROVENANCE_LABELS: Record<EvidenceProvenance, { short: string; detail: string }> = {
  "observed-simulation": {
    short: "Observed simulation",
    detail: "Work completed inside a Fydell simulation. Fydell recorded the session and ran the checks on its servers.",
  },
  "repository-observation": {
    short: "Repository observation",
    detail: "Extracted from a connected GitHub repository. The code was read; authorship is claimed by the engineer.",
  },
  "local-import": {
    short: "Self-supplied import",
    detail: "Uploaded by the engineer from their own editor history. Not independently observed by Fydell.",
  },
};

export function isProvenance(value: unknown): value is EvidenceProvenance {
  return value === "observed-simulation" || value === "repository-observation" || value === "local-import";
}

export type ProfileLink = { label: string; url: string };

export const OPEN_TO = ["", "full_time", "contract", "either", "not_looking"] as const;
export type OpenTo = (typeof OPEN_TO)[number];
export const OPEN_TO_LABEL: Record<OpenTo, string> = {
  "": "Not stated",
  full_time: "Open to full-time roles",
  contract: "Open to contract work",
  either: "Open to full-time or contract",
  not_looking: "Not looking right now",
};

export type EngineerProfile = {
  displayName: string;
  /** Public @handle employers can invite by, or "" when not chosen yet. */
  handle: string;
  headline: string;
  role: string;
  bio: string;
  location: string;
  website: string;
  links: ProfileLink[];
  openTo: OpenTo;
  /** Public URL of the profile photo, or "" when none is set. */
  avatarUrl: string;
  social: SocialProfiles;
  /**
   * The engineer's own statement of how they work. Private by default; on a
   * shared profile it is null unless the engineer included it in shares.
   */
  howIBuild: HowIBuild | null;
  updatedAt: string | null;
};

export type HowIBuild = { text: string; includeInShares: boolean; updatedAt: string | null };

export const SOCIAL_KINDS = ["linkedin", "x", "instagram"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];
export type SocialProfiles = Record<SocialKind, string>;
export const SOCIAL_LABEL: Record<SocialKind, string> = { linkedin: "LinkedIn", x: "X", instagram: "Instagram" };
export const EMPTY_SOCIAL: SocialProfiles = { linkedin: "", x: "", instagram: "" };

export type ConnectedAccountProvider = "github" | "vscode" | "cursor";

export type ConnectedAccount = {
  id: string;
  provider: ConnectedAccountProvider;
  label: string;
  status: "connected" | "disconnected" | "error";
  connectedAt: string;
  lastSyncedAt: string | null;
  /** Provider-specific facts, e.g. { repos: ["owner/repo"], login } for github. */
  meta: Record<string, unknown>;
};

export const PROVIDER_LABELS: Record<ConnectedAccountProvider, string> = {
  github: "GitHub",
  vscode: "VS Code",
  cursor: "Cursor",
};

export type EditorEvidenceFile = {
  /** Workspace-relative or absolute path as found in the local data. */
  path: string;
  /** Number of recorded edits/saves, when the source tracks them. */
  edits: number | null;
  language: string | null;
  lastTouchedAt: string | null;
};

export type EditorEvidenceImport = {
  id: string;
  source: "vscode" | "cursor";
  importedAt: string;
  timeRangeStart: string | null;
  timeRangeEnd: string | null;
  sessionCount: number;
  filesTouched: EditorEvidenceFile[];
  languages: string[];
  /** Human-readable description of exactly what was parsed and how. */
  parseMethod: string;
  provenance: "local-import";
};

export type TimelineItemKind = "simulation" | "github-project" | "editor-import";

/**
 * One entry in the profile's aggregated evidence timeline. `occurredAt` is an
 * ISO timestamp used for reverse-chronological ordering.
 */
export type TimelineItem = {
  id: string;
  kind: TimelineItemKind;
  title: string;
  detail: string;
  occurredAt: string;
  provenance: EvidenceProvenance;
  url: string | null;
  /** Extra facts for the owner view (e.g. file lists). Never shown publicly without filtering. */
  meta: Record<string, unknown>;
};

export type ProfileHub = {
  profile: EngineerProfile;
  accounts: ConnectedAccount[];
  editorImports: EditorEvidenceImport[];
  timeline: TimelineItem[];
  /** True when the owner has any GitHub evidence (passport projects). */
  hasGithubEvidence: boolean;
};
