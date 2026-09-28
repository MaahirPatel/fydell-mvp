/**
 * Employer chunk — EMP-08: keep human decisions explicit.
 *
 * Advance / Hold / Decline are recorded with actor + timestamp in an
 * append-only history. A newer decision supersedes (never deletes) earlier
 * ones, so the full decision trail survives.
 *
 * Hard guarantee: recording a decision NEVER sends a message to the
 * candidate. This module has no mailer, no outbox, no notification hook —
 * there is literally no code path from `recordDecision` to a candidate
 * message. Any candidate communication is a separate, deliberate employer
 * action with its own approved copy (not implemented here).
 */

import { logEvent, eventsFor, createAuditMemoryStore, type AuditStore } from "./audit";

export type HiringDecision = "advance" | "hold" | "decline";

export const DECISION_LABEL: Record<HiringDecision, string> = {
  advance: "Advance",
  hold: "Hold",
  decline: "Decline",
};

export interface DecisionRecord {
  id: string;
  orgId: string;
  sessionId: string;
  decision: HiringDecision;
  decidedBy: string;
  decidedAt: string;
  rationale: string | null;
  /** True when a newer decision superseded this one. */
  superseded: boolean;
  /** Present only when this record superseded an earlier one. */
  supersedesId: string | null;
}

export interface DecisionStore {
  decisions: DecisionRecord[];
}

export function createDecisionMemoryStore(): DecisionStore {
  return { decisions: [] };
}

export type DecisionError = "invalid_decision" | "missing_actor";

export type DecisionResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: DecisionError; message: string };

let decisionSeq = 0;

/**
 * Record a hiring decision. Appends to history; supersedes (never deletes)
 * any prior decision for the same session. Takes no mailer and sends
 * nothing — by construction it cannot notify the candidate.
 */
export function recordDecision(
  store: DecisionStore,
  audit: AuditStore,
  input: {
    orgId: string;
    sessionId: string;
    decision: HiringDecision;
    decidedBy: string;
    rationale?: string | null;
  }
): DecisionResult<DecisionRecord> {
  if (!["advance", "hold", "decline"].includes(input.decision)) {
    return { ok: false, code: "invalid_decision", message: `unknown decision ${input.decision}` };
  }
  if (!input.decidedBy) {
    return { ok: false, code: "missing_actor", message: "a decision requires an identified actor" };
  }

  decisionSeq += 1;
  const previous = store.decisions
    .filter((d) => d.sessionId === input.sessionId && !d.superseded)
    .sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1))[0];

  const record: DecisionRecord = {
    id: `dec-${Date.now()}-${decisionSeq}`,
    orgId: input.orgId,
    sessionId: input.sessionId,
    decision: input.decision,
    decidedBy: input.decidedBy,
    decidedAt: new Date().toISOString(),
    rationale: input.rationale?.slice(0, 2000) ?? null,
    superseded: false,
    supersedesId: previous?.id ?? null,
  };
  if (previous) previous.superseded = true;
  store.decisions.push(record);

  logEvent(audit, {
    orgId: input.orgId,
    action: previous ? "decision_superseded" : "decision_recorded",
    entityType: "decision",
    entityId: record.id,
    actorUserId: input.decidedBy,
    detail: {
      sessionId: input.sessionId,
      decision: input.decision,
      supersedesId: record.supersedesId,
    },
  });
  return { ok: true, value: record };
}

/** Current (non-superseded) decision for a session, or null. */
export function currentDecision(store: DecisionStore, sessionId: string): DecisionRecord | null {
  const current = store.decisions
    .filter((d) => d.sessionId === sessionId && !d.superseded)
    .sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1))[0];
  return current ?? null;
}

/** Full durable history for a session, oldest first. */
export function decisionHistory(store: DecisionStore, sessionId: string): DecisionRecord[] {
  return store.decisions
    .filter((d) => d.sessionId === sessionId)
    .sort((a, b) => (a.decidedAt < b.decidedAt ? -1 : 1));
}

export { createAuditMemoryStore, eventsFor };
