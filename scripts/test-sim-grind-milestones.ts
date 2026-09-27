/**
 * test-sim-grind-milestones — SIM-05 (requirement updates), WORK-04
 * (change control), SIM-09 (partial submission), E2E-24 (partial + update flow).
 *
 * Run: npx tsx --require ./scripts/sim-test/preload.cjs scripts/test-sim-grind-milestones.ts
 */
import { Harness, finish } from "./sim-test/helpers";
import {
  evaluateMilestoneEligibility,
  fairWindowExtensionMs,
  applyFairWindow,
  microThresholds,
  MIN_RESPONSE_WINDOW_MS,
} from "@/lib/simulations/curveball-policy";
import {
  evaluateSubmissionReadiness,
  markIntentionalPartial,
  forbiddenClaimsForPartial,
} from "@/lib/simulations/partial-submission";
import {
  HANDOFF_FIELDS,
  validateFollowUp,
  validateHandoff,
} from "@/lib/simulations/handoff";
import { ALL_SIMULATIONS } from "@/lib/simulations/content/index";

const t = new Harness("test-sim-grind-milestones");
const MIN_RESPONSE_MINUTES = MIN_RESPONSE_WINDOW_MS / 60000;

// ---------------------------------------------------------------------------
// SIM-05: deterministic requirement-update milestones
// ---------------------------------------------------------------------------
const DURATION_MS = 55 * 60000;
const thresholds = { triggerElapsedRatio: 0.5, minEvents: 5 };
const base = {
  alreadyPresented: false,
  elapsedMs: 28 * 60000,
  totalMs: DURATION_MS,
  candidateEventCount: 9,
  thresholds,
};
const eligible = evaluateMilestoneEligibility(base);
t.eq(eligible.eligible, true, "update delivered at server milestone");
t.eq(eligible.reason, "eligible", "eligible reason");

t.eq(
  evaluateMilestoneEligibility({ ...base, elapsedMs: 5 * 60000 }).reason,
  "too_early",
  "no update before the milestone"
);
const tooEarly = evaluateMilestoneEligibility({ ...base, elapsedMs: 5 * 60000 });
t.ok(tooEarly.retryAfterMs > 0, "too_early reports when to retry");
t.eq(
  evaluateMilestoneEligibility({ ...base, alreadyPresented: true }).reason,
  "already_presented",
  "update never delivered twice"
);
t.eq(
  evaluateMilestoneEligibility({ ...base, candidateEventCount: 1 }).reason,
  "insufficient_activity",
  "idle candidates do not trigger updates"
);
const checkpoint = evaluateMilestoneEligibility({ ...base, elapsedMs: 0, checkpointSaved: true });
t.eq(checkpoint.reason, "checkpoint", "explicit checkpoint save is a documented exception");
// Milestone is deterministic: same server-side state -> same outcome.
t.eq(evaluateMilestoneEligibility(base), eligible, "eligibility is deterministic for identical inputs");
// Never randomized per candidate: no random fields in the result.
t.ok(!("seed" in eligible) && !("jitter" in eligible), "no randomization in the milestone decision");

// Sims that carry a curveball either define an authored trigger ratio
// (long-form shape) or rely on the micro milestone policy.
for (const s of ALL_SIMULATIONS.slice(0, 10)) {
  const cb = s.curveball as { triggerElapsedRatio?: number } | undefined;
  if (!cb) continue;
  if (cb.triggerElapsedRatio !== undefined) {
    t.ok(
      cb.triggerElapsedRatio >= 0.3 && cb.triggerElapsedRatio <= 0.8,
      `curveball trigger mid-session for ${s.slug}`
    );
  } else {
    const th = microThresholds(s.durationMinutes);
    t.ok(
      th.triggerElapsedRatio > 0 && th.triggerElapsedRatio < 1,
      `micro milestone policy covers ${s.slug}`
    );
  }
}

// Micro (5-minute) runtime keeps the existing 4-minute cadence.
t.eq(microThresholds(5).triggerElapsedRatio, 4 / 5, "micro runtime preserves 4-minute milestone threshold");
t.ok(microThresholds(55).minEvents >= 0, "longer runtimes get thresholds");

// ---------------------------------------------------------------------------
// SIM-05: fair response window after an update
// ---------------------------------------------------------------------------
t.eq(
  fairWindowExtensionMs({
    presentedAtMs: Date.parse("2026-09-27T10:55:00.000Z"),
    endsAtMs: Date.parse("2026-09-27T11:00:00.000Z"),
    minWindowMs: MIN_RESPONSE_WINDOW_MS,
  }),
  5 * 60 * 1000,
  "5 minutes remain + 10 required -> 5 minute extension"
);
t.eq(
  fairWindowExtensionMs({
    presentedAtMs: Date.parse("2026-09-27T10:20:00.000Z"),
    endsAtMs: Date.parse("2026-09-27T11:00:00.000Z"),
  }),
  0,
  "plenty of time left -> no extension"
);
const applied = applyFairWindow("2026-09-27T10:55:00.000Z", "2026-09-27T11:00:00.000Z", MIN_RESPONSE_WINDOW_MS);
t.eq(applied, "2026-09-27T11:05:00.000Z", "window applied to deadline");
t.eq(
  applyFairWindow("2026-09-27T10:20:00.000Z", "2026-09-27T11:00:00.000Z", MIN_RESPONSE_WINDOW_MS),
  null,
  "no extension -> null (deadline unchanged)"
);

