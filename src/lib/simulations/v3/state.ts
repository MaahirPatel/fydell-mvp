/**
 * Domain state machines.
 *
 * Today these states are free-form strings compared inline across routes and
 * components, there are no transition guards, and the set of legal states is
 * whatever a given comparison happens to check for. That is how a session ends
 * up submitted twice, or analysed while already analysing.
 *
 * Each machine below declares its states, which transitions exist, and who is
 * allowed to make them. `transition()` is the only way to move, it is
 * idempotent for a move that already happened, and it refuses anything not
 * declared. Tenancy is checked separately by `assertSameTenant`, because a
 * legal transition requested against someone else's record is an authorization
 * failure and should read as one.
 */

export type Actor =
  | "candidate"
  | "employer_member"
  | "employer_owner"
  | "platform_admin"
  | "worker";

/** Anyone acting on behalf of the employer. */
const EMPLOYER: readonly Actor[] = ["employer_member", "employer_owner", "platform_admin"];
/** Background jobs and server-side orchestration. */
const SYSTEM: readonly Actor[] = ["worker", "platform_admin"];

export interface Edge<S extends string> {
  to: S;
  actors: readonly Actor[];
}

export interface StateMachine<S extends string> {
  name: string;
  initial: S;
  states: readonly S[];
  /** No transition leaves these. */
  terminal: readonly S[];
  transitions: Readonly<Record<S, readonly Edge<S>[]>>;
}

export type TransitionResult<S extends string> =
  | { ok: true; state: S; changed: boolean }
  | { ok: false; code: TransitionErrorCode; message: string };

export type TransitionErrorCode =
  | "unknown_state"
  | "terminal_state"
  | "illegal_transition"
  | "actor_not_permitted"
  | "cross_tenant";

/**
 * The only sanctioned way to change one of these states.
 *
 * Re-requesting the state a record is already in succeeds with
 * `changed: false`, so a retried write or a duplicate click is not an error.
 * Everything undeclared fails with a stable code.
 */
export function transition<S extends string>(
  machine: StateMachine<S>,
  from: S,
  to: S,
  actor: Actor
): TransitionResult<S> {
  if (!machine.states.includes(from)) {
    return { ok: false, code: "unknown_state", message: `${machine.name}: unknown state "${from}"` };
  }
  if (!machine.states.includes(to)) {
    return { ok: false, code: "unknown_state", message: `${machine.name}: unknown state "${to}"` };
  }

  // Idempotent before the terminal check: re-asserting a terminal state a
  // record already holds is a retry, not an attempt to leave it.
  if (from === to) return { ok: true, state: to, changed: false };

  if (machine.terminal.includes(from)) {
    return {
      ok: false,
      code: "terminal_state",
      message: `${machine.name}: "${from}" is terminal and cannot move to "${to}"`,
    };
  }

  const edge = machine.transitions[from].find((e) => e.to === to);
  if (!edge) {
    return {
      ok: false,
      code: "illegal_transition",
      message: `${machine.name}: "${from}" cannot move to "${to}"`,
    };
  }
  if (!edge.actors.includes(actor)) {
    return {
      ok: false,
      code: "actor_not_permitted",
      message: `${machine.name}: ${actor} may not move "${from}" to "${to}"`,
    };
  }

  return { ok: true, state: to, changed: true };
}

/**
 * A transition can be perfectly legal and still be someone reaching into
 * another tenant's record. Checked separately so the failure is not reported
 * as a state problem.
 */
export function assertSameTenant(
  recordOrganizationId: string,
  actorOrganizationId: string | null
): TransitionResult<never> | null {
  if (actorOrganizationId && recordOrganizationId === actorOrganizationId) return null;
  return {
    ok: false,
    code: "cross_tenant",
    message: "record belongs to another organization",
  };
}

/* Invitation ---------------------------------------------------------------- */

/**
 * Delivery and acceptance are separate concerns. A link created without an
 * email being sent sits in `created`, never `sent`, so the employer is not
 * told a message went out when none did, and `delivery_failed` records a
 * bounce without implying the candidate declined.
 */
export type InvitationState =
  | "draft"
  | "created"
  | "sent"
  | "opened"
  | "accepted"
  | "revoked"
  | "expired"
  | "delivery_failed";

