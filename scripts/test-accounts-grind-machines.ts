/**
 * Accounts grind — server-side lifecycle state machines.
 *
 * Import (queued → fetching → analyzing → ready/partial/failed/canceled),
 * Attempt (invited → accepted → preflight → in_progress →
 * submitted/withdrawn/expired), and Decision (undecided → advance/hold/decline
 * with versioned changes and notes).
 *
 * Proves: forbidden transitions fail, repeated requests are idempotent,
 * concurrent requests with a stale version cannot regress or double-apply a
 * state, and cross-tenant transitions are refused as authorization failures.
 * In-process with fakes.
 */

import {
  applyDecision,
  applyTransition,
  attemptMachine,
  decisionMachine,
  extendAttempt,
  importMachine,
  type AttemptRecord,
  type DecisionRecord,
  type VersionedRecord,
} from "../src/lib/permissions/lifecycle";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}
function section(title: string) {
  console.log(`\n${title}`);
}

function importRec(state: "queued" | "fetching" | "analyzing" | "ready" | "partial" | "failed" | "canceled" = "queued"): VersionedRecord<"queued" | "fetching" | "analyzing" | "ready" | "partial" | "failed" | "canceled"> {
  return { id: "imp-1", orgId: "org-a", state, version: 1 };
}

/* Import machine ------------------------------------------------------------------- */

section("import machine");

{
  // Happy path.
  const r = importRec();
  const t1 = applyTransition(importMachine, r, "fetching", "worker", "org-a", 1);
  ok("queued → fetching by worker", t1.ok && r.state === "fetching" && r.version === 2);
  const t2 = applyTransition(importMachine, r, "analyzing", "worker", "org-a", 2);
  ok("fetching → analyzing", t2.ok && r.state === "analyzing");
  const t3 = applyTransition(importMachine, r, "ready", "worker", "org-a", 3);
  ok("analyzing → ready", t3.ok && r.state === "ready" && r.version === 4);

  // Terminal: no leaving.
  const back = applyTransition(importMachine, r, "fetching", "worker", "org-a", 4);
  ok("ready is terminal", !back.ok && back.code === "terminal_state");

  // Skipping stages is illegal.
  const skip = applyTransition(importMachine, importRec(), "ready", "worker", "org-a", 1);
  ok("queued cannot jump to ready", !skip.ok && skip.code === "illegal_transition");

  // Partial and failed are first-class terminal outcomes.
  const p = importRec("analyzing");
  ok("analyzing → partial", applyTransition(importMachine, p, "partial", "worker", "org-a", 1).ok && p.state === "partial");
  const f = importRec("fetching");
  ok("fetching → failed", applyTransition(importMachine, f, "failed", "worker", "org-a", 1).ok);

  // Only the worker advances the pipeline; the candidate may cancel.
  const w = applyTransition(importMachine, importRec("fetching"), "analyzing", "candidate", "org-a", 1);
  ok("candidate cannot advance the pipeline", !w.ok && w.code === "actor_not_permitted");
  const c = importRec();
  ok("candidate can cancel a queued import", applyTransition(importMachine, c, "canceled", "candidate", "org-a", 1).ok);

  // Repeated request: idempotent no-op.
  const again = applyTransition(importMachine, r, "ready", "worker", "org-a", 4);
  ok("re-asserting ready is an idempotent no-op", again.ok && again.changed === false && r.version === 4);
}

/* Attempt machine -------------------------------------------------------------------- */

section("attempt machine");

