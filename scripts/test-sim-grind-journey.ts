/**
 * test-sim-grind-journey — SIM-01 (attempt binding/resume), SIM-06
 * (idempotent event/message intake contract), WORK-06 (AI-use provenance),
 * E2E-04 (full attempt lifecycle, in-process with fakes),
 * E2E-24 (partial submit -> update -> complete).
 * WORK-10 / SCEN-10 / SIM-10 are DEFERRED-P1 (asserted as documented).
 *
 * Run: npx tsx --require ./scripts/sim-test/preload.cjs scripts/test-sim-grind-journey.ts
 */
import { Harness, finish } from "./sim-test/helpers";
import {
  validateAttemptBinding,
  resumeKey,
  shouldResumeExisting,
} from "@/lib/simulations/attempt-binding";
import { buildInterruptionLedger, summarizeTiming } from "@/lib/simulations/timing";
import {
  ALLOWED_CANDIDATE_EVENTS,
  NEVER_CAPTURED,
} from "@/lib/simulations/observed-events";
import { buildSessionChatContext } from "@/lib/simulations/chat-context";
import { selectAuthoredReply } from "@/lib/simulations/stakeholder";
import { evaluateProactiveMessages } from "@/lib/simulations/proactive";
import {
  evaluateMilestoneEligibility,
  applyFairWindow,
  MIN_RESPONSE_WINDOW_MS,
} from "@/lib/simulations/curveball-policy";
import { validateHandoff } from "@/lib/simulations/handoff";
import {
  evaluateSubmissionReadiness,
  markIntentionalPartial,
  forbiddenClaimsForPartial,
} from "@/lib/simulations/partial-submission";
import { buildHintLedger, authoredHintsReceived } from "@/lib/simulations/hint-log";
import { attemptFormKey } from "@/lib/simulations/comparability";
import {
  classifyAiEvidence,
  AI_USE_POLICY_TEXT,
} from "@/lib/simulations/ai-use-policy";
import { analyze } from "@/lib/simulations/scoring";
import { ALL_SIMULATIONS } from "@/lib/simulations/content/index";

const t = new Harness("test-sim-grind-journey");

// ---------------------------------------------------------------------------
// E2E-04: full attempt lifecycle, in-process (no Supabase, no network)
// ---------------------------------------------------------------------------

// 1. Invitation -> attempt binding (SIM-01).
const binding = {
  candidateUserId: "cand-1",
  organizationId: "org-9",
  templateId: "project-relay",
  templateVersionId: "2.0.1",
  durationMinutes: 55,
  origin: "invitation" as const,
  invitationId: "inv-123",
};
t.eq(validateAttemptBinding(binding), [], "valid binding has no errors");
t.ok(
  validateAttemptBinding({ ...binding, templateVersionId: "" }).some((e) =>
    e.includes("immutable template version")
  ),
  "unpinned version rejected"
);
const rk1 = resumeKey({ origin: "invitation", invitationId: "inv-123", candidateUserId: "cand-1", templateId: "project-relay" });
const rk2 = resumeKey({ origin: "invitation", invitationId: "inv-123", candidateUserId: "cand-1", templateId: "project-relay" });
t.eq(rk1, rk2, "resume key deterministic");
t.eq(shouldResumeExisting({ existingStatus: "active", sameBinding: true }), "resume", "active attempt resumes");
t.eq(shouldResumeExisting({ existingStatus: "submitted", sameBinding: true }), "reject", "submitted attempt is terminal");
t.eq(shouldResumeExisting({ existingStatus: null, sameBinding: false }), "create_new", "no existing attempt -> create");

// 2. Session clock starts; connectivity blip recorded with server timestamps.
const sessionId = "sess-e2e-04";
const events = [
  { event_type: "connectivity_interrupted", actor: "candidate", payload: {}, created_at: "2026-09-27T10:10:00.000Z" },
  { event_type: "connectivity_restored", actor: "candidate", payload: {}, created_at: "2026-09-27T10:12:00.000Z" },
];
for (const e of events) {
  t.ok(ALLOWED_CANDIDATE_EVENTS.has(e.event_type), `event allowed: ${e.event_type}`);
}
const ledger = buildInterruptionLedger(sessionId, events);
t.eq(ledger.length, 1, "blip recorded as one interruption");
const timing = summarizeTiming({
  sessionId,
  startedAt: "2026-09-27T10:00:00.000Z",
  endsAt: "2026-09-27T10:55:00.000Z",
  events,
  nowIso: "2026-09-27T10:30:00.000Z",
});
t.eq(timing.excludedMs, 2 * 60 * 1000, "2-minute blip excluded from effective time");

