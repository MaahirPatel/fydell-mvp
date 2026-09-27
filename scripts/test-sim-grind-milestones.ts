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
  MIN_RESPONSE_MINUTES,
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

// ---------------------------------------------------------------------------
// SIM-05: deterministic requirement-update milestones
// ---------------------------------------------------------------------------
const base = {
  curveballId: "cb",
  curveballAnnounced: false,
  durationMinutes: 55,
  elapsedMinutes: 28,
  elapsedRatio: 28 / 55,
  candidateMessageCount: 5,
  candidateEventCount: 9,
  hasUsedCurves: false,
  checkpoints: [] as string[],
};
const eligible = evaluateMilestoneEligibility(base);
t.eq(eligible.kind, "eligible", "update delivered at server milestone");
if (eligible.kind === "eligible") {
  t.eq(eligible.responseWindowMin, MIN_RESPONSE_MINUTES, "minimum response window guaranteed");
  t.eq(eligible.ackRequired, true, "acknowledgment required before submission counts");
}

t.eq(
  evaluateMilestoneEligibility({ ...base, elapsedMinutes: 5, elapsedRatio: 5 / 55 }).kind,
  "too_early",
  "no update before the milestone"
);
t.eq(
  evaluateMilestoneEligibility({ ...base, curveballAnnounced: true }).kind,
  "already_presented",
  "update never delivered twice"
);
t.eq(
  evaluateMilestoneEligibility({ ...base, candidateMessageCount: 0, candidateEventCount: 0 }).kind,
  "insufficient_activity",
  "idle candidates do not trigger updates"
);
// Milestone is deterministic: same server-side state -> same outcome.
const again = evaluateMilestoneEligibility(base);
t.eq(again, eligible, "eligibility is deterministic for identical inputs");
// Never randomized per candidate: no random fields in the result.
t.ok(!("seed" in eligible) && !("jitter" in eligible), "no randomization in the milestone decision");

// Shipped sims carry a curveball with a sane trigger ratio.
for (const s of ALL_SIMULATIONS.slice(0, 10)) {
  const cb = s.curveball;
  t.ok(
    cb.triggerElapsedRatio >= 0.3 && cb.triggerElapsedRatio <= 0.8,
    `curveball trigger mid-session for ${s.slug}`
  );
}

// Micro (5-minute) runtime keeps the existing 4-minute cadence.
t.eq(microThresholds(5), 4, "micro runtime preserves 4-minute milestone threshold");
t.ok(microThresholds(55) > 4, "longer runtimes scale the threshold up");

// ---------------------------------------------------------------------------
// SIM-05: fair response window after an update
// ---------------------------------------------------------------------------
t.eq(
  fairWindowExtensionMs({
    currentEndsAt: "2026-09-27T11:00:00.000Z",
    presentedAt: "2026-09-27T10:55:00.000Z",
    requiredMinutes: MIN_RESPONSE_MINUTES,
  }),
  5 * 60 * 1000,
  "5 minutes remain + 10 required -> 5 minute extension"
);
t.eq(
  fairWindowExtensionMs({
    currentEndsAt: "2026-09-27T11:00:00.000Z",
    presentedAt: "2026-09-27T10:20:00.000Z",
    requiredMinutes: MIN_RESPONSE_MINUTES,
  }),
  0,
  "plenty of time left -> no extension"
);
const applied = applyFairWindow("2026-09-27T11:00:00.000Z", "2026-09-27T10:55:00.000Z", MIN_RESPONSE_MINUTES);
t.eq(applied.endsAt, "2026-09-27T11:05:00.000Z", "window applied to deadline");
t.eq(applied.extensionMs, 5 * 60 * 1000, "extension amount reported");

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
const handoffOk = validateHandoff(goodHandoff, []);
t.eq(handoffOk.ok, true, "complete handoff validates");
const handoffBad = validateHandoff({ ...goodHandoff, testing: "   " }, []);
t.eq(handoffBad.ok, false, "empty handoff field rejected");
t.ok(handoffBad.missing.includes("testing"), "missing field named");
const handoffShort = validateHandoff({ ...goodHandoff, nextSteps: "done" }, []);
t.eq(handoffShort.ok, false, "one-word handoff field rejected as insufficient");

const followupOk = validateFollowUp(
  { whatChanged: "x", testing: "y", remainingRisks: "z", nextSteps: "w" },
  "The mapping also needed normalization for lowercase ids — added in commit 2."
);
t.eq(followupOk.ok, true, "substantive follow-up accepted");
t.eq(validateFollowUp({}, "seen").ok, false, "follow-up without prior handoff rejected");

// ---------------------------------------------------------------------------
// SIM-09: partial submissions marked, never silently scored complete
// ---------------------------------------------------------------------------
const curveballConfig = { id: "cb", requiredAdaptation: "Recompute with HOLD rows included" };
const ready = evaluateSubmissionReadiness({
  deliverableFields: ["flaggedRows", "summary"],
  handoff: goodHandoff,
  curveballConfig,
  curveballPresented: true,
  curveballAcknowledged: true,
  events: [{ event_type: "curveball_adaptation", payload: { curveballId: "cb" } }],
});
t.eq(ready.complete, true, "full submission reads complete");
t.eq(ready.blockers, [], "full submission has no blockers");

const beforeCurveball = evaluateSubmissionReadiness({
  deliverableFields: ["flaggedRows", "summary"],
  handoff: goodHandoff,
  curveballConfig,
  curveballPresented: false,
  curveballAcknowledged: false,
  events: [],
});
t.eq(beforeCurveball.complete, false, "pre-update submission is not complete");
t.eq(beforeCurveball.curveballMissing, true, "missing update flagged");
t.ok(
  beforeCurveball.unobservedDimensions.includes("adaptation"),
  "adaptation marked unobserved when the update never arrived"
);
t.ok(
  beforeCurveball.blockers.some((b) => b.includes("curveball")),
  "blocker text names the unpresented update"
);

const unacked = evaluateSubmissionReadiness({
  deliverableFields: ["flaggedRows", "summary"],
  handoff: goodHandoff,
  curveballConfig,
  curveballPresented: true,
  curveballAcknowledged: false,
  events: [{ event_type: "curveball_adaptation", payload: { curveballId: "cb" } }],
});
t.eq(unacked.complete, false, "unacknowledged update blocks completion");

const partial = markIntentionalPartial(
  beforeCurveball,
  { partial: true, acceptance: "I could not finish the reclassification before the deadline.", unobserved: ["adaptation", "communication"] },
  []
);
t.eq(partial.partial, true, "intentional partial recorded");
t.eq(partial.complete, false, "partial never masquerades as complete");
t.throws(
  () => markIntentionalPartial(beforeCurveball, { partial: true, acceptance: "", unobserved: ["adaptation"] }, []),
  "partial requires a written acceptance"
);
const claims = forbiddenClaimsForPartial(partial);
t.ok(claims.length > 0, "partial carries forbidden employer claims");
t.ok(
  claims.some((c) => c.includes("adapted")),
  "adaptation claim forbidden when adaptation is unobserved"
);

finish(t.summary());
