import { invoke } from "@tauri-apps/api/core";

// Typed bindings for the Rust commands (see src-tauri/src/*.rs).

export type SessionStatus = "idle" | "active" | "submitted";

export interface SessionInfo {
  status: SessionStatus;
  scenario_id: string | null;
  scenario_version: string | null;
  scenario_label: string | null;
  started_at: string | null;
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
}

export interface Receipt {
  submission_id: string;
  sha256: string;
  scenario_id: string;
  scenario_version: string;
  submitted_at: string;
  file_count: number;
  event_count: number;
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

export const api = {
  joinSession: (invite_code: string) =>
    invoke<SessionInfo>("join_session", { inviteCode: invite_code }),
  sessionStatus: () => invoke<SessionInfo>("session_status"),
  listFiles: () => invoke<FileEntry[]>("list_files"),
  readFile: (path: string) => invoke<FileContent>("read_file", { path }),
  writeFile: (path: string, content: string, rev: number) =>
    invoke<FileContent>("write_file", { req: { path, content, rev } }),
  runTests: () => invoke<TestRunResult>("run_tests"),
  appendEvent: (kind: string, payload: Record<string, unknown>) =>
    invoke<number>("append_event", { event: { kind, payload } }),
  getEvents: () => invoke<SessionEvent[]>("get_events"),
  submit: (handoff: Record<string, unknown>) =>
    invoke<Receipt>("submit", { handoff }),
};
