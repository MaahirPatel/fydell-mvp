import { invoke } from "@tauri-apps/api/core";
import type {
  EngAttemptDetail,
  EngDraftSave,
  EngLocalState,
  EngMessage,
  EngPackagePlan,
  EngReceipt,
  EngReport,
  EngTaskList,
  EngUploadOutcome,
} from "./eng";
import type { AuthoredOutbox, AuthoredReceipt, AuthoredReport, AuthoredView, Collaboration, FilesSyncStatus, PublicRun } from "./eng-authored";

// Typed bindings for the Rust commands (see src-tauri/src/*.rs).
// The desktop is a client of the platform's session API
// (src/app/api/sim/*); auth is a Supabase session held in Rust.

export type SessionStatus = "idle" | "joined" | "active" | "submitted";

export interface SessionInfo {
  status: SessionStatus;
  platform_session_id: string | null;
  title: string | null;
  organization: string | null;
  duration_minutes: number | null;
  ends_at: string | null;
  started_at: string | null;
  consent_accepted: boolean;
  scenario_id: string | null;
  scenario_version: string | null;
}

export interface SessionSummary {
  signed_in: boolean;
  email: string | null;
  expires_at: number | null;
}

export interface FileEntry {
  path: string;
  rev: number;
  bytes: number;
}

export interface FileContent {
  path: string;
  content: string;
  rev: number;
}

export interface RunTestCase {
  id: string;
  /** "provided" (the scenario's tests) or "candidate" (tests you added). */
  origin: "provided" | "candidate" | "hidden";
  outcome: "passed" | "failed" | "error" | "skipped";
  message?: string | null;
}

export interface TestRunResult {
  /** "remote": Fydell's isolated runner. "local": legacy on-device runner. */
  mode: "remote" | "local";
  /**
   * Remote: completed | indeterminate | infrastructure_error | not_configured.
   * Local: completed | timeout | output_limit | runtime_error.
   */
  status: string;
  exit_code: number | null;
  passed: number | null;
  failed: number | null;
  total: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
  status_reason: string | null;
  run_id: string | null;
  snapshot_hash: string | null;
  workspace_fingerprint: string | null;
  suite_version: string | null;
  tests: RunTestCase[];
  errors: number | null;
  restored_trusted: string[];
  ignored: { path: string; reason: string }[];
}

export interface SessionEvent {
  seq: number;
  ts: string;
  kind: string;
  payload: Record<string, unknown>;
  platform_event_id?: string | null;
}

export interface Receipt {
  submission_id: string;
  sha256: string;
  /** W4: server-computed receipt hash (authoritative tamper-evidence handle). */
  server_receipt_hash?: string | null;
  title: string | null;
  submitted_at: string;
  file_count: number;
  event_count: number;
  already_submitted: boolean;
  scenario_id: string | null;
  scenario_version: string | null;
  platform_receipt_id: string | null;
}

export interface InvokeErrorBody {
  code: string;
  /** Stable support reference, e.g. "FYDELL-E1007" (DESK-20). */
  ref?: string;
  message: string;
  expected_rev?: number;
  actual_rev?: number;
}

export function isRevisionConflict(e: unknown): e is { expected_rev: number; actual_rev: number } {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as InvokeErrorBody).code === "revision_conflict"
  );
}

export function isAuthRequired(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as InvokeErrorBody).code === "auth_required"
  );
}

export function isSessionLocked(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as InvokeErrorBody).code === "session_locked"
  );
}

export function isVersionBlocked(
  e: unknown
): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as InvokeErrorBody).code === "version_blocked"
  );
}

/* ---------------- DESK-09: save/sync ---------------- */

export type SyncPhase =
  | "saved_local"
  | "syncing"
  | "synced"
  | "sync_failed"
  | "conflict";

export interface SyncView {
  phase: SyncPhase;
  dirty_paths: string[];
  last_error: string | null;
  server_revision: number;
  conflict_server_rev: number | null;
  last_synced_at: string | null;
}