export const invitationMachine: StateMachine<InvitationState> = {
  name: "invitation",
  initial: "draft",
  states: ["draft", "created", "sent", "opened", "accepted", "revoked", "expired", "delivery_failed"],
  terminal: ["accepted", "revoked", "expired"],
  transitions: {
    draft: [
      { to: "created", actors: EMPLOYER },
      { to: "revoked", actors: EMPLOYER },
    ],
    created: [
      { to: "sent", actors: [...EMPLOYER, ...SYSTEM] },
      { to: "opened", actors: ["candidate"] },
      { to: "delivery_failed", actors: SYSTEM },
      { to: "revoked", actors: EMPLOYER },
      { to: "expired", actors: SYSTEM },
    ],
    sent: [
      { to: "opened", actors: ["candidate"] },
      { to: "delivery_failed", actors: SYSTEM },
      { to: "revoked", actors: EMPLOYER },
      { to: "expired", actors: SYSTEM },
    ],
    opened: [
      { to: "accepted", actors: ["candidate"] },
      { to: "revoked", actors: EMPLOYER },
      { to: "expired", actors: SYSTEM },
    ],
    // A bounce is recoverable: correct the address and send again.
    delivery_failed: [
      { to: "sent", actors: [...EMPLOYER, ...SYSTEM] },
      { to: "revoked", actors: EMPLOYER },
      { to: "expired", actors: SYSTEM },
    ],
    accepted: [],
    revoked: [],
    expired: [],
  },
};

/* Attempt -------------------------------------------------------------------- */

/**
 * There is deliberately no paused state. A timer that can be paused by
 * refreshing is not a timer, and server time is the authority.
 *
 * `voided_technical` exists so a platform failure can be recorded without
 * being read as candidate inability, and `retake_authorized` is the only route
 * out of it.
 */
export type AttemptState =
  | "ready"
  | "preflight_required"
  | "active"
  | "sync_warning"
  | "submission_pending"
  | "submitted"
  | "analysis_queued"
  | "analysis_running"
  | "human_review_required"
  | "defense_required"
  | "report_ready"
  | "voided_technical"
  | "retake_authorized";

export const attemptMachine: StateMachine<AttemptState> = {
  name: "attempt",
  initial: "ready",
  states: [
    "ready",
    "preflight_required",
    "active",
    "sync_warning",
    "submission_pending",
    "submitted",
    "analysis_queued",
    "analysis_running",
    "human_review_required",
    "defense_required",
    "report_ready",
    "voided_technical",
    "retake_authorized",
  ],
  terminal: ["report_ready", "retake_authorized"],
  transitions: {
    ready: [
      { to: "preflight_required", actors: ["candidate", ...SYSTEM] },
      { to: "active", actors: ["candidate"] },
      { to: "voided_technical", actors: SYSTEM },
    ],
    preflight_required: [
      { to: "active", actors: ["candidate"] },
      { to: "voided_technical", actors: SYSTEM },
    ],
    active: [
      { to: "sync_warning", actors: SYSTEM },
      { to: "submission_pending", actors: ["candidate"] },
      { to: "voided_technical", actors: SYSTEM },
    ],
    // Degraded but still working. Recovers to active or proceeds to submit.
    sync_warning: [
      { to: "active", actors: SYSTEM },
      { to: "submission_pending", actors: ["candidate"] },
      { to: "voided_technical", actors: SYSTEM },
    ],
    /*
     * The integrity boundary. Submission only becomes `submitted` once the
     * final state is durably persisted; a failure returns to active rather
     * than advancing, so the candidate is never shown success over a failed
     * required write.
     */
    submission_pending: [
      { to: "submitted", actors: SYSTEM },
      { to: "active", actors: SYSTEM },
      { to: "voided_technical", actors: SYSTEM },
    ],
    submitted: [{ to: "analysis_queued", actors: SYSTEM }],
    analysis_queued: [
      { to: "analysis_running", actors: SYSTEM },
      { to: "voided_technical", actors: SYSTEM },
    ],
    analysis_running: [
      { to: "human_review_required", actors: SYSTEM },
      { to: "defense_required", actors: SYSTEM },
      { to: "report_ready", actors: SYSTEM },
      // Retryable failure returns to the queue rather than dead-ending.
      { to: "analysis_queued", actors: SYSTEM },
      { to: "voided_technical", actors: SYSTEM },
    ],
    human_review_required: [
      { to: "defense_required", actors: EMPLOYER },
      { to: "report_ready", actors: EMPLOYER },
      { to: "analysis_queued", actors: [...EMPLOYER, ...SYSTEM] },
    ],
    defense_required: [
      { to: "human_review_required", actors: EMPLOYER },
      { to: "report_ready", actors: EMPLOYER },
    ],
    voided_technical: [{ to: "retake_authorized", actors: EMPLOYER }],
    report_ready: [],
    retake_authorized: [],
  },
};

/* Analysis -------------------------------------------------------------------- */

export type AnalysisState =
  | "queued"
  | "running"
  | "review_required"
  | "complete"
  | "failed_retryable"
  | "failed_terminal"
  | "superseded";

