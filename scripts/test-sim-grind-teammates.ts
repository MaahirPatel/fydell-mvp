/**
 * test-sim-grind-teammates — WORK-05 (stable coworker facts + hint logging),
 * SIM-03 (simulated teammate disclosure), SIM-04 (constrained behavior),
 * SIM-07 (teammate service outage).
 *
 * Run: npx tsx scripts/test-sim-grind-teammates.ts
 */

// --- inline harness (no helper files permitted in this chunk) ---
class Harness {
  private passed = 0;
  private failed = 0;
  private failures: string[] = [];
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  ok(cond: unknown, label: string, detail?: string): void {
    if (cond) this.passed++;
    else {
      this.failed++;
      this.failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    }
  }
  eq<T>(actual: T, expected: T, label: string): void {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    this.ok(a === e, label, a === e ? undefined : `expected ${e}, got ${a}`);
  }
  throws(fn: () => unknown, label: string, match?: RegExp): void {
    try {
      fn();
      this.ok(false, label, "expected throw, nothing thrown");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.ok(!match || match.test(msg), label, `threw "${msg}" (wanted ${match})`);
    }
  }
  summary(): number {
    console.log(`\n[${this.name}] ${this.passed} passed, ${this.failed} failed`);
    for (const f of this.failures) console.log(`  FAIL: ${f}`);
    return this.failed === 0 ? 0 : 1;
  }
}

// --- server-only stub: pure sim libs import "server-only"; stub it so tsx can load them ---
declare const require: any;
const NodeModule = require("node:module") as any;
const origLoad = NodeModule._load;
NodeModule._load = function (request: string, ...rest: any[]) {
  if (request === "server-only") return {};
  return origLoad.call(this, request, ...rest);
};