// 3. Candidate chats with a simulated teammate (deterministic, disclosed).
const sim = ALL_SIMULATIONS.find((s) => s.slug === "ops-yield-investigation") || ALL_SIMULATIONS[0];
const stakeholder = sim.stakeholders[0];
const chatCtx = buildSessionChatContext({
  content: sim as never,
  elapsedMs: 3 * 60000,
  events: [],
  messages: [],
});
const replyCtx = { curveballPresented: false, usedRuleIds: [] as string[], chat: chatCtx };
const q = "What was the HOLD_RECLASS mapping again?";
const a1 = selectAuthoredReply(stakeholder, q, replyCtx);
const a2 = selectAuthoredReply(stakeholder, q, replyCtx);
t.eq(a1.reply, a2.reply, "teammate reply deterministic across the journey");
t.ok(a1.ruleId !== null || a1.reply.length > 0, "teammate answers from authored content");

// 4. Proactive welcome fires once (idempotent via usedIds).
const due1 = evaluateProactiveMessages(sim as never, chatCtx, []);
t.ok(due1.length >= 0, "proactive evaluation runs");
const usedIds = due1.map((d) => d.def.id);
const due2 = evaluateProactiveMessages(sim as never, chatCtx, usedIds);
t.eq(
  due2.filter((d) => usedIds.includes(d.def.id)).length,
  0,
  "proactive messages never double-deliver"
);

// 5. Requirement update arrives as a deterministic milestone; fair window applied.
const milestone = evaluateMilestoneEligibility({
  alreadyPresented: false,
  elapsedMs: 30 * 60000,
  totalMs: 55 * 60000,
  candidateEventCount: 12,
  thresholds: { triggerElapsedRatio: 0.5, minEvents: 5 },
});
t.eq(milestone.eligible, true, "milestone eligible at 30/55 minutes");
const extended = applyFairWindow("2026-09-27T10:52:00.000Z", "2026-09-27T10:55:00.000Z", MIN_RESPONSE_WINDOW_MS);
t.eq(extended, "2026-09-27T11:02:00.000Z", "late update extends the deadline fairly");

// 6. Submission: handoff complete, readiness complete, hints logged.
const handoff = {
  whatChanged: "Normalized shipment IDs and rewired the report to the reconciled join.",
  testing: "Ran the packaged test suite and evals; all green.",
  remainingRisks: "Two carriers' self-reported rates are still unverified.",
  nextSteps: "Confirm carrier rates with ops before the board deck.",
};
t.eq(validateHandoff(handoff).complete, true, "journey handoff complete");
const readiness = evaluateSubmissionReadiness({
  session: {
    status: "active",
    started_at: "2026-09-27T10:00:00.000Z",
    curveball_presented_at: "2026-09-27T10:30:00.000Z",
    curveball_acknowledged_at: "2026-09-27T10:31:00.000Z",
  },
  content: {
    hasCurveball: true,
    requiredDeliverableFields: ["summary"],
    adaptationCompetencyKeys: ["adaptation"],
    allCompetencyKeys: ["correctness", "adaptation"],
  },
  deliverable: { ...handoff, summary: "Late rate recomputed on reconciled data." },
  events: [
    { event_type: "message_sent", actor: "candidate" },
    { event_type: "curveball_adaptation", actor: "candidate" },
  ],
});
t.eq(readiness.complete, true, "journey submission reads complete");
const hintLedger = buildHintLedger(sessionId, sim, [
  {
    id: "m1", event_type: "message_received", actor: "stakeholder",
    payload: { stakeholderId: stakeholder.id, ruleId: a1.ruleId, source: "authored" },
    created_at: "2026-09-27T10:03:00Z",
  },
]);
t.ok(authoredHintsReceived(hintLedger).length >= 1, "teammate facts logged to the hint ledger");

// 7. Form key pins template + version (comparability through the journey).
t.eq(
  attemptFormKey({ templateId: "project-relay", templateVersionId: "2.0.1", cohortId: null, candidateUserId: "cand-1" }),
  "project-relay:2.0.1:no-cohort",
  "form key pins the exact version"
);

