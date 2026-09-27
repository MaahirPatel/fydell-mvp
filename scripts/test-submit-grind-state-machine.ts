/**
 * Snapshot-transfer state machine tests (checklist: "State machines to make explicit").
 *
 * Covers the pure transition rules in src/lib/submissions/transfer.ts, which
 * mirror the server-side `submit_transfer_transition` function
 * (supabase/migrations/030_submit_transfer_state.sql):
 * - every legal forward transition succeeds,
 * - `accepted` is terminal — nothing leaves it,
 * - stale `from` (concurrent / repeated requests) is refused without regressing,
 * - same-state repeats are idempotent,
 * - `rejected` returns to `local_draft` only; `failed` allows retry.
 *
 * The SQL function itself is reviewed but not executed here (no Postgres in
 * this environment); the fake CAS store below implements the same
 * compare-and-set semantics the SQL enforces with SELECT ... FOR UPDATE.
 *
 * Run via `npx tsx scripts/test-submit-grind-state-machine.ts`
 */
import {
  FINALIZE_ENTRY_STATES,
  TRANSFER_TRANSITIONS,
  applyTransferTransition,
  isLegalTransferTransition,
  type TransferRecord,
  type TransferState,
} from "../src/lib/submissions/transfer";

let failures = 0;
let count = 0;

function check(label: string, cond: boolean, detail = ""): void {
  count += 1;
  if (!cond) {
    failures += 1;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// --- every declared forward transition is legal --------------------------------
for (const [from, tos] of Object.entries(TRANSFER_TRANSITIONS) as Array<[TransferState, readonly TransferState[]]>) {
  for (const to of tos) {
    check(`legal: ${from} -> ${to}`, isLegalTransferTransition(from, to));
  }
}

// --- same-state repeats are idempotent ------------------------------------------
for (const s of Object.keys(TRANSFER_TRANSITIONS) as TransferState[]) {
  check(`idempotent repeat: ${s} -> ${s}`, isLegalTransferTransition(s, s));
}

// --- accepted is terminal --------------------------------------------------------
for (const to of Object.keys(TRANSFER_TRANSITIONS) as TransferState[]) {
  if (to === "accepted") continue;
  check(`terminal: accepted -/-> ${to}`, !isLegalTransferTransition("accepted", to));
}

// --- spot-check illegal transitions -----------------------------------------------
const illegal: Array<[TransferState, TransferState]> = [
  ["local_draft", "accepted"],
  ["local_draft", "server_saved"],
  ["local_draft", "submitting"],
  ["local_draft", "rejected"],
  ["syncing", "accepted"],
  ["syncing", "submitting"],
  ["server_saved", "syncing"],
  ["server_saved", "accepted"],
  ["submitting", "local_draft"],
  ["submitting", "syncing"],
  ["submitting", "server_saved"],
  ["rejected", "submitting"],
  ["rejected", "accepted"],
  ["rejected", "syncing"],
  ["failed", "accepted"],
  ["failed", "rejected"],
];
for (const [from, to] of illegal) {
  check(`illegal: ${from} -/-> ${to}`, !isLegalTransferTransition(from, to));
}

// --- finalize entry states ----------------------------------------------------------
check(
  "finalize entry states are local_draft/server_saved/failed",
  JSON.stringify([...FINALIZE_ENTRY_STATES].sort()) ===
    JSON.stringify(["failed", "local_draft", "server_saved"])
);
check("syncing is not a finalize entry state", !(FINALIZE_ENTRY_STATES as readonly string[]).includes("syncing"));

// --- applyTransferTransition: CAS semantics -------------------------------------------
{
  // First touch creates local_draft only for callers expecting local_draft.
  const created = applyTransferTransition(null, "local_draft", "syncing");
  check("first touch local_draft->syncing creates record", created?.state === "syncing");
  check("first touch with wrong from is refused", applyTransferTransition(null, "syncing", "server_saved") === null);

  // Stale from is refused: record moved on without the caller.
  const stale = applyTransferTransition({ state: "syncing" }, "local_draft", "syncing");
  check("stale from is refused", stale === null);

  // Illegal transition refused even with correct from.
  const bad = applyTransferTransition({ state: "local_draft" }, "local_draft", "accepted");
  check("illegal transition refused", bad === null);

  // Detail is recorded on accepted.
  const acc = applyTransferTransition(
    { state: "submitting", operationId: "op-1" },
    "submitting",
    "accepted",
    { receiptHash: "rh", submissionId: "sub-1", operationId: "op-1" }
  );
  check("accepted records receipt+submission", acc?.receiptHash === "rh" && acc?.submissionId === "sub-1");
  check("accepted clears failure fields", acc?.failureCode == null && acc?.failureMessage == null);

  // Failure detail recorded on rejected/failed.
  const rej = applyTransferTransition({ state: "submitting" }, "submitting", "rejected", {
    failureCode: "HASH_MISMATCH",
    failureMessage: "hash mismatch",
  });
  check("rejected records failure code", rej?.failureCode === "HASH_MISMATCH");

  // Recovery: rejected -> local_draft.
  const back = applyTransferTransition(rej, "rejected", "local_draft");
  check("rejected -> local_draft allowed", back?.state === "local_draft");

  // No regression: accepted cannot go anywhere.
  const reg = applyTransferTransition(acc, "accepted", "syncing");
  check("accepted cannot regress", reg === null);
  const reg2 = applyTransferTransition(acc, "accepted", "local_draft");
  check("accepted cannot return to draft", reg2 === null);

  // Idempotent same-state: accepted -> accepted keeps receipt.
  const same = applyTransferTransition(acc, "accepted", "accepted");
  check("accepted -> accepted idempotent", same?.state === "accepted" && same?.receiptHash === "rh");

  // Input is never mutated.
  const input: TransferRecord = { state: "syncing" };
  applyTransferTransition(input, "syncing", "server_saved", { receiptHash: "x" });
  check("applyTransferTransition does not mutate input", input.state === "syncing" && input.receiptHash === undefined);
}

// --- concurrent requests cannot regress states (fake CAS store) -------------------------
{
  // Two actors read local_draft; only the first CAS wins. Mirrors the SQL
  // SELECT ... FOR UPDATE serialization.
  let store: TransferRecord | null = null;
  const cas = (from: TransferState, to: TransferState): boolean => {
    const next = applyTransferTransition(store, from, to);
    if (!next) return false;
    store = next;
    return true;
  };

  const aWins = cas("local_draft", "syncing");
  const bLoses = cas("local_draft", "syncing"); // B's read was stale
  check("concurrent CAS: first wins", aWins === true);
  check("concurrent CAS: stale loser refused", bLoses === false);
  check("state advanced exactly once", store?.state === "syncing");

  // Repeated finalize attempts after acceptance all see accepted.
  store = { state: "accepted", receiptHash: "rh-final", submissionId: "s-1" };
  const r1 = cas("accepted", "accepted");
  const r2 = cas("submitting", "accepted"); // racing loser with stale from
  check("accepted repeat is ok", r1 === true && store?.receiptHash === "rh-final");
  check("racing loser cannot re-enter submitting", r2 === false);
}

console.log(`\n${count - failures}/${count} passed`);
process.exit(failures > 0 ? 1 : 0);
