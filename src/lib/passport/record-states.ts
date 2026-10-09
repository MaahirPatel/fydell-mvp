/**
 * One vocabulary for work-record states, shared by every screen that shows
 * an import or a report. Labels are text, so state never depends on colour.
 */
import type { ImportJobState, ImportStage } from "./import-jobs";
import type { PassportProject } from "./view";

export type StateTone = "neutral" | "active" | "changed" | "risk" | "good";

export const IMPORT_STATE: Record<ImportJobState, { label: string; tone: StateTone }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Importing", tone: "active" },
  retry_scheduled: { label: "Retrying", tone: "changed" },
  succeeded: { label: "Analysis complete", tone: "neutral" },
  failed: { label: "Import failed", tone: "risk" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Visible import stages in order. "queued" and "done" are bookends. */
export const IMPORT_STAGES: Array<{ key: Exclude<ImportStage, "queued" | "done">; label: string; detail: string }> = [
  { key: "resolving", label: "Resolve revision", detail: "Confirming the repository and the pinned commit" },
  { key: "listing", label: "List files", detail: "Reading the file tree at that commit" },
  { key: "fetching", label: "Fetch files", detail: "Downloading the selected text files" },
  { key: "analyzing", label: "Analyze", detail: "Running static checks and validating every citation" },
  { key: "saving", label: "Save report", detail: "Storing the snapshot, findings and capability report" },
];

export function stageIndex(stage: ImportStage): number {
  if (stage === "queued") return -1;
  if (stage === "done") return IMPORT_STAGES.length;
  return IMPORT_STAGES.findIndex((s) => s.key === stage);
}

export type ReportState = "ready" | "partial" | "stale";

export function reportState(p: Pick<PassportProject, "status">): ReportState {
  if (p.status === "stale") return "stale";
  if (p.status === "partial") return "partial";
  return "ready";
}

export const REPORT_STATE: Record<ReportState, { label: string; tone: StateTone; detail: string }> = {
  ready: { label: "Report ready", tone: "neutral", detail: "Every selected file was read and the report is saved." },
  partial: { label: "Partial", tone: "changed", detail: "Some files could not be read. The report states what was covered." },
  stale: { label: "Earlier version", tone: "neutral", detail: "A newer revision of this repository has been analyzed." },
};

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

// Fixed locale and zone so server and client render identical text.
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = new Date(iso).toLocaleString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  return `${s} UTC`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

/** Report depths in reading order: overview, capability review, evidence inspection, then context. */
export const REPORT_VIEWS = ["overview", "capabilities", "findings", "decisions", "versions"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];

/** Unknown view names open the overview; the retired `evidence` name opens evidence inspection. */
export function parseReportView(view: string | null | undefined): ReportView {
  if (view === "evidence") return "findings";
  return (REPORT_VIEWS as readonly string[]).includes(view ?? "") ? (view as ReportView) : "overview";
}

/** Colour per evidence category, so a finding's area reads before its text. */
export const CATEGORY_TONE: Record<string, string> = {
  backend: "#5b5bd6",
  software: "#2f74d0",
  testing: "#1f7a99",
  ml_engineering: "#8b4fd8",
  applied_ai: "#c2468a",
  frontend: "#0e8a7e",
  delivery: "#b7791f",
};

export const CATEGORY_ORDER = ["backend", "software", "testing", "ml_engineering", "applied_ai", "frontend", "delivery"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  backend: "Backend and API",
  software: "Software design",
  frontend: "Interface",
  testing: "Testing",
  delivery: "Build and delivery",
  ml_engineering: "ML engineering",
  applied_ai: "Applied AI",
};

export const SKIP_REASON_LABEL: Record<string, string> = {
  binary: "Binary file",
  vendored_or_generated: "Dependency or generated",
  lockfile: "Lockfile",
  minified: "Minified",
  possible_secret: "May contain secrets",
  symlink: "Symlink (not followed)",
  submodule: "Submodule",
  too_large: "Over the size limit",
  file_limit: "Over the file limit",
  byte_limit: "Over the total size limit",
  fetch_failed: "Could not be retrieved",
  not_text: "Not a supported text file",
};
