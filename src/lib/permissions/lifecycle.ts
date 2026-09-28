/**
 * Accounts chunk — server-side lifecycle state machines (checklist § "State
 * machines to make explicit").
 *
 * Three machines are enforced here, exactly as the checklist defines them:
 *
 * - Import:   queued → fetching → analyzing → ready / partial / failed / canceled
 * - Attempt:  invited → accepted → preflight → in_progress → submitted / withdrawn / expired
 *             (extensions are audited events, not state changes)
 * - Decision: undecided → advance / hold / decline, with versioned changes and notes
 *
 * Enforcement is server-side via `applyTransition`: the transition table is
 * the only legal way to move, re-asserting the current state is an idempotent
 * no-op (so retried requests are safe), and every record carries a version
 * counter for optimistic concurrency — a request holding a stale version
 * fails with `version_conflict` instead of regressing or double-applying.
 * Tenancy is checked alongside: a legal transition against another org's
 * record is refused as an authorization failure.
 *
 * The generic `transition()` engine is reused from the simulations v3 state
 * module (import only — that module is owned elsewhere and is not modified).
 */

import {
  assertSameTenant,
  transition,
  type Actor,
  type StateMachine,
  type TransitionErrorCode,
} from "../simulations/v3/state";

/* Import machine -------------------------------------------------------------- */

export type ImportState =
  | "queued"
  | "fetching"
  | "analyzing"
  | "ready"
  | "partial"
  | "failed"
  | "canceled";

const IMPORT_TERMINAL: readonly ImportState[] = ["ready", "partial", "failed", "canceled"];
const IMPORT_CANCELERS: readonly Actor[] = [
  "candidate",
  "employer_member",
  "employer_owner",
  "platform_admin",
];

export const importMachine: StateMachine<ImportState> = {
  name: "import",
  initial: "queued",
  states: ["queued", "fetching", "analyzing", "ready", "partial", "failed", "canceled"],
  terminal: IMPORT_TERMINAL,
  transitions: {
    queued: [
      { to: "fetching", actors: ["worker"] },
      { to: "canceled", actors: IMPORT_CANCELERS },
    ],
    fetching: [
      { to: "analyzing", actors: ["worker"] },
      { to: "failed", actors: ["worker"] },
      { to: "canceled", actors: IMPORT_CANCELERS },
    ],
    analyzing: [
      { to: "ready", actors: ["worker"] },
      { to: "partial", actors: ["worker"] },
      { to: "failed", actors: ["worker"] },
      { to: "canceled", actors: IMPORT_CANCELERS },
    ],
    ready: [],
    partial: [],
    failed: [],
    canceled: [],
  },
};

/* Attempt machine -------------------------------------------------------------- */

export type AttemptState =
  | "invited"
  | "accepted"
  | "preflight"
  | "in_progress"
  | "submitted"
  | "withdrawn"
  | "expired";

const ATTEMPT_TERMINAL: readonly AttemptState[] = ["submitted", "withdrawn", "expired"];
const ATTEMPT_EMPLOYER: readonly Actor[] = ["employer_member", "employer_owner", "platform_admin"];

export const attemptMachine: StateMachine<AttemptState> = {
  name: "attempt",
  initial: "invited",
  states: ["invited", "accepted", "preflight", "in_progress", "submitted", "withdrawn", "expired"],
  terminal: ATTEMPT_TERMINAL,
  transitions: {
    invited: [
      { to: "accepted", actors: ["candidate"] },
      { to: "withdrawn", actors: ["candidate", ...ATTEMPT_EMPLOYER] },
      { to: "expired", actors: ["worker", "platform_admin"] },
    ],
    accepted: [
      { to: "preflight", actors: ["candidate", "worker"] },
      { to: "withdrawn", actors: ["candidate", ...ATTEMPT_EMPLOYER] },
      { to: "expired", actors: ["worker", "platform_admin"] },
    ],
    preflight: [
      { to: "in_progress", actors: ["candidate", "worker"] },
      { to: "withdrawn", actors: ["candidate", ...ATTEMPT_EMPLOYER] },
      { to: "expired", actors: ["worker", "platform_admin"] },
    ],
    in_progress: [
      { to: "submitted", actors: ["candidate", "worker"] },
      { to: "withdrawn", actors: ["candidate", ...ATTEMPT_EMPLOYER] },
      { to: "expired", actors: ["worker", "platform_admin"] },
    ],
    submitted: [],
    withdrawn: [],
    expired: [],
  },
};

/* Decision machine -------------------------------------------------------------- */

export type DecisionState = "undecided" | "advance" | "hold" | "decline";

export const decisionMachine: StateMachine<DecisionState> = {
  name: "decision",
  initial: "undecided",
  states: ["undecided", "advance", "hold", "decline"],
  // No terminal states: decisions are versioned and may be revisited with a
  // new note, but every change is recorded in the history.
  terminal: [],
  transitions: {
    undecided: [
      { to: "advance", actors: ATTEMPT_EMPLOYER },
      { to: "hold", actors: ATTEMPT_EMPLOYER },
      { to: "decline", actors: ATTEMPT_EMPLOYER },
    ],
    advance: [
      { to: "hold", actors: ATTEMPT_EMPLOYER },
      { to: "decline", actors: ATTEMPT_EMPLOYER },
    ],
    hold: [
      { to: "advance", actors: ATTEMPT_EMPLOYER },
      { to: "decline", actors: ATTEMPT_EMPLOYER },
    ],
    decline: [
      { to: "advance", actors: ATTEMPT_EMPLOYER },
      { to: "hold", actors: ATTEMPT_EMPLOYER },
    ],
  },
};