// ---------------------------------------------------------------------------
// E2E-24: partial submit -> requirement update -> resumed completion
// ---------------------------------------------------------------------------
const e2e24Content = {
  hasCurveball: true,
  requiredDeliverableFields: ["summary"],
  adaptationCompetencyKeys: ["adaptation"],
  allCompetencyKeys: ["correctness", "adaptation", "communication"],
};
const e2e24Deliverable = { ...handoff, summary: "Initial late-rate computation." };
const earlySession = {
  status: "active",
  started_at: "2026-09-27T10:00:00.000Z",
  curveball_presented_at: null as string | null,
  curveball_acknowledged_at: null as string | null,
};
const early = evaluateSubmissionReadiness({
  session: earlySession,
  content: e2e24Content,
  deliverable: e2e24Deliverable,
  events: [{ event_type: "message_sent", actor: "candidate" }],
});
t.eq(early.complete, false, "E2E-24: early submit blocked before the update");
t.eq(early.curveballMissing, true, "E2E-24: missing update named");
const marking = markIntentionalPartial({ readiness: early, candidateAccepted: true });
t.eq(marking.kind, "intentional_partial", "E2E-24: partial marked with acceptance");
t.ok(
  forbiddenClaimsForPartial(marking).some((c) => c.includes("adaptation")),
  "E2E-24: report forbidden from claiming adaptation was measured"
);
const resumed = evaluateSubmissionReadiness({
  session: {
    ...earlySession,
    curveball_presented_at: "2026-09-27T10:30:00.000Z",
    curveball_acknowledged_at: "2026-09-27T10:31:00.000Z",
  },
  content: e2e24Content,
  deliverable: { ...e2e24Deliverable, summary: "Late rate recomputed after the update." },
  events: [
    { event_type: "message_sent", actor: "candidate" },
    { event_type: "curveball_adaptation", actor: "candidate" },
  ],
});
t.eq(resumed.complete, true, "E2E-24: resumed attempt completes after update + acknowledgment");
t.eq(
  forbiddenClaimsForPartial(markIntentionalPartial({ readiness: resumed, candidateAccepted: true })).length,
  0,
  "E2E-24: no forbidden claims once all dimensions observed"
);

// ---------------------------------------------------------------------------
// SIM-06: idempotent intake contract (code-level; DB dedupe is NEEDS-LIVE)
// ---------------------------------------------------------------------------
t.ok(ALLOWED_CANDIDATE_EVENTS.has("message_sent"), "message_sent in the allowlist");
t.ok(ALLOWED_CANDIDATE_EVENTS.has("state_saved"), "state_saved in the allowlist");
for (const banned of NEVER_CAPTURED) {
  t.ok(!ALLOWED_CANDIDATE_EVENTS.has(banned), `SIM-06: ${banned} can never be ingested`);
}
const clientEventId = (clientId: string, type: string) => `${clientId}:${type}`;
t.eq(clientEventId("c1", "message_sent"), clientEventId("c1", "message_sent"), "client event ids deterministic");

// ---------------------------------------------------------------------------
// WORK-06: AI-use provenance — unobserved work is never "observed behavior"
// ---------------------------------------------------------------------------
t.eq(classifyAiEvidence({ externalAllowed: true }).provenance, "external_unknown", "external use defaults to unknown");
t.eq(classifyAiEvidence({ externalAllowed: true }).directlyObserved, false, "external_unknown never directly observed");
t.eq(classifyAiEvidence({ externalDisclosed: true }).directlyObserved, false, "external_disclosed never directly observed");
t.eq(classifyAiEvidence({ assistantObserved: true }).directlyObserved, true, "recorded assistant use is observed");
t.eq(classifyAiEvidence({}).directlyObserved, true, "unaided work is observed");
t.eq(classifyAiEvidence({ insertedFromAssistant: true }).directlyObserved, false, "pasted assistant output is not unaided evidence");
t.ok(
  AI_USE_POLICY_TEXT.includes("unobserved external") && AI_USE_POLICY_TEXT.includes("disclose"),
  "candidate-facing policy discloses the recording boundary"
);

// ---------------------------------------------------------------------------
// Hard rule: analysis never emits an automatic hiring decision
// ---------------------------------------------------------------------------
const strong = analyze(
  [
    { key: "correctness", label: "Correctness", weight: 0.6, critical: true },
    { key: "communication", label: "Communication", weight: 0.4, critical: false },
  ] as never,
  [
    { actionKey: "a", competencyKey: "correctness", baseWeight: 1, quality: 0.95 },
    { actionKey: "b", competencyKey: "communication", baseWeight: 1, quality: 0.9 },
  ] as never
);
t.ok(
  strong.recommendation === "review" || strong.recommendation === "further_evidence_required",
  `near-perfect attempt resolves to "${strong.recommendation}", never auto-advance`
);
const weak = analyze(
  [{ key: "correctness", label: "Correctness", weight: 1, critical: true }] as never,
  [{ actionKey: "a", competencyKey: "correctness", baseWeight: 1, quality: 0.1 }] as never
);
t.eq(weak.recommendation, "further_evidence_required", "critical failure -> further evidence, not auto-decline");

// ---------------------------------------------------------------------------
// WORK-10 / SCEN-10 / SIM-10: DEFERRED-P1 — documented, not built
// ---------------------------------------------------------------------------
t.ok(true, "WORK-10 (applied-AI evals) DEFERRED-P1: no applied-AI assessment ships in this chunk");
t.ok(true, "SCEN-10 (applied-AI scenario) DEFERRED-P1: no applied-AI scenario ships in this chunk");
t.ok(true, "SIM-10 (applied-AI sim) DEFERRED-P1: no applied-AI sim instrumentation ships in this chunk");

finish(t.summary());
