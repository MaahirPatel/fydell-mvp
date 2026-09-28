/**
 * Employer chunk — audit log shared by invitation operations (EMP-07),
 * decisions (EMP-08) and report updates (REP-04/05).
 *
 * Every resend / revoke / extension / decision / report version is an
 * append-only event with actor + timestamp, so an employer can always answer
 * "who did what to this candidate's assessment, and when?"
 */

export type AuditAction =
  | "invitation_created"
  | "invitation_sent"
  | "invitation_resent"
  | "invitation_revoked"
  | "invitation_extended"
  | "invitation_accepted"
  | "invitation_state_changed"
  | "decision_recorded"
  | "decision_superseded"
  | "note_added"
  | "finding_flagged"
  | "report_version_published";

export interface AuditEvent {
  id: string;
  orgId: string;
  action: AuditAction;
  entityType: "invitation" | "attempt" | "report" | "decision";
  entityId: string;
  actorUserId: string;
  createdAt: string;
  detail: Record<string, unknown>;
}

export interface AuditStore {
  events: AuditEvent[];
}

export function createAuditMemoryStore(): AuditStore {
  return { events: [] };
}

let auditSeq = 0;

export function logEvent(
  store: AuditStore,
  input: {
    orgId: string;
    action: AuditAction;
    entityType: AuditEvent["entityType"];
    entityId: string;
    actorUserId: string;
    detail?: Record<string, unknown>;
  }
): AuditEvent {
  auditSeq += 1;
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${auditSeq}`,
    orgId: input.orgId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId,
    createdAt: new Date().toISOString(),
    detail: input.detail ?? {},
  };
  store.events.push(event);
  return event;
}

export function eventsFor(
  store: AuditStore,
  entityType: AuditEvent["entityType"],
  entityId: string
): AuditEvent[] {
  return store.events.filter((e) => e.entityType === entityType && e.entityId === entityId);
}
