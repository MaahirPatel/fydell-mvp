/**
 * Canonical backend state → visible label → permitted action.
 * Do not invent a second invitation lifecycle in the UI.
 */

export const INVITATION_LABEL = {
  created: "Invitation created",
  queued: "Email queued",
  sent: "Email sent",
  delivered: "Email delivered",
  not_configured: "Email not configured",
  failed: "Email failed",
  opened: "Invitation opened",
  accepted: "Invitation accepted",
  started: "In progress",
  completed: "Completed",
  expired: "Invitation expired",
  revoked: "Invitation revoked",
} as const;

export const EMAIL_DELIVERY_LABEL = {
  not_configured: "Email not configured — copyable link available",
  queued: "Email queued",
  sent: "Email sent",
  delivered: "Email delivered",
  failed: "Email failed — copyable link available",
} as const;

export const ATTEMPT_LABEL = {
  accepted: "Not started",
  active: "In progress",
  submitted: "Submitted",
  analyzing: "Scoring",
  analyzed: "Report ready",
  analysis_failed: "Analysis failed",
  report_ready: "Report ready",
} as const;

export const REPORT_LABEL = {
  processing: "Processing",
  review_required: "Needs review",
  ready: "Ready",
  failed: "Failed",
} as const;

/** A copyable link is never shown as delivered. */
export function invitationTruth(input: {
  status: string;
  emailDelivery?: string | null;
}): { label: string; emailed: boolean; copyable: boolean } {
  if (input.status === "revoked") {
    return { label: INVITATION_LABEL.revoked, emailed: false, copyable: false };
  }
  if (input.status === "expired") {
    return { label: INVITATION_LABEL.expired, emailed: false, copyable: false };
  }
  if (input.status === "accepted" || input.status === "started" || input.status === "completed") {
    return {
      label: INVITATION_LABEL[input.status as "accepted" | "started" | "completed"],
      emailed: input.emailDelivery === "sent" || input.emailDelivery === "delivered",
      copyable: false,
    };
  }
  if (input.status === "opened") {
    return {
      label: INVITATION_LABEL.opened,
      emailed: input.emailDelivery === "sent" || input.emailDelivery === "delivered",
      copyable: true,
    };
  }
  const delivery = input.emailDelivery ?? "not_configured";
  if (delivery === "failed") {
    return { label: EMAIL_DELIVERY_LABEL.failed, emailed: false, copyable: true };
  }
  if (delivery === "not_configured") {
    return { label: EMAIL_DELIVERY_LABEL.not_configured, emailed: false, copyable: true };
  }
  if (delivery === "delivered") {
    return { label: EMAIL_DELIVERY_LABEL.delivered, emailed: true, copyable: true };
  }
  if (delivery === "sent") {
    return { label: EMAIL_DELIVERY_LABEL.sent, emailed: true, copyable: true };
  }
  return { label: INVITATION_LABEL.created, emailed: false, copyable: true };
}
