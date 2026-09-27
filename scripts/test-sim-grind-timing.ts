/**
 * test-sim-grind-timing — WORK-03 (fair, reproducible timing), SCEN-08
 * (deadline extensions/accommodations), SIM-08 (disclosed event taxonomy).
 *
 * Run: npx tsx --require ./scripts/sim-test/preload.cjs scripts/test-sim-grind-timing.ts
 */
import { Harness, finish } from "./sim-test/helpers";
import {
  applyExtension,
  buildInterruptionLedger,
  computeFairEndsAt,
  platformDowntimeMs,
  summarizeTiming,
  INTERRUPTION_START_EVENT,
  INTERRUPTION_END_EVENT,
} from "@/lib/simulations/timing";
import {
  ALLOWED_CANDIDATE_EVENTS,
  DISCLOSED_EVENT_TAXONOMY,
  NEVER_CAPTURED,
  TELEMETRY_DISCLOSURE,
  validateCaptureBoundary,
} from "@/lib/simulations/observed-events";

const t = new Harness("test-sim-grind-timing");

// ---------------------------------------------------------------------------
// WORK-03: interruption ledger from server-timestamped events
// ---------------------------------------------------------------------------
const S = "sess-1";
const ev = (type: string, created_at: string, payload: Record<string, unknown> = {}, actor = "candidate") => ({
  event_type: type,
  actor,
  payload,
  created_at,
});

// A 3-minute platform connectivity interruption inside a 60-minute session.
const events = [
  ev(INTERRUPTION_START_EVENT, "2026-09-27T10:05:00.000Z", { reason: "connectivity_lost" }),
  ev(INTERRUPTION_END_EVENT, "2026-09-27T10:08:00.000Z", {}),
];
const ledger = buildInterruptionLedger(S, events);
t.eq(ledger.length, 1, "one interruption recorded");
t.eq(ledger[0].cause, "platform", "connectivity loss defaults to platform cause");
t.eq(ledger[0].startedAt, "2026-09-27T10:05:00.000Z", "server timestamp used for start");
t.eq(ledger[0].endedAt, "2026-09-27T10:08:00.000Z", "server timestamp used for end");

const downtime = platformDowntimeMs(
  ledger,
  new Date("2026-09-27T10:00:00.000Z").getTime(),
  new Date("2026-09-27T11:00:00.000Z").getTime()
);
t.eq(downtime, 3 * 60 * 1000, "platform downtime = 3 minutes");

// Candidate-caused pauses do NOT extend the deadline.
const candEvents = [
  ev(INTERRUPTION_START_EVENT, "2026-09-27T10:05:00.000Z", { cause: "candidate", reason: "app_closed" }),
  ev(INTERRUPTION_END_EVENT, "2026-09-27T10:20:00.000Z", {}),
];
const candLedger = buildInterruptionLedger(S, candEvents);
t.eq(
  platformDowntimeMs(candLedger, 0, Date.now()),
  0,
  "candidate-caused pause contributes zero platform downtime"
);

// Ongoing interruption is reported, not silently dropped.
const ongoing = buildInterruptionLedger(S, [
  ev(INTERRUPTION_START_EVENT, "2026-09-27T10:05:00.000Z", {}),
]);
t.eq(ongoing[0].endedAt, null, "open interruption has null end");

// A restore without an interrupt is ignored (no phantom ledger entry).
t.eq(buildInterruptionLedger(S, [ev(INTERRUPTION_END_EVENT, "2026-09-27T10:08:00.000Z", {})]).length, 0, "restore without interrupt ignored");

// Double interrupt does not double-count.
t.eq(
  buildInterruptionLedger(S, [
    ev(INTERRUPTION_START_EVENT, "2026-09-27T10:05:00.000Z", {}),
    ev(INTERRUPTION_START_EVENT, "2026-09-27T10:06:00.000Z", {}),
    ev(INTERRUPTION_END_EVENT, "2026-09-27T10:08:00.000Z", {}),
  ]).length,
  1,
  "overlapping interrupts collapse to one record"
);