// ---------------------------------------------------------------------------
// WORK-04: change control + structured handoff
// ---------------------------------------------------------------------------
t.eq(HANDOFF_FIELDS.length, 4, "four required handoff fields");
const goodHandoff: Record<string, string> = {
  whatChanged: "Mapped HOLD_RECLASS rows back to shipments and reran the join.",
  testing: "Ran the packaged pytest suite; all tests pass.",
  remainingRisks: "Carrier code mapping for two carriers is unconfirmed.",
  nextSteps: "Confirm carrier codes with the data platform team before the board report.",
};
const handoffOk = validateHandoff(goodHandoff);
t.eq(handoffOk.complete, true, "complete handoff validates");
const handoffBad = validateHandoff({ ...goodHandoff, testing: "   " });
t.eq(handoffBad.complete, false, "empty handoff field rejected");
t.ok(handoffBad.missingKeys.includes("testing"), "missing field named");
const handoffShort = validateHandoff({ ...goodHandoff, nextSteps: "done" });
t.eq(handoffShort.complete, false, "one-word handoff field rejected as insufficient");
t.eq(handoffOk.completeness, 1, "complete handoff has completeness 1");

const followupOk = validateFollowUp({
  question: "Did you also check the lowercase shipment ids?",
  answer: "Yes — the normalization handles lowercase ids; added a test for that in the second commit.",
});
t.eq(followupOk.ok, true, "substantive follow-up accepted");
t.eq(validateFollowUp({ question: "q", answer: "seen" }).ok, false, "too-short follow-up answer rejected");

// ---------------------------------------------------------------------------
// SIM-09: partial submissions marked, never silently scored complete
// ---------------------------------------------------------------------------
const sessionBase = {
  status: "active",
  started_at: "2026-09-27T10:00:00.000Z",
  curveball_presented_at: "2026-09-27T10:30:00.000Z" as string | null,
  curveball_acknowledged_at: "2026-09-27T10:31:00.000Z" as string | null,
};
const contentBase = {
  hasCurveball: true,
  requiredDeliverableFields: ["flaggedRows", "summary"],
  adaptationCompetencyKeys: ["adaptation"],
  allCompetencyKeys: ["correctness", "adaptation", "communication"],
};
const deliverableBase = { ...goodHandoff, flaggedRows: [1, 2], summary: "late rate recomputed" };
const candidateEvents = [
  { event_type: "message_sent", actor: "candidate" },
  { event_type: "curveball_adaptation", actor: "candidate" },
];

const ready = evaluateSubmissionReadiness({
  session: sessionBase,
  content: contentBase,
  deliverable: deliverableBase,
  events: candidateEvents,
});
t.eq(ready.complete, true, "full submission reads complete");
t.eq(ready.blockers, [], "full submission has no blockers");

const beforeCurveball = evaluateSubmissionReadiness({
  session: { ...sessionBase, curveball_presented_at: null, curveball_acknowledged_at: null },
  content: contentBase,
  deliverable: deliverableBase,
  events: [{ event_type: "message_sent", actor: "candidate" }],
});
t.eq(beforeCurveball.complete, false, "pre-update submission is not complete");
t.eq(beforeCurveball.curveballMissing, true, "missing update flagged");
t.ok(
  beforeCurveball.unobservedDimensions.includes("adaptation"),
  "adaptation marked unobserved when the update never arrived"
);
t.ok(
  beforeCurveball.blockers.some((b) => /issue update/i.test(b)),
  "blocker text names the undelivered update"
);

const unacked = evaluateSubmissionReadiness({
  session: { ...sessionBase, curveball_acknowledged_at: null },
  content: contentBase,
  deliverable: deliverableBase,
  events: candidateEvents,
});
t.eq(unacked.complete, false, "unacknowledged update blocks completion");
t.eq(unacked.curveballUnacknowledged, true, "unacknowledged flag set");

const partial = markIntentionalPartial({ readiness: beforeCurveball, candidateAccepted: true });
t.eq(partial.kind, "intentional_partial", "intentional partial recorded");
t.eq(partial.candidateAccepted, true, "acceptance persisted");
t.throws(
  () => markIntentionalPartial({ readiness: beforeCurveball, candidateAccepted: false }),
  "partial requires explicit candidate acceptance"
);
const claims = forbiddenClaimsForPartial(partial);
t.ok(claims.length > 0, "partial carries forbidden report claims");
t.ok(
  claims.some((c) => c.includes("adaptation") && c.includes("Must not claim")),
  "adaptation claim forbidden when adaptation is unobserved"
);

finish(t.summary());
