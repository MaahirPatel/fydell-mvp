import type { AttemptStatus, InvitationStatus, ReportStatus, RunStatus } from "./types";

/**
 * The employer-facing operational state is derived from the separate state
 * machines (invitation, attempt, evaluation, report) rather than stored as a
 * second status that could drift from them.
 */
export type OperationalState =
  | "invited"
  | "accepted"
  | "setup_complete"
  | "in_progress"
  | "submitted"
  | "evaluating"
  | "evaluation_delayed"
  | "review_required"
  | "ready"
  | "expired"
  | "withdrawn";

export const OPERATIONAL_STATES: Record<OperationalState, { label: string; meaning: string; tone: "neutral" | "active" | "changed" | "risk" | "good" }> = {
  invited: { label: "Invited", meaning: "Invitation created. The candidate has not accepted it yet.", tone: "neutral" },
  accepted: { label: "Accepted", meaning: "The candidate accepted and is reading the brief or setting up.", tone: "neutral" },
  setup_complete: { label: "Setup complete", meaning: "The setup check passed. The timer has not started.", tone: "active" },
  in_progress: { label: "In progress", meaning: "The timer is running.", tone: "active" },
  submitted: { label: "Submitted", meaning: "Archive and handoff accepted. Evaluation is being queued.", tone: "active" },
  evaluating: { label: "Evaluating", meaning: "Trusted checks are running in an isolated environment.", tone: "active" },
  evaluation_delayed: {
    label: "Evaluation delayed",
    meaning: "The evaluation environment failed. This is a platform issue, not a candidate result. Fydell is retrying or will contact you.",
    tone: "changed",
  },
  review_required: { label: "In human review", meaning: "Checks finished. A qualified reviewer is verifying findings before release.", tone: "active" },
  ready: { label: "Report ready", meaning: "A human-checked report has been released.", tone: "good" },
  expired: { label: "Expired", meaning: "The invitation or attempt window ended without a submission.", tone: "neutral" },
  withdrawn: { label: "Withdrawn", meaning: "Your team withdrew this invitation.", tone: "neutral" },
};

export function operationalState(input: {
  invitation: { status: InvitationStatus; expires_at: string };
  attempt: { status: AttemptStatus } | null;
  run: { status: RunStatus } | null;
  releasedReport: { status: ReportStatus } | null;
  now?: Date;
}): OperationalState {
  const now = input.now ?? new Date();
  if (input.invitation.status === "withdrawn") return "withdrawn";
  const attempt = input.attempt;
  if (!attempt) {
    if (input.invitation.status === "expired" || new Date(input.invitation.expires_at) <= now) return "expired";
    return "invited";
  }
  if (attempt.status === "withdrawn") return "withdrawn";
  if (attempt.status === "expired") return "expired";
  if (attempt.status === "accepted") return "accepted";
  if (attempt.status === "preflight_passed") return "setup_complete";
  if (attempt.status === "in_progress") return "in_progress";
  if (input.releasedReport?.status === "released") return "ready";
  const run = input.run;
  if (!run || run.status === "canceled") return "submitted";
  if (run.status === "queued" || run.status === "running") return "evaluating";
  if (run.status === "retryable_failure" || run.status === "blocked") return "evaluation_delayed";
  return "review_required";
}

/** Deadline including any logged extension. */
export function effectiveDueAt(attempt: { due_at: string | null; extension_minutes: number }): Date | null {
  if (!attempt.due_at) return null;
  return new Date(new Date(attempt.due_at).getTime() + attempt.extension_minutes * 60000);
}

export function submissionWindow(
  attempt: { due_at: string | null; extension_minutes: number },
  graceMinutes: number,
  now = new Date()
): "open" | "late" | "closed" {
  const due = effectiveDueAt(attempt);
  if (!due) return "closed";
  if (now <= due) return "open";
  if (now.getTime() <= due.getTime() + graceMinutes * 60000) return "late";
  return "closed";
}
