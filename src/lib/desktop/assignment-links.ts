/**
 * Assignment deep-link resolution (DESK-05).
 *
 * Web "Open in Fydell" and the in-app assignment list must reach the
 * AUTHORIZED attempt. Rules:
 *  - Opening a link NEVER grants access by itself: resolution only opens an
 *    attempt the session is already authorized for.
 *  - Expired links explain recovery (what to do next), they do not 404.
 *  - Wrong-account links explain recovery (sign in as the invited identity).
 *  - Unknown links explain recovery instead of failing silently.
 *
 * Lookups are injected so this stays pure and testable with fakes; the
 * route layer supplies the real stores.
 */

export interface AssignmentLinkSession {
  /** Signed-in user id, or null when anonymous. */
  userId: string | null;
  /** Email of the signed-in account, if known. */
  accountEmail: string | null;
}

export interface ResolvedAttempt {
  attemptId: string;
  invitationId: string | null;
  /** Candidate the attempt is bound to (SIM-01 binding). */
  candidateUserId: string;
  /** Email the invitation was addressed to, if invitation-origin. */
  invitedEmail: string | null;
  state: "accepted" | "active" | "submitted" | "expired";
  expired: boolean;
}

export interface ParsedAssignmentLink {
  /** Attempt id from e.g. /a/<attemptId> or ?attempt=<id>. */
  attemptId: string | null;
  /** Invitation token from e.g. /invite/<token>. */
  invitationToken: string | null;
}

export type LinkResolution =
  | { kind: "open_attempt"; attemptId: string }
  | {
      kind: "recovery";
      reason: "not_signed_in" | "not_found" | "expired" | "wrong_account" | "not_authorized";
      /** Human-readable recovery explanation shown to the user. */
      message: string;
    };

const ATTEMPT_PATH = /^\/a\/([A-Za-z0-9_-]{6,64})\/?$/;
const INVITE_PATH = /^\/invite\/([A-Za-z0-9_-]{6,128})\/?$/;

/** Parse a Fydell assignment link into its references. Null when not a link we handle. */
export function parseAssignmentLink(rawUrl: string): ParsedAssignmentLink | null {
  let url: URL;
  try {
    url = new URL(rawUrl, "https://fydell.example");
  } catch {
    return null;
  }
  const attemptMatch = ATTEMPT_PATH.exec(url.pathname);
  if (attemptMatch) return { attemptId: attemptMatch[1], invitationToken: null };
  const inviteMatch = INVITE_PATH.exec(url.pathname);
  if (inviteMatch) return { attemptId: null, invitationToken: inviteMatch[1] };
  const attemptParam = url.searchParams.get("attempt");
  if (attemptParam && /^[A-Za-z0-9_-]{6,64}$/.test(attemptParam)) {
    return { attemptId: attemptParam, invitationToken: null };
  }
  return null;
}

export interface AssignmentLinkDeps {
  session: AssignmentLinkSession;
  /** Resolve an attempt id to its binding record (null when unknown). */
  findAttempt: (attemptId: string) => ResolvedAttempt | null;
  /** Resolve an invitation token to the attempt it created (null when unknown/invalid). */
  findAttemptByInvitationToken?: (token: string) => ResolvedAttempt | null;
}

/**
 * Resolve a parsed link. The link itself confers no access: every
 * open_attempt requires the session user to match the attempt's bound
 * candidate. Anything else is a recovery explanation.
 */
export function resolveAssignmentLink(
  link: ParsedAssignmentLink,
  deps: AssignmentLinkDeps
): LinkResolution {
  if (!deps.session.userId) {
    return {
      kind: "recovery",
      reason: "not_signed_in",
      message:
        "Sign in to open this assignment. Use the account the invitation was sent to.",
    };
  }

  let attempt: ResolvedAttempt | null = null;
  if (link.attemptId) attempt = deps.findAttempt(link.attemptId);
  else if (link.invitationToken && deps.findAttemptByInvitationToken) {
    attempt = deps.findAttemptByInvitationToken(link.invitationToken);
  }

  if (!attempt) {
    return {
      kind: "recovery",
      reason: "not_found",
      message:
        "We couldn't find that assignment. Check the link is complete, or ask the sender to resend the invitation.",
    };
  }

  if (attempt.expired || attempt.state === "expired") {
    return {
      kind: "recovery",
      reason: "expired",
      message:
        "This assignment link has expired. Contact the hiring team to request a new invitation. Your previous work is preserved.",
    };
  }

  if (attempt.candidateUserId !== deps.session.userId) {
    const hint = attempt.invitedEmail
      ? ` It was sent to ${attempt.invitedEmail}.`
      : "";
    return {
      kind: "recovery",
      reason: "wrong_account",
      message: `This assignment belongs to a different account.${hint} Sign in with the invited account to continue.`,
    };
  }

  if (attempt.state === "submitted") {
    return {
      kind: "recovery",
      reason: "not_authorized",
      message:
        "This assignment was already submitted and is closed for editing. You can review your receipt from the assignment list.",
    };
  }

  return { kind: "open_attempt", attemptId: attempt.attemptId };
}
