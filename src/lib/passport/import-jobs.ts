/**
 * Import job contract for the engineering work record.
 *
 * Jobs are rows in public.durable_jobs (job_type 'passport_import'). This
 * module is pure: it maps stored rows to the user-visible state, classifies
 * failures, and computes bounded retry schedules. The server store applies it.
 *
 * Stored state      → visible state
 *   queued          → queued
 *   running         → running
 *   failed          → retry_scheduled (a retry is due at next_attempt_at)
 *   succeeded       → succeeded
 *   dead_letter     → failed, or cancelled when error_code = 'cancelled'
 *
 * Cancellation stops an import before its results are saved. A job that has
 * already reached the saving stage completes.
 */

import type { ExtractionErrorCode } from "./github/types";

export const IMPORT_JOB_TYPE = "passport_import";
export const IMPORT_MAX_ATTEMPTS = 4;
export const IMPORT_LEASE_SECONDS = 90;
export const IMPORT_MAX_ACTIVE_PER_OWNER = 3;
export const IMPORT_MAX_PER_HOUR = 20;
const RETRY_BASE_SECONDS = 30;
const RETRY_CAP_SECONDS = 15 * 60;

export type StoredJobState = "queued" | "running" | "succeeded" | "failed" | "dead_letter";
export type ImportJobState = "queued" | "running" | "retry_scheduled" | "succeeded" | "failed" | "cancelled";
export type ImportStage = "queued" | "resolving" | "listing" | "fetching" | "analyzing" | "saving" | "done";

export type ImportErrorCode =
  | ExtractionErrorCode
  | "save_failed"
  | "worker_interrupted"
  | "attempts_exhausted"
  | "cancelled";

export type ImportPayload = {
  repository: string;
  commitSha: string;
  revisionRef: string;
  contribution: string;
  githubLogin: string | null;
  displayName: string;
};

export type ImportResultRef = {
  projectId: string;
  findings: number;
  status: "complete" | "partial";
  reusedExistingVersion: boolean;
  /** Absent on jobs finished before receipts existed. */
  receiptId?: string;
};

export type ImportJobView = {
  id: string;
  repository: string;
  commitSha: string;
  revisionRef: string;
  state: ImportJobState;
  stage: ImportStage;
  progress: { filesFetched?: number; filesSelected?: number };
  attempts: number;
  maxAttempts: number;
  errorCode: ImportErrorCode | null;
  error: string | null;
  retryable: boolean;
  nextAttemptAt: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  analysisVersion: string | null;
  result: ImportResultRef | null;
  /** True when no live worker holds the job and it is due: the client may ask to resume it. */
  needsWorker: boolean;
};

export type ImportJobRow = {
  id: string;
  state: StoredJobState;
  payload: unknown;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string | null;
  stage: string | null;
  progress: unknown;
  error_code: string | null;
  safe_error: string | null;
  retryable: boolean | null;
  result_ref: unknown;
  analysis_version: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
};

const STAGES: readonly ImportStage[] = ["queued", "resolving", "listing", "fetching", "analyzing", "saving", "done"];

export function visibleState(state: StoredJobState, errorCode: string | null): ImportJobState {
  switch (state) {
    case "queued":
      return "queued";
    case "running":
      return "running";
    case "failed":
      return "retry_scheduled";
    case "succeeded":
      return "succeeded";
    case "dead_letter":
      return errorCode === "cancelled" ? "cancelled" : "failed";
  }
}

export const isActive = (s: ImportJobState) => s === "queued" || s === "running" || s === "retry_scheduled";

export function parsePayload(raw: unknown): ImportPayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.repository !== "string" || typeof p.commitSha !== "string" || !/^[0-9a-f]{40}$/.test(p.commitSha)) return null;
  return {
    repository: p.repository,
    commitSha: p.commitSha,
    revisionRef: typeof p.revisionRef === "string" ? p.revisionRef : "",
    contribution: typeof p.contribution === "string" ? p.contribution : "",
    githubLogin: typeof p.githubLogin === "string" ? p.githubLogin : null,
    displayName: typeof p.displayName === "string" ? p.displayName : "",
  };
}

function parseResult(raw: unknown): ImportResultRef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.projectId !== "string") return null;
  return {
    projectId: r.projectId,
    findings: typeof r.findings === "number" ? r.findings : 0,
    status: r.status === "partial" ? "partial" : "complete",
    reusedExistingVersion: r.reusedExistingVersion === true,
    receiptId: typeof r.receiptId === "string" ? r.receiptId : undefined,
  };
}

function parseProgress(raw: unknown): ImportJobView["progress"] {
  if (typeof raw !== "object" || raw === null) return {};
  const p = raw as Record<string, unknown>;
  return {
    filesFetched: typeof p.filesFetched === "number" ? p.filesFetched : undefined,
    filesSelected: typeof p.filesSelected === "number" ? p.filesSelected : undefined,
  };
}

