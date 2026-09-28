/**
 * Human QA hold for engineering reports (AI-12). Pure rules.
 *
 * The employer sees an engineering report only after a qualified Fydell
 * reviewer releases it. Releasing a report whose code was not evaluated
 * cleanly (runner failure, not configured, indeterminate, no files) needs a
 * written note so the release decision is explicit. A released report can
 * be reopened for correction; the history is append-only.
 */

export type ReviewStatus = "pending" | "released" | "changes_requested";
export type ReviewAction = "release" | "request_changes" | "reopen";

/** What the reviewer is deciding on. "pending" = no finished evaluation yet. */
export type EvaluationState =
  | "completed"
  | "indeterminate"
  | "infrastructure_error"
  | "not_configured"
  | "no_files"
  | "pending";

export const MIN_NOTE_CHARS = 20;

export type ReviewDecision =
  | { ok: true; status: ReviewStatus }
  | { ok: false; error: string };

export function applyReviewAction(
  current: ReviewStatus,
  action: ReviewAction,
  input: { notes: string; evaluation: EvaluationState }
): ReviewDecision {
  const notes = input.notes.trim();
  switch (action) {
    case "release": {
      if (current === "released") return { ok: false, error: "This report is already released." };
      if (input.evaluation === "pending") {
        return { ok: false, error: "The code evaluation has not finished. Wait for it, or retry analysis first." };
      }
      if (input.evaluation !== "completed" && notes.length < MIN_NOTE_CHARS) {
        return {
          ok: false,
          error: "The code was not evaluated cleanly. Explain in the note what the employer should rely on before releasing.",
        };
      }
      return { ok: true, status: "released" };
    }
    case "request_changes": {
      if (current === "released") return { ok: false, error: "Reopen the report before requesting changes." };
      if (notes.length < MIN_NOTE_CHARS) return { ok: false, error: "Say what needs to change." };
      return { ok: true, status: "changes_requested" };
    }
    case "reopen": {
      if (current !== "released") return { ok: false, error: "Only a released report can be reopened." };
      if (notes.length < MIN_NOTE_CHARS) return { ok: false, error: "Say why the report is being reopened." };
      return { ok: true, status: "pending" };
    }
    default:
      return { ok: false, error: "Unknown action." };
  }
}

/** Employer-facing gate: only a released report is shown. */
export function employerCanSeeReport(status: ReviewStatus | null): boolean {
  return status === "released";
}

export const REVIEW_HOLD_MESSAGE =
  "A Fydell reviewer is checking this report before it is released to you. This page updates on its own when it is ready.";
