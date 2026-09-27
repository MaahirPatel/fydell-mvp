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
};