export const analysisMachine: StateMachine<AnalysisState> = {
  name: "analysis",
  initial: "queued",
  states: [
    "queued",
    "running",
    "review_required",
    "complete",
    "failed_retryable",
    "failed_terminal",
    "superseded",
  ],
  // A completed run is never edited. Re-analysis creates a new run and marks
  // this one superseded, which is a transition out of complete, so complete is
  // not terminal.
  terminal: ["failed_terminal", "superseded"],
  transitions: {
    queued: [
      { to: "running", actors: SYSTEM },
      { to: "failed_terminal", actors: SYSTEM },
      { to: "superseded", actors: SYSTEM },
    ],
    running: [
      { to: "review_required", actors: SYSTEM },
      { to: "complete", actors: SYSTEM },
      { to: "failed_retryable", actors: SYSTEM },
      { to: "failed_terminal", actors: SYSTEM },
    ],
    review_required: [
      { to: "complete", actors: EMPLOYER },
      { to: "superseded", actors: SYSTEM },
    ],
    complete: [{ to: "superseded", actors: SYSTEM }],
    failed_retryable: [
      { to: "queued", actors: [...EMPLOYER, ...SYSTEM] },
      { to: "failed_terminal", actors: SYSTEM },
    ],
    failed_terminal: [],
    superseded: [],
  },
};

/* Oral defense ----------------------------------------------------------------- */

export type DefenseState =
  | "not_required"
  | "pending"
  | "scheduled"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "unavailable";

export const defenseMachine: StateMachine<DefenseState> = {
  name: "defense",
  initial: "not_required",
  states: [
    "not_required",
    "pending",
    "scheduled",
    "in_progress",
    "submitted",
    "reviewed",
    "unavailable",
  ],
  terminal: ["reviewed"],
  transitions: {
    not_required: [{ to: "pending", actors: SYSTEM }],
    pending: [
      { to: "scheduled", actors: EMPLOYER },
      { to: "in_progress", actors: ["candidate", ...EMPLOYER] },
      { to: "unavailable", actors: [...EMPLOYER, ...SYSTEM] },
    ],
    scheduled: [
      { to: "in_progress", actors: ["candidate", ...EMPLOYER] },
      { to: "unavailable", actors: [...EMPLOYER, ...SYSTEM] },
    ],
    in_progress: [
      { to: "submitted", actors: ["candidate", ...EMPLOYER] },
      { to: "unavailable", actors: [...EMPLOYER, ...SYSTEM] },
    ],
    // Only the employer reviews. A candidate cannot mark their own defense
    // reviewed.
    submitted: [{ to: "reviewed", actors: EMPLOYER }],
    unavailable: [{ to: "pending", actors: EMPLOYER }],
    reviewed: [],
  },
};

/* Work Receipt ------------------------------------------------------------------ */

/**
 * A receipt is candidate-controlled throughout. No employer actor appears in
 * any transition here, which is the schema-level statement that an employer
 * cannot publish or revoke a candidate's record.
 */
export type ReceiptState =
  | "candidate_review_required"
  | "ready"
  | "share_active"
  | "share_expired"
  | "share_revoked"
  | "corrected";

export const receiptMachine: StateMachine<ReceiptState> = {
  name: "receipt",
  initial: "candidate_review_required",
  states: [
    "candidate_review_required",
    "ready",
    "share_active",
    "share_expired",
    "share_revoked",
    "corrected",
  ],
  terminal: ["corrected"],
  transitions: {
    candidate_review_required: [
      { to: "ready", actors: ["candidate"] },
      { to: "corrected", actors: SYSTEM },
    ],
    ready: [
      { to: "share_active", actors: ["candidate"] },
      { to: "corrected", actors: SYSTEM },
    ],
    share_active: [
      { to: "share_revoked", actors: ["candidate"] },
      { to: "share_expired", actors: SYSTEM },
      { to: "corrected", actors: SYSTEM },
    ],
    // A new share starts from ready. Neither expiry nor revocation can be
    // undone in place, so a withdrawn link stays withdrawn.
    share_expired: [
      { to: "ready", actors: ["candidate"] },
      { to: "corrected", actors: SYSTEM },
    ],
    share_revoked: [
      { to: "ready", actors: ["candidate"] },
      { to: "corrected", actors: SYSTEM },
    ],
    corrected: [],
  },
};

/* Introspection ------------------------------------------------------------------ */

export const ALL_MACHINES = [
  invitationMachine,
  attemptMachine,
  analysisMachine,
  defenseMachine,
  receiptMachine,
] as const;

/** States that cannot be reached from the initial state. */
export function unreachableStates<S extends string>(machine: StateMachine<S>): S[] {
  const seen = new Set<S>([machine.initial]);
  const queue: S[] = [machine.initial];
  while (queue.length) {
    const current = queue.shift() as S;
    for (const edge of machine.transitions[current]) {
      if (!seen.has(edge.to)) {
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
  }
  return machine.states.filter((s) => !seen.has(s));
}

/** Non-terminal states with no way out. */
export function deadEndStates<S extends string>(machine: StateMachine<S>): S[] {
  return machine.states.filter(
    (s) => !machine.terminal.includes(s) && machine.transitions[s].length === 0
  );
}