// Teammate-service outage pauses the clock per policy.
const outageLedger = buildInterruptionLedger(S, [
  ev("teammate_service_outage", "2026-09-27T10:10:00.000Z", {}, "system"),
  ev("teammate_service_recovered", "2026-09-27T10:15:00.000Z", {}, "system"),
]);
t.eq(outageLedger.length, 1, "outage opens an interruption record");
t.eq(outageLedger[0].cause, "platform", "outage is platform-caused");
t.eq(outageLedger[0].reason, "teammate_outage_pause", "outage reason labeled");

// ---------------------------------------------------------------------------
// WORK-03: effective elapsed excludes platform downtime; deadline extends
// ---------------------------------------------------------------------------
const summary = summarizeTiming({
  sessionId: S,
  startedAt: "2026-09-27T10:00:00.000Z",
  endsAt: "2026-09-27T11:00:00.000Z",
  events,
  nowIso: "2026-09-27T10:30:00.000Z",
});
t.eq(summary.wallMs, 30 * 60 * 1000, "wall clock 30 min");
t.eq(summary.excludedMs, 3 * 60 * 1000, "3 min platform downtime excluded");
t.eq(summary.effectiveMs, 27 * 60 * 1000, "effective elapsed = wall - downtime");
t.eq(summary.ongoing, null, "no ongoing interruption");

const fairEndsAt = computeFairEndsAt({
  startedAt: "2026-09-27T10:00:00.000Z",
  endsAt: "2026-09-27T11:00:00.000Z",
  interruptions: ledger,
});
t.eq(fairEndsAt, "2026-09-27T11:03:00.000Z", "deadline extended by exactly the downtime");

t.eq(
  computeFairEndsAt({
    startedAt: "2026-09-27T10:00:00.000Z",
    endsAt: "2026-09-27T11:00:00.000Z",
    interruptions: candLedger,
  }),
  null,
  "no extension owed for candidate-caused pauses"
);

// ---------------------------------------------------------------------------
// SCEN-08: explicit extensions / accommodations
// ---------------------------------------------------------------------------
const ext = applyExtension("2026-09-27T11:00:00.000Z", 15 * 60 * 1000, "accommodation: extra time approved");
t.eq(ext.endsAt, "2026-09-27T11:15:00.000Z", "accommodation extends deadline");
t.eq(ext.reason, "accommodation: extra time approved", "reason preserved for audit");
t.throws(() => applyExtension("2026-09-27T11:00:00.000Z", 0, "x"), "zero extension rejected");
t.throws(() => applyExtension("2026-09-27T11:00:00.000Z", 60000, "  "), "extension requires a reason");

// ---------------------------------------------------------------------------
// SIM-08: capture boundary — only disclosed events, never banned ones
// ---------------------------------------------------------------------------
t.eq(validateCaptureBoundary(), [], "capture boundary validates clean");
t.ok(ALLOWED_CANDIDATE_EVENTS.has("connectivity_interrupted"), "connectivity_interrupted is candidate-reportable");
t.ok(ALLOWED_CANDIDATE_EVENTS.has("connectivity_restored"), "connectivity_restored is candidate-reportable");
for (const banned of NEVER_CAPTURED) {
  t.ok(!ALLOWED_CANDIDATE_EVENTS.has(banned), `banned capture "${banned}" not in allowlist`);
  t.ok(!DISCLOSED_EVENT_TAXONOMY.some((e) => e.type === banned), `banned capture "${banned}" not in taxonomy`);
}
t.ok(
  TELEMETRY_DISCLOSURE.includes("do not record how long you look at a file") &&
    TELEMETRY_DISCLOSURE.includes("outside this app"),
  "telemetry disclosure states the limits plainly"
);
// A tampered allowlist would be caught:
t.ok(
  validateCaptureBoundary(new Set([...ALLOWED_CANDIDATE_EVENTS, "file_focus_duration"])).length > 0,
  "boundary check rejects an allowlist containing file_focus_duration"
);

finish(t.summary());