/* ---------------- DESK-10: recovery ---------------- */

export type RecoveryOutcome =
  | { kind: "none" }
  | {
      kind: "resume_active";
      unsynced_paths: string[];
      server_revision: number;
    }
  | { kind: "resume_joined" }
  | { kind: "workspace_missing"; session_id: string }
  | { kind: "locked"; pid: number };

/* ---------------- DESK-06: provisioning ---------------- */

export type ProvisionStepId =
  | "version"
  | "preflight"
  | "fetch"
  | "runtime"
  | "start"
  | "materialize";

export interface ProvisionProgress {
  step: ProvisionStepId;
  state: "started" | "ok" | "failed";
  message?: string | null;
}

/* ---------------- DESK-19: version gate ---------------- */

export type VersionGate =
  | {
      kind: "current";
      update_available: boolean;
      latest: string | null;
      download_url: string | null;
    }
  | {
      kind: "blocked";
      current: string;
      minimum: string;
      download_url: string | null;
    }
  | { kind: "unknown" };

/* ---------------- DESK-20: diagnostics ---------------- */

export interface ErrorNote {
  ts: string;
  code: string;
  ref: string;
  message: string;
}

export interface Diagnostics {
  app_version: string;
  os: string;
  arch: string;
  platform_host: string;
  session: {
    status: string;
    has_platform_session: boolean;
    server_revision: number;
    sync_phase: string;
    unsynced_files: number;
  };
  file_count: number;
  event_count: number;
  recent_errors: ErrorNote[];
}

/* ---------------- Invitation inbox ---------------- */

export interface InboxInvitation {
  id: string;
  organizationName: string;
  simulationTitle: string;
  roleTitle: string;
  candidateName: string | null;
  status: string;
  expiresAt: string;
  /** Legacy token field: listings no longer mint tokens (see acceptInvitationById).
      Absent/null on new listings; kept for backward compatibility. */
  token?: string | null;
}

/* ---------------- Stakeholder chat ---------------- */

export interface ChatMessage {
  id: string;
  thread: string;
  sender: "candidate" | "stakeholder" | string;
  stakeholderId: string | null;
  body: string;
  createdAt: string;
}

export interface StakeholderView {
  id: string;
  name: string;
  role: string;
  /** Always true on the candidate view (SIM-03). Carried so the UI labels honestly. */
  simulated: boolean;
}

/* ---------------- Engineer profile (first-run onboarding) ---------------- */

export interface EngineerProfileView {
  displayName: string;
  headline: string;
  role: string;
}

export interface PassportProjectView {
  repository: string;
  url: string | null;
  primaryLanguage: string | null;
  status: string;
  contributionStatement: string | null;
  evidenceCount: number;
}

export interface PassportView {
  displayName: string;
  headline: string;
  githubLogin: string | null;
  projects: PassportProjectView[];
  capabilities: string[];
  roleSuggestions: string[];
}

/** Raw `{ result, passport }` payload from the projects route (analysis
 *  outcomes, including failures, travel verbatim so the UI can explain them). */
export type AddProjectResult = Record<string, unknown>;