async function main(): Promise<void> {
  const t = new Harness("test-sim-grind-teammates");
  const { selectAuthoredReply, buildRedraftSystemPrompt, draftReply, findStakeholder } =
    await import("@/lib/simulations/stakeholder");
  const { toCandidateView, toMicroCandidateView } = await import("@/lib/simulations/candidate-view");
  const { toV2CandidateView } = await import("@/lib/simulations/v2/candidate-view");
  const { microToV2 } = await import("@/lib/simulations/v2/from-micro");
  const { ALL_SIMULATIONS } = await import("@/lib/simulations/content/index");
  const { buildHintLedger, authoredHintsReceived, validateHintStability } =
    await import("@/lib/simulations/hint-log");
  const { SIMULATED_TEAMMATE_DISCLOSURE, withTeammateDisclosure } =
    await import("@/lib/simulations/teammate-disclosure");
  const {
    countConsecutiveDegraded,
    evaluateOutage,
    outageIsOpen,
    stakeholderQualityFloor,
    OUTAGE_CONSECUTIVE_THRESHOLD,
  } = await import("@/lib/simulations/outage-policy");

  const sim = ALL_SIMULATIONS[0];
  t.ok(sim && sim.stakeholders.length === 1, "fixture sim loaded with one stakeholder");
  const stakeholder = sim.stakeholders[0];

  const ctx = {
    elapsedMinutes: 3,
    minutesSinceCurveball: null,
    answeredQuestionIds: [],
    completedTaskIds: [],
    openedResourceIds: [],
    flaggedRowCount: 0,
    candidateEventCount: 4,
    candidateMessageCount: 1,
    curveballPresented: false,
    usedRuleIds: [],
    usedProactiveIds: [],
  };
  const replyCtx = { curveballPresented: false, usedRuleIds: [] as string[], chat: ctx };

  // ---------------------------------------------------------------------------
  // WORK-05 / SIM-04: deterministic, stable, constrained replies
  // ---------------------------------------------------------------------------
  const msg = "When did the HOLD_RECLASS mapping start?";
  const r1 = selectAuthoredReply(stakeholder, msg, replyCtx);
  const r2 = selectAuthoredReply(stakeholder, msg, replyCtx);
  t.eq(r1, r2, "same message + context -> identical reply (deterministic)");
  t.ok(r1.ruleId !== null, "relevant question matches an authored rule");

  // Ambiguous question gets a consistent clarification (fallback), twice.
  const amb1 = selectAuthoredReply(stakeholder, "hmm not sure what to do", replyCtx);
  const amb2 = selectAuthoredReply(stakeholder, "hmm not sure what to do", replyCtx);
  t.eq(amb1.reply, amb2.reply, "ambiguous question -> consistent fallback reply");
  t.eq(amb1.ruleId, null, "fallback carries no rule id");

  // onceOnly: a fired rule does not fire again (synthetic stakeholder with a
  // onceOnly rule, since shipped rules are intentionally repeatable).
  const onceStakeholder = {
    ...stakeholder,
    responseRules: [
      { id: "once_hint", priority: 10, anyKeywords: ["secretword"], reply: "one-time hint", onceOnly: true },
      { id: "repeat_hint", priority: 1, anyKeywords: ["secretword"], reply: "repeatable hint" },
    ],
  };
  const o1 = selectAuthoredReply(onceStakeholder, "tell me the secretword", replyCtx);
  t.eq(o1.ruleId, "once_hint", "onceOnly rule fires first");
  const o2 = selectAuthoredReply(onceStakeholder, "tell me the secretword", {
    ...replyCtx,
    usedRuleIds: ["once_hint"],
  });
  t.eq(o2.ruleId, "repeat_hint", "onceOnly rule does not re-fire; next rule matches");

  // Fallback never invents requirements or grading secrets.
  t.ok(
    !/grade|score|rubric|to pass/i.test(amb1.reply),
    "fallback reply contains no grading language"
  );

  // Authored content across ALL shipped sims is stable and testable.
  for (const s of ALL_SIMULATIONS) {
    const problems = validateHintStability(s);
    t.eq(problems, [], `hint stability: ${s.slug}`);
  }
  t.ok(ALL_SIMULATIONS.length >= 20, `all ${ALL_SIMULATIONS.length} sims scanned`);

  // ---------------------------------------------------------------------------
  // WORK-05: hint/fact exposure ledger per candidate
  // ---------------------------------------------------------------------------
  const ledgerEvents = [
    { id: "e1", event_type: "message_received", actor: "stakeholder", payload: { stakeholderId: stakeholder.id, ruleId: r1.ruleId, source: "authored" }, created_at: "2026-09-27T10:01:00Z" },
    { id: "e2", event_type: "proactive_message_delivered", actor: "stakeholder", payload: { stakeholderId: stakeholder.id, proactiveId: stakeholder.proactiveMessages![0].id }, created_at: "2026-09-27T10:02:00Z" },
    { id: "e3", event_type: "message_received", actor: "stakeholder", payload: { stakeholderId: stakeholder.id, ruleId: null, source: "curveball_announcement" }, created_at: "2026-09-27T10:03:00Z" },
    { id: "e4", event_type: "message_received", actor: "stakeholder", payload: { stakeholderId: stakeholder.id, ruleId: null, source: "authored" }, created_at: "2026-09-27T10:04:00Z" },
    // Duplicate delivery of the same rule must not double-count the hint.
    { id: "e5", event_type: "message_received", actor: "stakeholder", payload: { stakeholderId: stakeholder.id, ruleId: r1.ruleId, source: "authored" }, created_at: "2026-09-27T10:05:00Z" },
  ];
  const ledger = buildHintLedger("sess-1", sim, ledgerEvents);
  const authored = authoredHintsReceived(ledger);
  t.eq(authored.filter((h) => h.kind === "response_rule").length, 1, "rule hint logged once despite duplicate delivery");
  t.eq(authored.filter((h) => h.kind === "proactive").length, 1, "proactive hint logged");
  t.eq(authored.filter((h) => h.kind === "curveball").length, 1, "curveball exposure logged");
  t.ok(
    authored.some((h) => h.kind === "response_rule" && h.deliveredText.includes("HOLD_RECLASS")),
    "ledger records the authored text that was delivered"
  );
  t.ok(
    ledger.exposures.some((h) => h.kind === "fallback"),
    "fallback occurrences are auditable in the ledger"
  );
  t.ok(
    ledger.exposures.every((h) => h.deliveredAt && h.stakeholderId),
    "every exposure carries a timestamp and stakeholder"
  );

  // ---------------------------------------------------------------------------
  // SIM-03: simulated teammates are always disclosed
  // ---------------------------------------------------------------------------
  const disclosed = withTeammateDisclosure([{ id: "x", name: "X", role: "R", blurb: "B" }]);
  t.eq(disclosed[0].simulated, true, "stakeholder flagged simulated");
  t.eq(disclosed[0].disclosure, SIMULATED_TEAMMATE_DISCLOSURE, "disclosure copy attached");
  t.ok(
    SIMULATED_TEAMMATE_DISCLOSURE.includes("not a real coworker"),
    "disclosure plainly says these are not real coworkers"
  );

  const microView = toMicroCandidateView(sim);
  t.eq(microView.stakeholder.simulated, true as unknown as boolean, "micro candidate view discloses simulated teammate");
  t.ok(
    String(microView.stakeholder.disclosure).includes("scripted"),
    "micro candidate view carries disclosure copy"
  );

  const v2view = toV2CandidateView(microToV2(sim));
  t.ok(
    v2view.stakeholders.every((s) => (s as { simulated?: boolean }).simulated === true),
    "v2 candidate view discloses simulated teammates"
  );
  const fullView = toCandidateView(
    {
      slug: "x", roleKey: "data_analyst", title: "T", scenarioSummary: "S", mission: "M",
      companyName: "C", durationMinutes: 5, difficulty: "standard", toolsAvailable: [],
      workspaceTools: [], tasks: [], resources: [], stakeholders: [stakeholder],
      curveball: { id: "cb", stakeholderId: stakeholder.id, announcement: "A", requiredAdaptation: "R", triggerElapsedRatio: 0.5, minEvents: 1 },
      deliverableFields: [], competencies: [], deterministicChecks: [], rubricIndicators: [],
      answerKey: { summary: "", keyFindings: [], validAlternatives: [] },
      aiAssistantInstructions: "",
      schemaVersion: 1,
    } as never,
    { curveballPresented: false }
  );
  t.ok(
    fullView.stakeholders.every((s) => s.simulated === true),
    "long-form candidate view discloses simulated teammates"
  );

  // ---------------------------------------------------------------------------
  // WORK-05: AI redraft guardrails — prompt cannot leak hidden material
  // ---------------------------------------------------------------------------
  const HIDDEN = "HIDDEN_ANSWER_XYZ_123";
  const prompt = buildRedraftSystemPrompt(stakeholder, r1.reply, ctx);
  t.ok(
    prompt.includes("You must convey EXACTLY the facts in the approved reply below"),
    "redraft prompt constrains the model to the approved reply"
  );
  t.ok(prompt.includes("no new facts, no speculation"), "redraft prompt forbids invention");
  t.ok(!prompt.includes(HIDDEN), "redraft prompt contains no hidden material (none is passed in)");
  t.ok(prompt.includes(r1.reply), "approved reply is the redraft source");

  // draftReply falls back to authored on provider failure — and the authored
  // reply is byte-identical to the deterministic engine's output.
  const realFetch = globalThis.fetch;
  const realKey = process.env.OPENAI_API_KEY;
  try {
    process.env.OPENAI_API_KEY = "test-key";
    (globalThis as { fetch?: unknown }).fetch = async () => {
      throw new Error("provider down");
    };
    const withPersona = { ...stakeholder, aiPersona: "terse ops lead" };
    const drafted = await draftReply(withPersona, msg, replyCtx);
    t.eq(drafted.source, "authored", "provider failure -> authored source");
    t.eq(drafted.reply, r1.reply, "provider failure -> byte-identical authored reply");

    // Capture the outgoing request: assert the guardrail text is what is sent
    // and no hidden fields (knowledge/withholds) are included.
    let sentBody = "";
    (globalThis as { fetch?: unknown }).fetch = (async (url: string, init: { body: string }) => {
      sentBody = init.body;
      return { ok: true, json: async () => ({ choices: [{ message: { content: "redrafted ok, thanks" } }] }) };
    }) as unknown as typeof fetch;
    const withSecrets = {
      ...withPersona,
      knowledge: ["SECRET_KNOWLEDGE_ABC"],
      withholds: ["SECRET_WITHHOLD_DEF"],
    };
    const redrafted = await draftReply(withSecrets, msg, replyCtx);
    t.eq(redrafted.source, "ai_redraft", "healthy provider -> ai_redraft");
    const parsed = JSON.parse(sentBody) as { messages: { content: string }[] };
    const systemContent = parsed.messages[0].content;
    t.ok(systemContent.includes("EXACTLY the facts in the approved reply"), "wire prompt carries the guardrail");
    t.ok(!systemContent.includes("SECRET_KNOWLEDGE_ABC"), "knowledge never sent to the model");
    t.ok(!systemContent.includes("SECRET_WITHHOLD_DEF"), "withholds never sent to the model");
  } finally {
    globalThis.fetch = realFetch;
    if (realKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = realKey;
  }

  // findStakeholder resolves by id.
  t.eq(findStakeholder({ stakeholders: [stakeholder] } as never, stakeholder.id)?.id, stakeholder.id, "findStakeholder resolves");

  // ---------------------------------------------------------------------------
  // SIM-07: outage policy
  // ---------------------------------------------------------------------------
  t.eq(evaluateOutage({ degraded: false, consecutiveDegraded: 3, outageAlreadyOpen: false }).action, "none", "healthy reply resets");
  const d1 = evaluateOutage({ degraded: true, consecutiveDegraded: 2, outageAlreadyOpen: false });
  t.eq(d1.action, "fallback_only", "below threshold -> scripted fallback only");
  // consecutiveDegraded includes the current attempt.
  const d2 = evaluateOutage({ degraded: true, consecutiveDegraded: OUTAGE_CONSECUTIVE_THRESHOLD, outageAlreadyOpen: false });
  t.eq(d2.action, "declare_outage", "threshold reached -> declare outage");
  t.eq(d2.consecutiveDegraded, OUTAGE_CONSECUTIVE_THRESHOLD, "consecutive count includes the current attempt");
  t.ok(d2.extensionMs > 0, "outage declaration carries a deadline extension");
  const d3 = evaluateOutage({ degraded: true, consecutiveDegraded: 99, outageAlreadyOpen: true });
  t.eq(d3.action, "fallback_only", "no double-declare while outage is open");

  // Route-realistic ordering: every degraded redraft attempt writes
  // message_received (the authored fallback reply) immediately before
  // teammate_service_degraded. The authored fallbacks are part of the
  // degraded cycle and must NOT reset the streak — otherwise the threshold
  // could never be reached in production.
  const routeEvents = [
    { event_type: "message_received", created_at: "2026-09-27T10:01:00Z", payload: { source: "authored" } },
    { event_type: "teammate_service_degraded", created_at: "2026-09-27T10:01:01Z" },
    { event_type: "message_received", created_at: "2026-09-27T10:02:00Z", payload: { source: "authored" } },
    { event_type: "teammate_service_degraded", created_at: "2026-09-27T10:02:01Z" },
  ];
  t.eq(countConsecutiveDegraded(routeEvents), 2, "authored fallback replies do not reset the streak");
  const withHealthy = [
    ...routeEvents,
    { event_type: "message_received", created_at: "2026-09-27T10:03:00Z", payload: { source: "ai_redraft" } },
    { event_type: "teammate_service_degraded", created_at: "2026-09-27T10:03:01Z" },
  ];
  t.eq(countConsecutiveDegraded(withHealthy), 1, "a healthy ai_redraft reply resets the streak");
  // Stale snapshot hazard: the route records the degraded event first, then
  // counts on the refreshed trail, so the current attempt is included.
  const includingCurrent = [
    ...routeEvents,
    { event_type: "message_received", created_at: "2026-09-27T10:03:00Z", payload: { source: "authored" } },
    { event_type: "teammate_service_degraded", created_at: "2026-09-27T10:03:01Z" },
  ];
  const streakNow = countConsecutiveDegraded(includingCurrent);
  t.eq(
    evaluateOutage({ degraded: true, consecutiveDegraded: streakNow, outageAlreadyOpen: false }).action,
    "fallback_only",
    "3-attempt streak stays below threshold (no premature outage)"
  );
  t.eq(outageIsOpen([{ event_type: "teammate_service_outage", created_at: "2026-09-27T10:04:00Z" }]), true, "outage open detected");
  t.eq(
    outageIsOpen([
      { event_type: "teammate_service_recovered", created_at: "2026-09-27T10:05:00Z" },
      { event_type: "teammate_service_outage", created_at: "2026-09-27T10:04:00Z" },
    ]),
    false,
    "recovery closes the outage"
  );

  // Scoring guarantee: outage + candidate asked -> floor, never a silence penalty.
  t.eq(stakeholderQualityFloor({ outageRecorded: true, candidateSentMessage: true }), 0.5, "outage floor 0.5 when candidate asked");
  t.eq(stakeholderQualityFloor({ outageRecorded: false, candidateSentMessage: true }), 0, "no outage -> normal scoring");
  t.eq(stakeholderQualityFloor({ outageRecorded: true, candidateSentMessage: false }), 0, "no question asked -> no floor");

  process.exit(t.summary());
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
