/**
 * Employer chunk - EMP-06: operational states with defined meaning.
 *
 * Every candidate assessment invitation moves through one canonical state
 * machine. Transitions are enforced server-side (see transitionInvitation);
 * the UI may only *request* events, never set states directly.
 *
 * Meaning of each state:
 * - draft:        created by the employer, not yet sent. No email, no charge,
 *                 candidate sees nothing. The assessment config is pinned here.
 * - invited:      deliberate send happened. The candidate has a usable invite
 *                 link; delivery status tracks the email separately.
 * - accepted:     candidate opened the link and accepted. No work started.
 * - setup:        candidate is provisioning the workspace / preflight.
 * - in_progress:  timed assessment work is underway.
 * - submitted:    candidate submitted; awaiting analysis.
 * - evaluating:   analysis/scoring is running.
 * - review_required: analysis finished but a human reviewer must check
 *                 consequential findings before the report is released (AI-12).
 * - ready:        report is released to the employer. Terminal.
 * - expired:      invite deadline passed without acceptance, or the attempt
 *                 window closed. Terminal.
 * - withdrawn:    employer revoked the invitation / withdrew the attempt.
 *                 Terminal.
 */

import type { InvitationState } from "./types";

export const STATE_MEANING: Record<InvitationState, string> = {
  draft: "Created by the employer, not yet sent. Candidate sees nothing; no charge.",
  invited: "Deliberate send happened; candidate has a usable invite link.",
  accepted: "Candidate accepted the invite; no assessment work started.",
  setup: "Candidate is provisioning the workspace and running preflight.",
  in_progress: "Timed assessment work is underway.",
  submitted: "Candidate submitted; awaiting analysis.",
  evaluating: "Analysis and scoring are running.",
  review_required: "Analysis finished; a human reviewer must verify findings before release.",
  ready: "Report released to the employer. Terminal.",
  expired: "Deadline passed without acceptance, or the attempt window closed. Terminal.",
  withdrawn: "Employer revoked the invite or withdrew the attempt. Terminal.",
};

export const TERMINAL_STATES: ReadonlySet<InvitationState> = new Set([
  "ready",
  "expired",
  "withdrawn",
]);

/** Events the server accepts. Each maps to exactly one legal transition. */
export type InvitationEvent =
  | "send"
  | "accept"
  | "begin_setup"
  | "begin_work"
  | "submit"
  | "evaluation_started"
  | "flag_for_review"
  | "release_report"
  | "expire"
  | "withdraw";

const TRANSITIONS: Record<InvitationEvent, { from: InvitationState[]; to: InvitationState }> = {
  send: { from: ["draft"], to: "invited" },
  accept: { from: ["invited"], to: "accepted" },
  begin_setup: { from: ["accepted"], to: "setup" },
  begin_work: { from: ["accepted", "setup"], to: "in_progress" },
  submit: { from: ["in_progress", "setup"], to: "submitted" },
  evaluation_started: { from: ["submitted"], to: "evaluating" },
  flag_for_review: { from: ["evaluating"], to: "review_required" },
  release_report: { from: ["evaluating", "review_required"], to: "ready" },
  expire: {
    from: ["draft", "invited", "accepted", "setup"],
    to: "expired",
  },
  withdraw: {
    from: ["draft", "invited", "accepted", "setup", "in_progress", "submitted", "evaluating", "review_required"],
    to: "withdrawn",
  },
};

export type TransitionError = "illegal_transition" | "terminal_state";

export function transitionInvitation(
  current: InvitationState,
  event: InvitationEvent
): { ok: true; next: InvitationState } | { ok: false; code: TransitionError; message: string } {
  if (TERMINAL_STATES.has(current)) {
    return {
      ok: false,
      code: "terminal_state",
      message: `invitation is ${current}; terminal states never transition`,
    };
  }
  const rule = TRANSITIONS[event];
  if (!rule.from.includes(current)) {
    return {
      ok: false,
      code: "illegal_transition",
      message: `event ${event} is not legal from state ${current}`,
    };
  }
  return { ok: true, next: rule.to };
}

/** States in which a resend is meaningful (candidate-facing link re-issued). */
export const RESENDABLE_STATES: ReadonlySet<InvitationState> = new Set(["invited", "accepted"]);

/** States in which the employer may revoke. */
export const REVOCABLE_STATES: ReadonlySet<InvitationState> = new Set([
  "draft",
  "invited",
  "accepted",
  "setup",
  "in_progress",
  "submitted",
  "evaluating",
  "review_required",
]);
