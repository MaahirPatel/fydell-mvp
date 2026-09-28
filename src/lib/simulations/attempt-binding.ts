/**
 * Durable attempt binding (SIM-01).
 *
 * An attempt binds exactly one candidate, one role, one employer
 * (organization), one pinned scenario version, and one allowed time budget.
 * Resuming must return the SAME attempt (no duplicated events or state).
 *
 * This module holds the pure binding rules. Persistence (Supabase) enforces
 * them with unique constraints; see db.ts createSelfServeAttempt /
 * acceptInvitation for the idempotent resume paths.
 */

export interface AttemptBinding {
  candidateUserId: string;
  organizationId: string;
  templateId: string;
  templateVersionId: string;
  durationMinutes: number;
  origin: "invitation" | "self_serve";
  invitationId: string | null;
}

export function validateAttemptBinding(b: Partial<AttemptBinding>): string[] {
  const errors: string[] = [];
  if (!b.candidateUserId) errors.push("Attempt must bind a candidate user");
  if (!b.organizationId) errors.push("Attempt must bind an employer organization");
  if (!b.templateId) errors.push("Attempt must bind a simulation template");
  if (!b.templateVersionId)
    errors.push("Attempt must pin an immutable template version (not 'latest')");
  if (!Number.isFinite(b.durationMinutes) || (b.durationMinutes as number) <= 0)
    errors.push("Attempt must declare a positive time budget");
  if (b.origin === "invitation" && !b.invitationId)
    errors.push("Invitation-origin attempts must reference the invitation");
  return errors;
}

/**
 * Resume idempotency key: accepting the same invitation twice (or retrying
 * the create call) must resolve to the same attempt. The key is derived from
 * stable inputs only — never from timestamps or randomness.
 */
export function resumeKey(input: {
  origin: "invitation" | "self_serve";
  invitationId?: string | null;
  candidateUserId: string;
  templateId: string;
}): string {
  if (input.origin === "invitation") {
    if (!input.invitationId) throw new Error("Invitation origin requires invitationId");
    return `invite:${input.invitationId}`;
  }
  return `selfserve:${input.candidateUserId}:${input.templateId}`;
}

/**
 * SIM-01 resume rule: an existing non-submitted attempt for the same binding
 * is resumed, never duplicated. Submitted attempts are terminal — a new
 * attempt requires a new invitation (or a new self-serve start).
 */
export function shouldResumeExisting(args: {
  existingStatus: "accepted" | "active" | "submitted" | "analyzed" | "report_ready" | null;
  sameBinding: boolean;
}): "resume" | "create_new" | "reject" {
  if (!args.existingStatus || !args.sameBinding) return "create_new";
  if (["submitted", "analyzed", "report_ready"].includes(args.existingStatus)) return "reject";
  return "resume";
}
