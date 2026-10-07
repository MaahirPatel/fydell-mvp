/**
 * Structured, actionable submission errors (UP-08).
 *
 * Every rejection of a snapshot submission carries:
 * - a stable machine `code` the desktop client can switch on,
 * - a human `message` that names the problem without leaking secrets,
 * - a `recovery` action telling the candidate exactly what to do next,
 * - `workPreserved: true` - no rejection path deletes or overwrites the
 *   candidate's local work.
 *
 * Leakage contract (audited in scripts/test-submit-grind-finalize.ts):
 * messages may name the scenario id/version, byte counts, sanitized display
 * paths, operation ids and error codes. They must NEVER contain file
 * contents, manifest digests, stack traces, or database error text.
 *
 * Pure module - no `server-only` - so it is unit-testable in-process.
 */

export const SUBMISSION_ERROR_CODES = [
  "SESSION_NOT_FOUND",
  "FORBIDDEN",
  "SESSION_NOT_ACTIVE",
  "SNAPSHOT_SHAPE",
  "SCENARIO_MISMATCH",
  "VERSION_MISMATCH",
  "SCENARIO_UNAVAILABLE",
  "MANIFEST_INCONSISTENT",
  "MANIFEST_DIGEST_INVALID",
  "PATH_UNSAFE",
  "DUPLICATE_PATH",
  "HASH_MISMATCH",
  "FILE_TOO_LARGE",
  "TOTAL_TOO_LARGE",
  "TOO_MANY_FILES",
  "EMPTY_SNAPSHOT",
  "CONTENT_UNSAFE",
  "TRANSFER_CONFLICT",
  "OPERATION_ID_REQUIRED",
  "INFRA_ERROR",
] as const;

export type SubmitErrorCode = (typeof SUBMISSION_ERROR_CODES)[number];

const RECOVERY: Record<SubmitErrorCode, string> = {
  SESSION_NOT_FOUND:
    "This assessment session no longer exists. Restart it from your invitation link.",
  FORBIDDEN:
    "You are signed in with an account that does not own this attempt. Sign in with the invited account and try again.",
  SESSION_NOT_ACTIVE:
    "This attempt is already submitted or closed. Open your existing receipt instead of submitting again.",
  SNAPSHOT_SHAPE:
    "The submission package was malformed. Update the desktop app and try again. Your workspace files are untouched.",
  SCENARIO_MISMATCH:
    "This file package belongs to a different scenario. Open the correct attempt and submit from its workspace. Your work is preserved.",
  VERSION_MISMATCH:
    "This file package pins an outdated scenario version. Refresh the attempt to get the current version, then submit again. Your work is preserved.",
  SCENARIO_UNAVAILABLE:
    "This session has no file package configured. Contact support. Do not recreate the assessment; your work is preserved.",
  MANIFEST_INCONSISTENT:
    "The file list and its manifest disagree. Rebuild the snapshot from your current workspace and submit again. Nothing was stored.",
  MANIFEST_DIGEST_INVALID:
    "A manifest entry is not a valid SHA-256 digest. Rebuild the snapshot from your current workspace and submit again. Nothing was stored.",
  PATH_UNSAFE:
    "One file has an unsafe path (for example '..', an absolute path, or special characters). Rename it inside your workspace and submit again. Your work is preserved.",
  DUPLICATE_PATH:
    "Two files resolve to the same path. Rename one and submit again. Your work is preserved.",
  HASH_MISMATCH:
    "A file changed after the snapshot was built. Rebuild the snapshot from the current workspace and submit again. Nothing was stored.",
  FILE_TOO_LARGE:
    "One file exceeds the per-file size limit. Split it or remove generated files, then submit again. Your work is preserved.",
  TOTAL_TOO_LARGE:
    "The snapshot exceeds the total size limit. Remove generated files or dependencies and submit again. Your work is preserved.",
  TOO_MANY_FILES:
    "The snapshot has too many files. Submit only the scenario's source files and try again. Your work is preserved.",
  EMPTY_SNAPSHOT:
    "The snapshot has no files. Add your work files to the workspace and submit again.",
  CONTENT_UNSAFE:
    "A file contains data this snapshot format cannot carry safely. Remove or fix the file and submit again. Your work is preserved.",
  TRANSFER_CONFLICT:
    "This attempt's submission is already in progress or finished. Refresh the submission status instead of sending another request. Your work is preserved.",
  OPERATION_ID_REQUIRED:
    "The request is missing its idempotency key. Update the desktop app and try again. Your work is preserved.",
  INFRA_ERROR:
    "Our servers hit a problem saving your submission. This is not a reflection of your work. Your files are safe on this device. Wait a moment and retry; the retry cannot create a duplicate. If it keeps failing, contact support with your operation ID.",
};