export function toJobView(row: ImportJobRow): ImportJobView | null {
  const payload = parsePayload(row.payload);
  if (!payload) return null;
  const state = visibleState(row.state, row.error_code);
  const stage = STAGES.includes(row.stage as ImportStage) ? (row.stage as ImportStage) : "queued";
  return {
    id: row.id,
    repository: payload.repository,
    commitSha: payload.commitSha,
    revisionRef: payload.revisionRef,
    state,
    stage: state === "succeeded" ? "done" : stage,
    progress: parseProgress(row.progress),
    attempts: row.attempt_count,
    maxAttempts: row.max_attempts,
    errorCode: (row.error_code as ImportErrorCode | null) ?? null,
    error: row.safe_error,
    retryable: row.retryable === true,
    nextAttemptAt: state === "retry_scheduled" ? row.next_attempt_at : null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    analysisVersion: row.analysis_version,
    result: parseResult(row.result_ref),
    needsWorker: false,
  };
}

/** Whether a job is waiting on a worker that is not coming: stale lease, or due but unclaimed for a while. */
export function needsWorker(
  view: Pick<ImportJobView, "state" | "createdAt">,
  row: { heartbeat_at: string | null; next_attempt_at: string | null },
  now: number,
): boolean {
  if (view.state === "running") return isStale(row.heartbeat_at, now);
  if (view.state === "queued" || view.state === "retry_scheduled") {
    const due = row.next_attempt_at ? Date.parse(row.next_attempt_at) : Date.parse(view.createdAt);
    return now - due > UNCLAIMED_GRACE_SECONDS * 1000;
  }
  return false;
}

const UNCLAIMED_GRACE_SECONDS = 15;

const SAFE_MESSAGES: Record<ImportErrorCode, string> = {
  invalid_input: "The selected repository or revision is not valid.",
  not_found: "The repository or the selected revision is no longer publicly available.",
  private_repository: "Only public repositories can be analyzed.",
  empty_repository: "This repository has no files to analyze.",
  rate_limited: "GitHub is limiting requests. Fydell will retry automatically.",
  github_unavailable: "GitHub could not be reached. Fydell will retry automatically.",
  save_failed: "The analysis finished but could not be saved. Fydell will retry automatically.",
  worker_interrupted: "The import was interrupted. Fydell will retry automatically.",
  attempts_exhausted: "The import failed after several attempts. Your existing reports are unchanged.",
  cancelled: "You cancelled this import. Nothing was saved.",
};

export function safeMessage(code: ImportErrorCode): string {
  return SAFE_MESSAGES[code];
}

/** Transient failures are retried; anything about the repository itself is not. */
export function isRetryable(code: ImportErrorCode): boolean {
  return code === "rate_limited" || code === "github_unavailable" || code === "save_failed" || code === "worker_interrupted";
}

/** Bounded exponential backoff, honouring a provider's retry-after when given. */
export function retryDelaySeconds(attempt: number, retryAfterSeconds?: number): number {
  const exp = RETRY_BASE_SECONDS * 2 ** Math.max(0, attempt - 1);
  const wanted = retryAfterSeconds && retryAfterSeconds > 0 ? Math.max(retryAfterSeconds, RETRY_BASE_SECONDS) : exp;
  return Math.min(wanted, RETRY_CAP_SECONDS);
}

export type FailureDecision =
  | { kind: "retry"; code: ImportErrorCode; message: string; delaySeconds: number }
  | { kind: "terminal"; code: ImportErrorCode; message: string; retryable: boolean };

/** Decides what happens after a failed attempt. `attempt` is the attempt that just failed (1-based). */
export function decideFailure(code: ImportErrorCode, attempt: number, maxAttempts: number, retryAfterSeconds?: number): FailureDecision {
  if (!isRetryable(code)) return { kind: "terminal", code, message: safeMessage(code), retryable: false };
  if (attempt >= maxAttempts) {
    return { kind: "terminal", code: "attempts_exhausted", message: safeMessage("attempts_exhausted"), retryable: true };
  }
  return { kind: "retry", code, message: safeMessage(code), delaySeconds: retryDelaySeconds(attempt, retryAfterSeconds) };
}

/** Idempotency key: one import per owner, repository, commit and analysis version. */
export function importIdempotencyKey(ownerId: string, repository: string, commitSha: string, analysisVersion: string): string {
  return `${ownerId}:${repository.toLowerCase()}:${commitSha}:${analysisVersion}`;
}

/** A running job whose heartbeat is older than the lease has lost its worker. */
export function isStale(heartbeatAt: string | null, now: number, leaseSeconds = IMPORT_LEASE_SECONDS): boolean {
  if (!heartbeatAt) return true;
  return now - Date.parse(heartbeatAt) > leaseSeconds * 1000;
}