{
  const mk = (state: AttemptRecord["state"] = "invited", version = 1): AttemptRecord => ({
    id: "att-1",
    orgId: "org-a",
    state,
    version,
    deadline: "2026-10-27T00:00:00.000Z",
    extensions: [],
  });

  const r = mk();
  ok("invited → accepted by candidate", applyTransition(attemptMachine, r, "accepted", "candidate", "org-a", 1).ok);
  ok("accepted → preflight", applyTransition(attemptMachine, r, "preflight", "candidate", "org-a", 2).ok);
  const skip = applyTransition(attemptMachine, mk("accepted"), "in_progress", "candidate", "org-a", 1);
  ok("cannot skip preflight", !skip.ok && skip.code === "illegal_transition");
  ok("preflight → in_progress", applyTransition(attemptMachine, r, "in_progress", "candidate", "org-a", 3).ok);
  ok("in_progress → submitted", applyTransition(attemptMachine, r, "submitted", "candidate", "org-a", 4).ok && r.version === 5);

  // Submitted is terminal: no regression, even by the worker.
  const regress = applyTransition(attemptMachine, r, "in_progress", "worker", "org-a", 5);
  ok("submitted cannot regress to in_progress", !regress.ok && regress.code === "terminal_state");

  // Withdrawn / expired are terminal too.
  const wd = mk("in_progress");
  ok("in_progress → withdrawn by employer", applyTransition(attemptMachine, wd, "withdrawn", "employer_owner", "org-a", 1).ok);
  ok("withdrawn is terminal", !applyTransition(attemptMachine, wd, "submitted", "candidate", "org-a", 2).ok);
  const ex = mk("invited");
  ok("invited → expired by worker", applyTransition(attemptMachine, ex, "expired", "worker", "org-a", 1).ok);
  ok("expired cannot be accepted", !applyTransition(attemptMachine, ex, "accepted", "candidate", "org-a", 2).ok);

  // Extensions are audited events, not state changes.
  const ext = mk("in_progress", 3);
  const e1 = extendAttempt(ext, "2026-11-27T00:00:00.000Z", "employer_owner", "emp-a", "org-a", "holiday cover");
  ok("extension granted", e1.ok && e1.changed === false);
  ok("extension does not change state", ext.state === "in_progress");
  ok("extension bumps the version", ext.version === 4);
  ok("extension is audited", ext.extensions.length === 1 && ext.extensions[0].reason === "holiday cover" && ext.extensions[0].actorUserId === "emp-a");
  ok(
    "candidate cannot extend their own attempt",
    !extendAttempt(mk("in_progress"), "2026-11-27T00:00:00.000Z", "candidate", "cand-a", "org-a", "please").ok
  );
  ok(
    "cannot extend a submitted attempt",
    extendAttempt(mk("submitted"), "2026-11-27T00:00:00.000Z", "employer_owner", "emp-a", "org-a", "late").code === "terminal_state"
  );
}

/* Decision machine --------------------------------------------------------------------- */

section("decision machine: versioned changes with notes");

{
  const mk = (): DecisionRecord => ({ id: "dec-1", orgId: "org-a", state: "undecided", version: 1, history: [] });

  const r = mk();
  const d1 = applyDecision(r, "advance", "employer_member", "emp-a", "org-a", 1, "Strong debugging signals.");
  ok("undecided → advance with note", d1.ok && r.state === "advance" && r.version === 2);
  ok("history records version 1→2", r.history.length === 1 && r.history[0].from === "undecided" && r.history[0].to === "advance" && r.history[0].version === 2);
  ok("history keeps the note and actor", r.history[0].note === "Strong debugging signals." && r.history[0].actorUserId === "emp-a");

  // Decisions can be revisited — as new versions, never silent rewrites.
  const d2 = applyDecision(r, "hold", "employer_owner", "emp-b", "org-a", 2, "Waiting on reference check.");
  ok("advance → hold is a new version", d2.ok && r.version === 3 && r.history.length === 2);
  ok("history chains versions", r.history[1].from === "advance" && r.history[1].to === "hold");

  // Notes are required.
  const noNote = applyDecision(mk(), "decline", "employer_member", "emp-a", "org-a", 1, "   ");
  ok("decision without a note is refused", !noNote.ok);

  // Candidates don't decide.
  const cand = applyDecision(mk(), "advance", "candidate", "cand-a", "org-a", 1, "I was great.");
  ok("candidate cannot record a decision", !cand.ok && cand.code === "actor_not_permitted");

  // Re-asserting the current decision is idempotent and writes no history.
  const same = applyDecision(r, "hold", "employer_owner", "emp-b", "org-a", 3, "Still waiting.");
  ok("re-asserting hold is a no-op", same.ok && same.changed === false && r.version === 3 && r.history.length === 2);
}

/* Concurrency ---------------------------------------------------------------------------- */

section("concurrent requests cannot regress or double-apply");