const HTTP_STATUS: Record<SubmitErrorCode, number> = {
  SESSION_NOT_FOUND: 404,
  FORBIDDEN: 403,
  SESSION_NOT_ACTIVE: 409,
  SNAPSHOT_SHAPE: 422,
  SCENARIO_MISMATCH: 422,
  VERSION_MISMATCH: 422,
  SCENARIO_UNAVAILABLE: 409,
  MANIFEST_INCONSISTENT: 422,
  MANIFEST_DIGEST_INVALID: 422,
  PATH_UNSAFE: 422,
  DUPLICATE_PATH: 422,
  HASH_MISMATCH: 422,
  FILE_TOO_LARGE: 422,
  TOTAL_TOO_LARGE: 422,
  TOO_MANY_FILES: 422,
  EMPTY_SNAPSHOT: 422,
  CONTENT_UNSAFE: 422,
  TRANSFER_CONFLICT: 409,
  OPERATION_ID_REQUIRED: 400,
  INFRA_ERROR: 502,
};

export function recoveryForCode(code: SubmitErrorCode): string {
  return RECOVERY[code];
}

export function httpStatusForCode(code: SubmitErrorCode): number {
  return HTTP_STATUS[code];
}

export class SubmissionError extends Error {
  readonly code: SubmitErrorCode;
  readonly recovery: string;
  /** Rejections never delete or overwrite the candidate's local work. */
  readonly workPreserved = true;
  readonly httpStatus: number;

  constructor(code: SubmitErrorCode, message?: string) {
    super(message ?? defaultMessageForCode(code));
    this.name = "SubmissionError";
    this.code = code;
    this.recovery = RECOVERY[code];
    this.httpStatus = HTTP_STATUS[code];
  }
}

function defaultMessageForCode(code: SubmitErrorCode): string {
  switch (code) {
    case "SESSION_NOT_FOUND":
      return "Session not found";
    case "FORBIDDEN":
      return "You do not have access to this session";
    case "SESSION_NOT_ACTIVE":
      return "Session is not active";
    case "TRANSFER_CONFLICT":
      return "Submission state conflict";
    case "OPERATION_ID_REQUIRED":
      return "Missing operation id";
    case "INFRA_ERROR":
      return "Submission could not be saved due to a server problem";
    default:
      return "File snapshot rejected";
  }
}

/** Build a SubmissionError for one structured snapshot-validation issue. */
export function snapshotIssueToError(issue: {
  code:
    | "SCENARIO_MISMATCH"
    | "VERSION_MISMATCH"
    | "EMPTY_SNAPSHOT"
    | "TOO_MANY_FILES"
    | "MANIFEST_INCONSISTENT"
    | "MANIFEST_DIGEST_INVALID"
    | "PATH_UNSAFE"
    | "DUPLICATE_PATH"
    | "FILE_TOO_LARGE"
    | "TOTAL_TOO_LARGE"
    | "HASH_MISMATCH"
    | "CONTENT_UNSAFE";
  message: string;
}): SubmissionError {
  return new SubmissionError(issue.code, issue.message);
}

/**
 * Serialize any thrown value into a safe API error body. Non-SubmissionError
 * values (database errors, unexpected exceptions) become INFRA_ERROR with a
 * generic message - their details never reach the client.
 */
export function toSubmitErrorResponse(err: unknown): {
  status: number;
  body: {
    ok: false;
    error: { code: SubmitErrorCode; message: string; recovery: string; workPreserved: true };
  };
} {
  const se = err instanceof SubmissionError ? err : new SubmissionError("INFRA_ERROR");
  return {
    status: se.httpStatus,
    body: {
      ok: false as const,
      error: {
        code: se.code,
        message: se.message,
        recovery: se.recovery,
        workPreserved: true as const,
      },
    },
  };
}
