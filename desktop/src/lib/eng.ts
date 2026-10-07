// Engineering assessments: the types the Rust commands return
// (src-tauri/src/eng.rs, mirroring src/lib/eng/candidate-view.ts and
// candidate-report.ts on the platform) and pure presentation logic.
// No runtime imports, so lib/eng.test.ts runs under node:test.

export type EngAttemptStatus =
  | "accepted"
  | "preflight_passed"
  | "in_progress"
  | "submitted"
  | "withdrawn"
  | "expired";

export interface EngAttemptSummary {
  id: string;
  status: EngAttemptStatus | string;
  roleTitle: string;
  organizationName: string;
  allowedMinutes: number;
  startedAt: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface EngInvitationSummary {
  id: string;
  roleTitle: string;
  organizationName: string;
  allowedMinutes: number;
  expiresAt: string;
}

export interface EngTaskList {
  attempts: EngAttemptSummary[];
  invitations: EngInvitationSummary[];
}

export interface EngCommands {
  windows: string;
  unix: string;
}

export interface EngHandoffPrompt {
  field: string;
  label: string;
  help: string;
}

export interface EngTeammate {
  id: string;
  name: string;
  title: string;
  askAbout?: string | null;
}

export interface EngMessage {
  id: string;
  seq: number;
  sender: "candidate" | "teammate" | string;
  teammate_id: string | null;
  body: string;
  client_msg_id: string | null;
  created_at: string;
}

export interface EngUpload {
  id: string;
  status: "initiated" | "validating" | "accepted" | "rejected" | "failed" | string;
  original_filename: string | null;
  byte_size: number | null;
  sha256: string | null;
  file_list: { path: string; size: number }[];
  rejection_code: string | null;
  rejection_detail: string | null;
  created_at: string;
}

export type EngProcessing =
  | "queued"
  | "running"
  | "human_review"
  | "ready"
  | "retryable_failure"
  | "blocked"
  | "canceled"
  | "not_queued";

export interface EngReceipt {
  attemptId: string;
  submissionId: string;
  archiveSha256: string;
  archiveBytes: number;
  submittedAt: string;
  late: boolean;
  processing: EngProcessing | string;
  alreadySubmitted: boolean;
}

export interface EngView {
  serverNow: string;
  attempt: {
    id: string;
    status: EngAttemptStatus | string;
    consentedAt: string | null;
    preflightPassedAt: string | null;
    preflightRuntime: string | null;
    startedAt: string | null;
    dueAt: string | null;
    extensionMinutes: number;
    allowedMinutes: number;
    submittedAt: string | null;
    updateReleasedAt: string | null;
    updateAcknowledgedAt: string | null;
    window: "open" | "late" | "closed" | string;
  };
  role: { title: string; companyContext: string; organizationName: string };
  scenario: {
    title: string;
    summary: string;
    candidateBrief: string[];
    initialRequirements: string[];
    resources: { path: string; description: string }[];
    testCommands: EngCommands;
    setupCommands: EngCommands;
    updateAfterMinutes: number;
    kickoffFrom: string;
    stack: string[];
    targetMinutes: number;
    submissionGraceMinutes: number;
    prerequisites: string[];
    supportedEnvironments: { label: string; status: string; note: string }[];
    aiPolicy: string[];
    packaging: string[];
    accommodations: string[];
    knownIssues: string[];
    teammates: EngTeammate[];
    handoffPrompts: EngHandoffPrompt[];
    starterRoot: string;
  };
  update: { title: string; body: string; from: string } | null;
  messages: EngMessage[];
  drafts: Record<string, { body: string; revision: number }>;
  uploads: EngUpload[];
  receipt: EngReceipt | null;
}

export interface EngStarterFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface EngLocalPackage {
  sha256: string;
  bytes: number;
  fileCount: number;
  createdAt: string;
  uploadId: string | null;
  uploadStatus: string | null;
  serverSha256: string | null;
}

export interface EngLocalState {
  attemptId: string;
  projectDir: string;
  starterRoot: string;
  starterSha256: string;
  materializedAt: string;
  starterFiles: EngStarterFile[];
  lastPackage: EngLocalPackage | null;
  receipt: EngReceipt | null;
}

export interface EngAttemptDetail {
  view: EngView;
  local: EngLocalState | null;
  plannedProjectDir: string;
  os: "windows" | "macos" | "linux" | string;
}

export type EngExclusionReason =
  | "ignored_folder"
  | "system_file"
  | "possible_secret"
  | "nested_archive"
  | "link";

export interface EngPackagePlan {
  root: string;
  included: { path: string; bytes: number; change: "unchanged" | "modified" | "added" }[];
  excluded: { path: string; reason: EngExclusionReason }[];
  removedFromStarter: string[];
  totalBytes: number;
  problems: string[];
}

export interface EngUploadOutcome {
  upload: EngUpload;
  localSha256: string;
  localBytes: number;
  fileCount: number;
  matchesLocal: boolean;
}

export type EngDraftSave =
  | { kind: "saved"; revision: number }
  | { kind: "conflict"; body: string; revision: number };

export type EngUploadPhase = "packaging" | "uploading" | "validating";

export type EngCitation =
  | { kind: "file"; path: string; lineStart: number | null; lineEnd: number | null }
  | { kind: "message"; messageId: string }
  | { kind: "handoff"; field: string }
  | { kind: "public_check"; id: string; title: string; outcome: string }
  | { kind: "hidden_check"; outcome: string }
  | { kind: "other" };

export interface EngReport {
  version: number;
  releasedAt: string | null;
  rubricVersion: string;
  changeReason: string | null;
  summary: string;
  dimensions: { label: string; level: string; rationale: string }[];
  criteria: {
    id: string;
    label: string;
    requirement: string;
    state: string;
    stateKey: string;
    observed: string | null;
    rationale: string;
    notCovered: string;
  }[];
  strengths: string[];
  gaps: string[];
  limitations: string[];
  findings: {
    id: string;
    dimension: string;
    kind: string;
    basis: string;
    statement: string;
    citations: EngCitation[];
  }[];
  publicChecks: { id: string; title: string; outcome: string }[];
  hiddenChecks: { passed: number; total: number } | null;
  notAssessed: string[];
  improvements: {
    criterionId: string;
    label: string;
    observation: string;
    whyItMatters: string;
    nextStep: string;
    recheck: string | null;
    limit: string;
  }[];
  versions: { version: number; releasedAt: string | null; changeReason: string | null; current: boolean }[];
  responses: {
    id: string;
    reportVersion: number;
    targetKind: string;
    targetId: string;
    kind: string;
    body: string;
    status: string;
    resolution: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }[];
}

/* ---------------- stage ---------------- */

export type EngStage = "consent" | "setup" | "ready" | "working" | "submitted" | "withdrawn" | "expired";

export function engStage(view: Pick<EngView, "attempt">): EngStage {
  const { status, consentedAt } = view.attempt;
  switch (status) {
    case "withdrawn":
      return "withdrawn";
    case "expired":
      return "expired";
    case "submitted":
      return "submitted";
    case "in_progress":
      return "working";
    case "preflight_passed":
      return "ready";
    default:
      return consentedAt ? "setup" : "consent";
  }
}

export function taskStatusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Setup not finished";
    case "preflight_passed":
      return "Ready to start";
    case "in_progress":
      return "In progress";
    case "submitted":
      return "Submitted";
    case "withdrawn":
      return "Withdrawn by employer";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

/* ---------------- disclosure facts (same wording as the web ConsentStep) ---------------- */

export interface Fact {
  label: string;
  value: string;
}

export const RECORDED_ITEMS: readonly string[] = [
  "Your messages in the team thread and when you sent them.",
  "The setup result you paste, when you start, and when you submit.",
  "Your uploaded ZIP and your handoff answers.",
  "Fydell does not see your screen, editor, files or AI tools. Anything you say about them is recorded as your statement.",
  "Your ZIP is tested in an isolated environment. People on the hiring team review the results and make any decision; Fydell does not.",
];

export const DESKTOP_DISCLOSURE: readonly string[] = [
  "This app downloads the starter project into one folder on this computer and checks it against the hash Fydell sends.",
  "It reads that folder only when you preview or upload your package, and shows you every file it includes or leaves out first.",
  "It never runs your code and never watches your editor, screen or other files. Team replies come from the Fydell server.",
];

export function consentFacts(view: Pick<EngView, "attempt" | "scenario">): Fact[] {
  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  return [
    { label: "Window", value: `${minutes} minutes once you press Start, for about ${view.scenario.targetMinutes} minutes of work` },
    { label: "Tools", value: "Any editor, documentation, search and AI assistant, as at work" },
    { label: "Recorded", value: "Team messages, setup result, your ZIP and handoff" },
    { label: "Not recorded", value: "Your screen, editor, files or AI conversations" },
    { label: "The employer receives", value: "Your ZIP, handoff, team messages, test results and the report their team writes" },
    {
      label: "You receive",
      value:
        "The same report once the hiring team releases it, without their private notes or interview questions. It cannot be hidden from the employer after you submit.",
    },
  ];
}

export function startFacts(view: Pick<EngView, "attempt" | "scenario">): Fact[] {
  const minutes = view.attempt.allowedMinutes + view.attempt.extensionMinutes;
  return [
    { label: "Window", value: `${minutes} minutes from when you press Start, for about ${view.scenario.targetMinutes} minutes of work` },
    { label: "You will submit", value: "Your project as a ZIP, and three short handoff answers" },
    {
      label: "Team messages",
      value: `Keep this app open. One requirement update arrives about ${view.scenario.updateAfterMinutes} minutes in`,
    },
    { label: "Leaving the app", value: "The timer keeps running on the server. Reopening never restarts it" },
  ];
}

export function setupCommandFor(os: string, commands: EngCommands): string {
  return os === "windows" ? commands.windows : commands.unix;
}

/* ---------------- server clock ---------------- */

/** Milliseconds to add to this device's clock to read the server's. */
export function serverOffsetMs(serverNow: string, receivedAtMs: number): number {
  const server = Date.parse(serverNow);
  return Number.isFinite(server) ? server - receivedAtMs : 0;
}

export interface TimeLeft {
  label: string;
  tone: "ok" | "low" | "over";
}

export function timeLeft(dueAt: string | null, serverNowMs: number): TimeLeft | null {
  if (!dueAt) return null;
  const due = Date.parse(dueAt);
  if (!Number.isFinite(due)) return null;
  const ms = due - serverNowMs;
  if (ms <= 0) {
    const over = Math.floor(-ms / 60_000);
    return { label: over < 1 ? "Time is up" : `${over} min over`, tone: "over" };
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = h > 0 ? `${h}:${pad(m)}:${pad(s)} left` : `${m}:${pad(s)} left`;
  return { label, tone: ms <= 10 * 60_000 ? "low" : "ok" };
}

export function windowNote(window: string, graceMinutes: number): string | null {
  if (window === "late") {
    return `The time window has passed. You can still submit during the ${graceMinutes}-minute grace period; it will be marked late.`;
  }
  if (window === "closed") return "The submission window has closed. Contact the employer if you need an extension.";
  return null;
}

/* ---------------- team thread ---------------- */

export function senderName(m: Pick<EngMessage, "sender" | "teammate_id">, teammates: EngTeammate[]): string {
  if (m.sender === "candidate") return "You";
  const t = teammates.find((x) => x.id === m.teammate_id);
  return t ? `${t.name} · ${t.title}` : "Team";
}

export function sortMessages(messages: EngMessage[]): EngMessage[] {
  return [...messages].sort((a, b) => a.seq - b.seq);
}

/* ---------------- packaging & upload ---------------- */

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function exclusionLabel(reason: EngExclusionReason): string {
  switch (reason) {
    case "ignored_folder":
      return "Cache, environment or build folder";
    case "system_file":
      return "System file";
    case "possible_secret":
      return "Possible credentials, never uploaded";
    case "nested_archive":
      return "Archive inside the project";
    case "link":
      return "Link (not followed)";
  }
}

export function packageSummary(plan: EngPackagePlan): string {
  const changed = plan.included.filter((f) => f.change !== "unchanged").length;
  const files = `${plan.included.length} file${plan.included.length === 1 ? "" : "s"}`;
  const delta = changed === 0 ? "none changed from the starter" : `${changed} changed or added`;
  return `${files} (${formatBytes(plan.totalBytes)}), ${delta}`;
}

export function uploadStatusText(u: Pick<EngUpload, "status" | "rejection_detail">): string {
  switch (u.status) {
    case "accepted":
      return "Accepted by Fydell's checks";
    case "rejected":
      return u.rejection_detail ? `Rejected: ${u.rejection_detail}` : "Rejected by Fydell's checks";
    case "failed":
      return u.rejection_detail ?? "The upload did not finish";
    case "validating":
      return "Being checked";
    default:
      return "Started, not finished";
  }
}

/** The upload a submit would use, and whether this app can vouch for its bytes. */
export function submittableUpload(
  uploads: EngUpload[],
  local: Pick<EngLocalState, "lastPackage"> | null
): { upload: EngUpload; verifiedLocally: boolean } | null {
  const accepted = uploads.find((u) => u.status === "accepted");
  if (!accepted) return null;
  const pkg = local?.lastPackage ?? null;
  const verifiedLocally =
    pkg != null &&
    pkg.uploadId === accepted.id &&
    accepted.sha256 != null &&
    pkg.sha256.toLowerCase() === accepted.sha256.toLowerCase();
  return { upload: accepted, verifiedLocally };
}

/* ---------------- handoff ---------------- */

export const AI_USE_FIELD = "ai_use";

export function handoffFields(prompts: EngHandoffPrompt[]): string[] {
  return [...prompts.map((p) => p.field), AI_USE_FIELD];
}

/** The server requires "what changed"; the other answers are encouraged. */
export function handoffBlockers(prompts: EngHandoffPrompt[], answers: Record<string, string>): string[] {
  const out: string[] = [];
  const required = prompts.find((p) => p.field === "what_changed");
  if (required && !(answers[required.field] ?? "").trim()) out.push(`Answer “${required.label}”.`);
  for (const [field, value] of Object.entries(answers)) {
    if (value.length > 8000) out.push(`Keep “${field.replace(/_/g, " ")}” under 8,000 characters.`);
  }
  return out;
}

/* ---------------- receipt ---------------- */

export const RECEIPT_STAGES = ["Uploaded", "Validated", "Submitted", "Evaluating", "Completed"] as const;

export function receiptProgress(processing: string): { index: number; note: string; delayed: boolean } {
  switch (processing) {
    case "human_review":
      return { index: 4, note: "Checks finished. The hiring team is reviewing your work.", delayed: false };
    case "ready":
      return { index: 4, note: "Reviewed. The employer decides what happens next and contacts you directly.", delayed: false };
    case "retryable_failure":
    case "blocked":
      return { index: 3, note: "Evaluation is delayed by a platform problem. It retries automatically and is never counted against you.", delayed: true };
    case "canceled":
      return { index: 3, note: "Evaluation was stopped by Fydell. Your submission is kept exactly as sent.", delayed: true };
    default:
      return { index: 3, note: "Your ZIP is being tested in an isolated environment.", delayed: false };
  }
}

/* ---------------- report ---------------- */

export function citationLabel(c: EngCitation): string {
  switch (c.kind) {
    case "file":
      if (c.lineStart == null) return c.path;
      return c.lineEnd != null && c.lineEnd !== c.lineStart ? `${c.path}:${c.lineStart}–${c.lineEnd}` : `${c.path}:${c.lineStart}`;
    case "message":
      return "Team message";
    case "handoff":
      return `Handoff: ${c.field.replace(/_/g, " ")}`;
    case "public_check":
      return `Public check: ${c.title} (${c.outcome.replace(/_/g, " ")})`;
    case "hidden_check":
      return `Hidden check (${c.outcome.replace(/_/g, " ")})`;
    case "other":
      return "Other evidence";
  }
}

export function checkOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "passed":
      return "Passed";
    case "failed":
      return "Failed";
    case "candidate_error":
      return "Error in submitted code";
    case "timeout":
      return "Timed out";
    case "output_limit":
      return "Output limit";
    case "no_result":
      return "No result";
    default:
      return outcome;
  }
}
