/**
 * AI-12 — Human QA gate for early reports.
 *
 * Consequential findings do not ship without a qualified reviewer looking at
 * them. This module is the gate's state machine plus workload tracking; the
 * actual verification is done by a human (MANUAL-OK). Unclear cases stay
 * pending — the gate has no "auto-approve on timeout".
 */

export type QaState = "pending" | "approved" | "flagged" | "escalated";

export interface QaDecision {
  reportId: string;
  state: QaState;
  reviewerId?: string;
  decidedAt?: string;
  notes?: string;
}

export interface QaGate {
  reportId: string;
  state: QaState;
  /** Consequential = any material defect/security finding or a `below` outcome. */
  consequential: boolean;
  openedAt: string;
  history: QaDecision[];
}

const TERMINAL: QaState[] = ["approved", "flagged", "escalated"];

/** Open a gate for a report. Consequential reports start pending. */
export function openGate(reportId: string, consequential: boolean): QaGate {
  return { reportId, state: "pending", consequential, openedAt: new Date().toISOString(), history: [] };
}

/** Record a human decision. Only a human (reviewerId) can move the gate. */
export function decide(gate: QaGate, reviewerId: string, state: QaState, notes?: string): QaGate {
  if (!reviewerId) throw new Error("AI-12: QA decisions require a reviewer id — no anonymous approvals.");
  if (TERMINAL.includes(gate.state)) {
    throw new Error(`AI-12: gate for ${gate.reportId} is already ${gate.state}; reopen explicitly instead.`);
  }
  if (state === "pending") throw new Error("AI-12: 'pending' is not a decision.");
  const decision: QaDecision = {
    reportId: gate.reportId,
    state,
    reviewerId,
    decidedAt: new Date().toISOString(),
    notes,
  };
  return { ...gate, state, history: [...gate.history, decision] };
}

/** A report may ship only when its gate is approved. */
export function mayShip(gate: QaGate): boolean {
  return gate.state === "approved";
}

/* ------------------------- workload tracking ------------------------- */

export interface QaWorkload {
  pending: number;
  approved: number;
  flagged: number;
  escalated: number;
  /** ms from gate-open to decision, per decided gate. */
  turnaroundMs: number[];
}

export function trackWorkload(gates: QaGate[]): QaWorkload {
  const w: QaWorkload = { pending: 0, approved: 0, flagged: 0, escalated: 0, turnaroundMs: [] };
  for (const g of gates) {
    w[g.state] += 1;
    const d = g.history[g.history.length - 1];
    if (d?.decidedAt) {
      const ms = Date.parse(d.decidedAt) - Date.parse(g.openedAt);
      if (Number.isFinite(ms) && ms >= 0) w.turnaroundMs.push(ms);
    }
  }
  return w;
}