export const api = {
  // Auth (src-tauri/src/auth.rs)
  authSignIn: () => invoke<void>("auth_sign_in"),
  authSignOut: () => invoke<void>("auth_sign_out"),
  authSession: () => invoke<SessionSummary>("auth_session"),
  // Session (src-tauri/src/session.rs)
  joinSession: (invite_token: string) =>
    invoke<SessionInfo>("join_session", { inviteToken: invite_token }),
  acceptConsent: () => invoke<SessionInfo>("accept_consent"),
  beginSession: () => invoke<SessionInfo>("begin_session"),
  sessionStatus: () => invoke<SessionInfo>("session_status"),
  syncState: (notes: string | null, workspace_snapshot: Record<string, unknown> | null) =>
    invoke<number>("sync_state", { notes, workspaceSnapshot: workspace_snapshot }),
  // Recovery (src-tauri/src/recovery.rs) — DESK-10
  recoveryStatus: () => invoke<RecoveryOutcome>("recovery_status"),
  // Sync (src-tauri/src/sync.rs) — DESK-09 / DESK-11
  syncStatus: () => invoke<SyncView>("sync_status"),
  syncNow: () => invoke<SyncView>("sync_now"),
  resolveSyncConflict: (strategy: "keep_local" | "take_remote") =>
    invoke<SyncView>("resolve_sync_conflict", { strategy }),
  // Version gate (src-tauri/src/version.rs) — DESK-19
  checkClientVersion: () => invoke<VersionGate>("check_client_version"),
  // Diagnostics (src-tauri/src/diagnostics.rs) — DESK-20
  diagnostics: () => invoke<Diagnostics>("diagnostics"),
  // Workspace (src-tauri/src/workspace.rs)
  listFiles: () => invoke<FileEntry[]>("list_files"),
  readFile: (path: string) => invoke<FileContent>("read_file", { path }),
  writeFile: (path: string, content: string, rev: number) =>
    invoke<FileContent>("write_file", { req: { path, content, rev } }),
  // Execution (src-tauri/src/execution.rs)
  runTests: () => invoke<TestRunResult>("run_tests"),
  /** Fingerprint of the saved workspace files; compare with a result's to spot stale results. */
  workspaceFingerprint: () => invoke<string>("workspace_fingerprint"),
  // Events (src-tauri/src/events.rs)
  appendEvent: (kind: string, payload: Record<string, unknown>) =>
    invoke<number>("append_event", { event: { kind, payload } }),
  getEvents: () => invoke<SessionEvent[]>("get_events"),
  // Submission (src-tauri/src/submission.rs)
  submit: (handoff: Record<string, unknown>, external_ai_disclosed: boolean) =>
    invoke<Receipt>("submit", { handoff, externalAiDisclosed: external_ai_disclosed }),
  // Invitation inbox (src-tauri/src/inbox.rs)
  listInvitations: () => invoke<InboxInvitation[]>("list_invitations"),
  acceptInvitationById: (
    invitationId: string,
    organizationName: string,
    simulationTitle: string
  ) =>
    invoke<SessionInfo>("accept_invitation_by_id", {
      invitationId,
      organizationName,
      simulationTitle,
    }),
  // Stakeholder chat (src-tauri/src/chat.rs) — simulated teammates, SIM-03
  listMessages: () => invoke<ChatMessage[]>("list_messages"),
  listStakeholders: () => invoke<StakeholderView[]>("list_stakeholders"),
  sendMessage: (stakeholderId: string, text: string) =>
    invoke<ChatMessage[]>("send_message", { stakeholderId, text }),
  // Candidate passport (src-tauri/src/passport.rs)
  getPassport: () => invoke<PassportView | null>("get_passport"),
  addProject: (repository: string, contribution: string, githubLogin?: string | null) =>
    invoke<AddProjectResult>("add_project", {
      repository,
      contribution,
      githubLogin: githubLogin ?? null,
    }),
  removeProject: (repo: string) => invoke<AddProjectResult>("remove_project", { repo }),
  // Engineer profile (src-tauri/src/passport.rs) — first-run onboarding
  getProfile: () => invoke<EngineerProfileView | null>("get_profile"),
  updateProfile: (displayName: string, headline: string, role: string) =>
    invoke<EngineerProfileView>("update_profile", {
      displayName,
      headline,
      role,
    }),
};

