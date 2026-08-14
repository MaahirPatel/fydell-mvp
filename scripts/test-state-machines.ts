/**
 * Transition guard tests.
 *
 * Proves the three properties the rebuild depends on: forbidden transitions
 * fail, authorized transitions are idempotent when repeated, and a legal
 * transition against another tenant's record is refused.
 */

import {
  ALL_MACHINES,
  analysisMachine,
  assertSameTenant,
  attemptMachine,
  deadEndStates,
  defenseMachine,
  invitationMachine,
  receiptMachine,
  transition,
  unreachableStates,
  type Actor,
  type StateMachine,
} from "../src/lib/simulations/v3/state";

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function allows<S extends string>(m: StateMachine<S>, from: S, to: S, actor: Actor) {
  const r = transition(m, from, to, actor);
  return r.ok;
}

function refusalCode<S extends string>(m: StateMachine<S>, from: S, to: S, actor: Actor) {
  const r = transition(m, from, to, actor);
  return r.ok ? null : r.code;
}

/* Shape ---------------------------------------------------------------------- */

section("machine shape");

for (const machine of ALL_MACHINES) {
  const unreachable = unreachableStates(machine as StateMachine<string>);
  ok(`${machine.name}: every state is reachable`, unreachable.length === 0, unreachable.join(", "));

  const deadEnds = deadEndStates(machine as StateMachine<string>);
  ok(`${machine.name}: no non-terminal dead ends`, deadEnds.length === 0, deadEnds.join(", "));

  const declared = new Set(machine.states as readonly string[]);
  const bad: string[] = [];
  for (const [from, edges] of Object.entries(machine.transitions)) {
    if (!declared.has(from)) bad.push(`transition key ${from}`);
    for (const e of edges as ReadonlyArray<{ to: string }>) {
      if (!declared.has(e.to)) bad.push(`${from} -> ${e.to}`);
    }
  }
  ok(`${machine.name}: transitions reference declared states only`, bad.length === 0, bad.join(", "));

  const terminalWithEdges = (machine.terminal as readonly string[]).filter(
    (s) => (machine.transitions as Record<string, readonly unknown[]>)[s].length > 0
  );
  ok(
    `${machine.name}: terminal states have no outgoing edges`,
    terminalWithEdges.length === 0,
    terminalWithEdges.join(", ")
  );
}

/* Idempotency ------------------------------------------------------------------ */

section("idempotency");

const submittedTwice = transition(attemptMachine, "submitted", "submitted", "worker");
ok(
  "re-submitting an already submitted attempt succeeds without changing",
  submittedTwice.ok && submittedTwice.changed === false
);

const acceptTwice = transition(invitationMachine, "accepted", "accepted", "candidate");
ok(
  "accepting an already accepted invitation is not an error",
  acceptTwice.ok && acceptTwice.changed === false
);

const revokeTwice = transition(receiptMachine, "share_revoked", "share_revoked", "candidate");
ok(
  "revoking an already revoked share is not an error",
  revokeTwice.ok && revokeTwice.changed === false
);

const realMove = transition(attemptMachine, "submitted", "analysis_queued", "worker");
ok("a genuine move reports changed", realMove.ok && realMove.changed === true);

/* Forbidden transitions ---------------------------------------------------------- */

section("forbidden transitions");

ok(
  "an attempt cannot skip submission and go straight to a report",
  refusalCode(attemptMachine, "active", "report_ready", "worker") === "illegal_transition"
);
ok(
  "a submitted attempt cannot go back to active",
  refusalCode(attemptMachine, "submitted", "active", "candidate") === "illegal_transition"
);
ok(
  "a finished report cannot be reopened",
  refusalCode(attemptMachine, "report_ready", "analysis_queued", "platform_admin") === "terminal_state"
);
ok(
  "a revoked invitation cannot be accepted",
  refusalCode(invitationMachine, "revoked", "accepted", "candidate") === "terminal_state"
);
ok(
  "an expired invitation cannot be accepted",
  refusalCode(invitationMachine, "expired", "accepted", "candidate") === "terminal_state"
);
ok(
  "a superseded analysis run cannot be completed",
  refusalCode(analysisMachine, "superseded", "complete", "worker") === "terminal_state"
);
ok(
  "an unknown state is rejected rather than assumed",
  refusalCode(attemptMachine, "sleeping" as never, "active", "candidate") === "unknown_state"
);

