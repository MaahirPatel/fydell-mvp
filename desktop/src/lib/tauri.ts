import { invoke } from "@tauri-apps/api/core";

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

export interface TestRunResult {
  status: "completed" | "timeout" | "output_limit" | "runtime_error";
  exit_code: number | null;
  passed: number | null;
  failed: number | null;
  total: number | null;
  duration_ms: number;
  stdout: string;
  stderr: string;
  truncated: boolean;
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
  getPassport: () => invoke<PassportView | null>("get_passport"),  addProject: (repository: string, contribution: string, githubLogin?: string | null) =>
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