// Engineering assessments (src-tauri/src/eng.rs) — the /assess/[attemptId]
// flow on the platform's /api/eng/* routes.
export const engApi = {
  listTasks: () => invoke<EngTaskList>("eng_list_tasks"),
  acceptInvitation: (invitationId: string) => invoke<string>("eng_accept_invitation", { invitationId }),
  openAttempt: (attemptId: string) => invoke<EngAttemptDetail>("eng_open_attempt", { attemptId }),
  recordConsent: (attemptId: string) => invoke<EngAttemptDetail>("eng_record_consent", { attemptId }),
  prepareWorkspace: (attemptId: string) => invoke<EngLocalState>("eng_prepare_workspace", { attemptId }),
  confirmSetup: (attemptId: string, code: string) => invoke<EngAttemptDetail>("eng_confirm_setup", { attemptId, code }),
  start: (attemptId: string) => invoke<EngAttemptDetail>("eng_start", { attemptId }),
  sendMessage: (attemptId: string, body: string) => invoke<EngMessage[]>("eng_send_message", { attemptId, body }),
  acknowledgeUpdate: (attemptId: string) => invoke<string | null>("eng_acknowledge_update", { attemptId }),
  saveDraft: (attemptId: string, field: string, body: string, baseRevision: number) =>
    invoke<EngDraftSave>("eng_save_draft", { attemptId, field, body, baseRevision }),
  packagePreview: (attemptId: string) => invoke<EngPackagePlan>("eng_package_preview", { attemptId }),
  uploadPackage: (attemptId: string) => invoke<EngUploadOutcome>("eng_upload_package", { attemptId }),
  submit: (attemptId: string, uploadId: string, answers: Record<string, string>) =>
    invoke<EngReceipt>("eng_submit", { attemptId, uploadId, answers }),
  getReport: (attemptId: string) => invoke<EngReport | null>("eng_get_report", { attemptId }),
  openWorkspace: (attemptId: string) => invoke<void>("eng_open_workspace", { attemptId }),
};

export const engAuthoredApi = {
  view: (attemptId: string) => invoke<AuthoredView>("eng_authored_view", { attemptId }),
  action: (attemptId: string, action: "consent" | "environment_ready" | "start", continueWithoutCheck = false) =>
    invoke<AuthoredView>("eng_authored_action", { attemptId, action, continueWithoutCheck }),
  prepare: (attemptId: string) => invoke<EngLocalState>("eng_authored_prepare", { attemptId }),
  local: (attemptId: string) => invoke<{ local: EngLocalState | null; plannedProjectDir: string }>("eng_authored_local", { attemptId }),
  runTests: (attemptId: string, purpose: "environment_check" | "workspace") => invoke<PublicRun>("eng_authored_run_tests", { attemptId, purpose }),
  collaboration: (attemptId: string) => invoke<Collaboration>("eng_authored_collaboration", { attemptId }),
  sendTeam: (attemptId: string, teammateId: string, body: string, clientMsgId: string) =>
    invoke<Collaboration>("eng_authored_team", { attemptId, teammateId, body, clientMsgId }),
  submit: (attemptId: string, handoff: Record<string, string>, aiUse: string) =>
    invoke<AuthoredReceipt>("eng_authored_submit", { attemptId, handoff, aiUse }),
  report: (attemptId: string) => invoke<AuthoredReport | null>("eng_authored_report", { attemptId }),
  filesStatus: (attemptId: string) => invoke<FilesSyncStatus>("eng_authored_files_status", { attemptId }),
  syncFiles: (attemptId: string) => invoke<FilesSyncStatus>("eng_authored_sync_files", { attemptId }),
  resolveFiles: (attemptId: string, choice: "keep_local" | "use_website") =>
    invoke<FilesSyncStatus>("eng_authored_resolve_files", { attemptId, choice }),
  outbox: (attemptId: string) => invoke<AuthoredOutbox>("eng_authored_outbox", { attemptId }),
  saveHandoff: (attemptId: string, handoff: Record<string, string>, aiUse: string) =>
    invoke<string>("eng_authored_save_handoff", { attemptId, handoff, aiUse }),
};
