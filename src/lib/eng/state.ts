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
    meaning: "The evaluation environment failed. This is a platform issue, not a candidate result. It retries automatically, and your team can retry it from the attempt page.",
    tone: "changed",
  },
  review_required: { label: "Review required", meaning: "Tests finished. Someone on your team reviews the evidence and releases the report.", tone: "changed" },
  ready: { label: "Report ready", meaning: "Your team reviewed the evidence and released the report.", tone: "good" },
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

/**
 * The simulation session lifecycle shown to candidates and employers, on web
 * and desktop alike. Derived from the operational state, so there is one
 * server-side source of truth and nothing to keep in sync.
 */
export type SessionLifecycle =
  | "available"
  | "preparing"
  | "ready"
  | "active"
  | "submission_pending"
  | "submitted"
  | "analysis_pending"
  | "analysis_failed"
  | "report_ready"
  | "cancelled"
  | "expired";

export type LifecycleView = { state: SessionLifecycle; label: string; detail: string };

export function sessionLifecycle(
  op: OperationalState,
  opts: { audience: "candidate" | "employer"; submissionRecorded?: boolean; windowClosed?: boolean },
): LifecycleView {
  const candidate = opts.audience === "candidate";
  switch (op) {
    case "invited":
      return { state: "available", label: "Available", detail: candidate ? "Accept the invitation to read the brief. Nothing is timed yet." : "Invitation sent. The candidate has not accepted it yet." };
    case "accepted":
      return { state: "preparing", label: "Preparing", detail: candidate ? "Read the brief and the terms, then run the environment check. The timer has not started." : "The candidate is reading the brief or setting up." };
    case "setup_complete":
      return { state: "ready", label: "Ready to start", detail: candidate ? "Setup is done. The timer starts when you press Start." : "Setup passed. The timer has not started." };
    case "in_progress":
      if (opts.submissionRecorded) {
        return { state: "submission_pending", label: "Submission pending", detail: "The submission was recorded and is being finalised. Reloading completes it; nothing needs to be sent again." };
      }
      if (opts.windowClosed) {
        return {
          state: "expired",
          label: "Time is up",
          detail: candidate
            ? "The submission window closed before anything was submitted. Your saved files are kept; contact the employer if you need an extension."
            : "The window closed without a submission. The candidate's saved files are kept; you can grant an extension.",
        };
      }
      return { state: "active", label: "In progress", detail: candidate ? "The timer is running. Your files save to Fydell as you work." : "The timer is running." };
    case "submitted":
      return { state: "submitted", label: "Submitted", detail: candidate ? "Fydell received your files and handoff. Analysis is being queued." : "Files and handoff received. Analysis is being queued." };
    case "evaluating":
      return { state: "analysis_pending", label: "Analysis pending", detail: candidate ? "Your submission is being checked in an isolated environment." : "Trusted checks are running on the exact submitted files." };
    case "evaluation_delayed":
      return {
        state: "analysis_failed",
        label: "Analysis delayed",
        detail: candidate
          ? "A platform problem stopped the analysis. This is not a result about your work. Your submission is stored unchanged and the analysis will be retried."
          : "The analysis environment failed. This is a platform issue, not a candidate result. The submission is stored unchanged; it retries automatically and can be retried from this page.",
      };
    case "review_required":
      return candidate
        ? { state: "submitted", label: "Submitted", detail: "Analysis finished. The hiring team reviews it before releasing your report." }
        : { state: "report_ready", label: "Report ready for review", detail: "Analysis finished. Review the evidence and release the report." };
    case "ready":
      return { state: "report_ready", label: "Report ready", detail: candidate ? "The hiring team released your report." : "Your team reviewed the evidence and released the report." };
    case "expired":
      return { state: "expired", label: "Expired", detail: "The invitation or attempt window ended without a submission." };
    case "withdrawn":
      return { state: "cancelled", label: "Cancelled", detail: candidate ? "The employer withdrew this invitation." : "Your team withdrew this invitation." };
  }
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
