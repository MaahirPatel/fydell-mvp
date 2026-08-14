export const WAVE1_AUDIT_EVENTS = [
  "invitation.created",
  "invitation.email_failed",
  "invitation.accepted",
  "invitation.revoked",
  "attempt.started",
  "attempt.submitted",
  "analysis.completed",
  "analysis.failed",
  "receipt.shared",
  "receipt.revoked",
] as const;

export const WAVE1_ANALYTICS_EVENTS = [
  "marketing.cta_pilot",
  "marketing.cta_evaluation",
  "employer.invite_opened",
  "employer.invite_created",
  "candidate.preflight_passed",
  "candidate.submitted",
  "employer.report_opened",
] as const;