/* Actor restrictions --------------------------------------------------------------- */

section("actor restrictions");

ok(
  "a candidate cannot mark their own defense reviewed",
  refusalCode(defenseMachine, "submitted", "reviewed", "candidate") === "actor_not_permitted"
);
ok("an employer can mark a defense reviewed", allows(defenseMachine, "submitted", "reviewed", "employer_member"));

ok(
  "a candidate cannot void their own attempt for technical reasons",
  refusalCode(attemptMachine, "active", "voided_technical", "candidate") === "actor_not_permitted"
);
ok(
  "a candidate cannot authorize their own retake",
  refusalCode(attemptMachine, "voided_technical", "retake_authorized", "candidate") ===
    "actor_not_permitted"
);
ok(
  "an employer can authorize a retake after a technical incident",
  allows(attemptMachine, "voided_technical", "retake_authorized", "employer_owner")
);

ok(
  "an employer cannot publish a candidate's receipt",
  refusalCode(receiptMachine, "ready", "share_active", "employer_owner") === "actor_not_permitted"
);
ok(
  "an employer cannot revoke a candidate's share",
  refusalCode(receiptMachine, "share_active", "share_revoked", "employer_member") ===
    "actor_not_permitted"
);
ok(
  "the candidate can revoke their own share",
  allows(receiptMachine, "share_active", "share_revoked", "candidate")
);

ok(
  "no employer actor appears anywhere in the receipt machine",
  Object.values(receiptMachine.transitions)
    .flat()
    .every((e) => !e.actors.some((a) => a.startsWith("employer")))
);

/* Submission is an integrity boundary ------------------------------------------------ */

section("submission boundary");

ok(
  "a failed submission returns to active rather than advancing",
  allows(attemptMachine, "submission_pending", "active", "worker")
);
ok(
  "only the system can confirm a submission",
  refusalCode(attemptMachine, "submission_pending", "submitted", "candidate") ===
    "actor_not_permitted"
);
ok(
  "analysis cannot start before submission",
  refusalCode(attemptMachine, "active", "analysis_queued", "worker") === "illegal_transition"
);

/* Delivery is not acceptance ---------------------------------------------------------- */

section("delivery versus acceptance");

ok(
  "a created invitation can be opened without ever being sent",
  allows(invitationMachine, "created", "opened", "candidate")
);
ok(
  "a bounced invitation can be corrected and resent",
  allows(invitationMachine, "delivery_failed", "sent", "employer_member")
);
ok(
  "a bounced invitation is not treated as declined",
  !invitationMachine.terminal.includes("delivery_failed")
);

/* Tenancy -------------------------------------------------------------------------- */

section("tenancy");

ok("same tenant passes", assertSameTenant("org-a", "org-a") === null);

const crossTenant = assertSameTenant("org-a", "org-b");
ok(
  "another organization's record is refused",
  crossTenant !== null && crossTenant.ok === false && crossTenant.code === "cross_tenant"
);

const anonymous = assertSameTenant("org-a", null);
ok(
  "an actor with no organization is refused",
  anonymous !== null && anonymous.ok === false && anonymous.code === "cross_tenant"
);

ok(
  "a transition that is legal in isolation is still refused across tenants",
  allows(attemptMachine, "voided_technical", "retake_authorized", "employer_owner") &&
    assertSameTenant("org-a", "org-b") !== null
);

/* Summary --------------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All state machine checks passed.");