{
  // Two requests read version 3 of an in_progress attempt at the same time.
  const record: AttemptRecord = {
    id: "att-race",
    orgId: "org-a",
    state: "in_progress",
    version: 3,
    deadline: "2026-10-27T00:00:00.000Z",
    extensions: [],
  };
  const reqA = applyTransition(attemptMachine, record, "submitted", "candidate", "org-a", 3);
  ok("first concurrent request wins", reqA.ok && record.state === "submitted" && record.version === 4);

  // The second request holds a stale version: it fails instead of
  // regressing the record to withdrawn.
  const reqB = applyTransition(attemptMachine, record, "withdrawn", "employer_owner", "org-a", 3);
  ok("stale-version request fails with version_conflict", !reqB.ok && reqB.code === "version_conflict");
  ok("record did not regress", record.state === "submitted" && record.version === 4);

  // A retry with the fresh version, re-asserting the current state, is a
  // safe idempotent no-op — not an error, not a version bump.
  const retry = applyTransition(attemptMachine, record, "submitted", "candidate", "org-a", 4);
  ok("retry with fresh version is idempotent", retry.ok && retry.changed === false && record.version === 4);

  // Same story on the import machine: duplicate worker callbacks converge.
  const imp = importRec("analyzing");
  const w1 = applyTransition(importMachine, imp, "ready", "worker", "org-a", 1);
  const w2 = applyTransition(importMachine, imp, "ready", "worker", "org-a", 1);
  ok("duplicate worker callback: first applies", w1.ok && w1.changed === true);
  ok("duplicate worker callback: stale duplicate conflicts", !w2.ok && w2.code === "version_conflict");
  const w3 = applyTransition(importMachine, imp, "ready", "worker", "org-a", 2);
  ok("duplicate worker callback: fresh retry is a no-op", w3.ok && w3.changed === false && imp.version === 2);
}

/* Tenancy ---------------------------------------------------------------------------------- */

section("cross-tenant transitions are authorization failures");

{
  const record: AttemptRecord = {
    id: "att-tenant",
    orgId: "org-a",
    state: "in_progress",
    version: 1,
    deadline: "2026-10-27T00:00:00.000Z",
    extensions: [],
  };
  // A perfectly legal transition against another org's record is refused.
  const cross = applyTransition(attemptMachine, record, "submitted", "employer_owner", "org-b", 1);
  ok("cross-tenant transition refused", !cross.ok && cross.code === "cross_tenant");
  ok("record untouched", record.state === "in_progress" && record.version === 1);

  const noOrg = applyTransition(attemptMachine, record, "submitted", "employer_owner", null, 1);
  ok("actor with no org refused", !noOrg.ok && noOrg.code === "cross_tenant");

  // Decision machine honors tenancy too.
  const dec: DecisionRecord = { id: "dec-t", orgId: "org-a", state: "undecided", version: 1, history: [] };
  const decCross = applyDecision(dec, "advance", "employer_owner", "emp-x", "org-b", 1, "poach");
  ok("cross-tenant decision refused", !decCross.ok && decCross.code === "cross_tenant");
}

/* Machine shape ------------------------------------------------------------------------------ */

section("machine shape");

{
  for (const m of [importMachine, attemptMachine, decisionMachine] as const) {
    const states = new Set(m.states);
    const bad: string[] = [];
    for (const [from, edges] of Object.entries(m.transitions)) {
      if (!states.has(from as never)) bad.push(`key ${from}`);
      for (const e of edges) if (!states.has(e.to as never)) bad.push(`${from} -> ${e.to}`);
    }
    ok(`${m.name}: transitions reference declared states only`, bad.length === 0, bad.join(", "));
    const terminalWithEdges = (m.terminal as readonly string[]).filter(
      (s) => (m.transitions as Record<string, readonly unknown[]>)[s]?.length > 0
    );
    ok(`${m.name}: terminal states have no outgoing edges`, terminalWithEdges.length === 0);
  }
  ok("import starts queued", importMachine.initial === "queued");
  ok("attempt starts invited", attemptMachine.initial === "invited");
  ok("decision starts undecided", decisionMachine.initial === "undecided");
}

/* Summary ---------------------------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All lifecycle state-machine checks passed.");