/* Server-side application ------------------------------------------------------- */

export interface VersionedRecord<S extends string> {
  id: string;
  /** Tenant the record belongs to (org id). Compared against the actor's org. */
  orgId: string;
  state: S;
  version: number;
}

export type ApplyErrorCode = TransitionErrorCode | "version_conflict" | "cross_tenant";

export type ApplyResult<S extends string> =
  | { ok: true; state: S; version: number; changed: boolean }
  | { ok: false; code: ApplyErrorCode; message: string };

/**
 * The single server-side way to move a lifecycle record. Guards:
 * 1. tenancy — the actor's org must own the record;
 * 2. optimistic concurrency — `expectedVersion` must match the record;
 * 3. the machine's transition table (via `transition()`).
 *
 * A stale-version retry fails with `version_conflict`; re-asserting the
 * current state with a fresh version succeeds as an idempotent no-op.
 */
export function applyTransition<S extends string>(
  machine: StateMachine<S>,
  record: VersionedRecord<S>,
  to: S,
  actor: Actor,
  actorOrgId: string | null,
  expectedVersion: number
): ApplyResult<S> {
  const tenant = assertSameTenant(record.orgId, actorOrgId);
  if (tenant !== null && tenant.ok === false)
    return { ok: false, code: "cross_tenant", message: tenant.message };
  if (expectedVersion !== record.version) {
    return {
      ok: false,
      code: "version_conflict",
      message: `${machine.name}: expected version ${expectedVersion} but record is at ${record.version}; refetch and retry`,
    };
  }
  const r = transition(machine, record.state, to, actor);
  if (r.ok === false) return { ok: false, code: r.code, message: r.message };
  if (r.changed) record.version += 1;
  record.state = r.state;
  return { ok: true, state: r.state, version: record.version, changed: r.changed };
}

/* Attempt extensions: audited events, not state changes -------------------------- */

export interface AttemptExtension {
  at: string;
  actor: Actor;
  actorUserId: string;
  previousDeadline: string;
  newDeadline: string;
  reason: string;
}

export interface AttemptRecord extends VersionedRecord<AttemptState> {
  deadline: string;
  extensions: AttemptExtension[];
}

/**
 * Extend an attempt's deadline. The state does not change — the extension is
 * recorded as an audited event, exactly as the checklist requires.
 */
export function extendAttempt(
  record: AttemptRecord,
  newDeadline: string,
  actor: Actor,
  actorUserId: string,
  actorOrgId: string | null,
  reason: string
): ApplyResult<AttemptState> {
  const tenant = assertSameTenant(record.orgId, actorOrgId);
  if (tenant !== null && tenant.ok === false)
    return { ok: false, code: "cross_tenant", message: tenant.message };
  if (!ATTEMPT_EMPLOYER.includes(actor)) {
    return {
      ok: false,
      code: "actor_not_permitted",
      message: "only employer actors may extend an attempt",
    };
  }
  if (ATTEMPT_TERMINAL.includes(record.state)) {
    return {
      ok: false,
      code: "terminal_state",
      message: `cannot extend an attempt in terminal state "${record.state}"`,
    };
  }
  record.extensions.push({
    at: new Date().toISOString(),
    actor,
    actorUserId,
    previousDeadline: record.deadline,
    newDeadline,
    reason,
  });
  record.deadline = newDeadline;
  record.version += 1;
  return { ok: true, state: record.state, version: record.version, changed: false };
}

/* Versioned decisions with notes --------------------------------------------------- */

export interface DecisionChange {
  version: number;
  from: DecisionState;
  to: DecisionState;
  note: string;
  actorUserId: string;
  at: string;
}

export interface DecisionRecord extends VersionedRecord<DecisionState> {
  history: DecisionChange[];
}

/**
 * Record an employer decision. Every change requires a note and appends a
 * versioned history entry, so decision history is never silently rewritten.
 */
export function applyDecision(
  record: DecisionRecord,
  to: DecisionState,
  actor: Actor,
  actorUserId: string,
  actorOrgId: string | null,
  expectedVersion: number,
  note: string
): ApplyResult<DecisionState> {
  const trimmed = (note || "").trim();
  if (!trimmed) {
    return { ok: false, code: "actor_not_permitted", message: "a note is required with every decision" };
  }
  const r = applyTransition(decisionMachine, record, to, actor, actorOrgId, expectedVersion);
  if (r.ok === false) return r;
  if (r.changed) {
    const from = record.history.length > 0 ? record.history[record.history.length - 1].to : "undecided";
    record.history.push({
      version: record.version,
      from,
      to,
      note: trimmed,
      actorUserId,
      at: new Date().toISOString(),
    });
  }
  return r;
}
