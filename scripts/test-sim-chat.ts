/**
 * Chat + AI coworker contract tests (no database, no network).
 *
 * Covers:
 *  - buildSessionChatContext: grounded session facts from state + events
 *  - selectAuthoredReply: context-gated rules, interpolation, onceOnly, curveball gating
 *  - proactive engine: triggers, unless-blocks, onceOnly, idempotent delivery
 *  - validateSimulationContent: proactive definition checks
 *
 * Run with: npx tsx --conditions react-server scripts/test-sim-chat.ts
 */
import {
  buildSessionChatContext,
  describeSessionContext,
  toChatEvents,
  type ChatContextInput,
  type SessionChatContext,
} from "../src/lib/simulations/chat-context";
import {
  selectAuthoredReply,
  interpolateReply,
  type ReplyContext,
} from "../src/lib/simulations/stakeholder";
import {
  evaluateProactiveMessages,
  deliverDueProactiveMessages,
  isProactiveDue,
} from "../src/lib/simulations/proactive";
import {
  validateSimulationContent,
  type ProactiveMessageDef,
  type SimulationContent,
  type SimulationStakeholder,
} from "../src/lib/simulations/types";
import { validateMicroSim } from "../src/lib/simulations/micro-types";
import { MICRO_OPS_YIELD } from "../src/lib/simulations/content/micro-ops-yield";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

function baseInput(over: Partial<ChatContextInput> = {}): ChatContextInput {
  return {
    startedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    curveballPresentedAt: null,
    deliverable: {},
    workspace: {},
    completedTaskIds: [],
    events: [],
    ...over,
  };
}
function replyCtx(chat: SessionChatContext, over: Partial<ReplyContext> = {}): ReplyContext {
  return { curveballPresented: chat.curveballPresented, usedRuleIds: chat.usedRuleIds, chat, ...over };
}

// ---------------------------------------------------------------------------
// chat context
// ---------------------------------------------------------------------------
console.log("buildSessionChatContext");
{
  const ctx = buildSessionChatContext(baseInput());
  check("elapsedMinutes ~12", ctx.elapsedMinutes >= 11 && ctx.elapsedMinutes <= 13, `got ${ctx.elapsedMinutes}`);
  check("no curveball -> minutesSinceCurveball null", ctx.minutesSinceCurveball === null);
  check("curveballPresented false", ctx.curveballPresented === false);
}
{
  const ctx = buildSessionChatContext(
    baseInput({
      startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      curveballPresentedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      deliverable: { q1: "an answer", q2: "", q3: ["a", "b"], q4: 0 },
      workspace: {
        openedResources: ["r1"],
        flaggedRows: { t1: ["a", "b"], t2: ["c"] },
      },
      completedTaskIds: ["t1"],
      events: toChatEvents([
        { event_type: "resource_opened", actor: "candidate", resource_id: "r2", task_id: null, payload: {} },
        { event_type: "deliverable_field_edited", actor: "candidate", resource_id: null, task_id: null, payload: { field: "q9" } },
        { event_type: "task_completed", actor: "candidate", resource_id: null, task_id: "t9", payload: {} },
        { event_type: "message_sent", actor: "candidate", resource_id: null, task_id: null, payload: {} },
        { event_type: "message_received", actor: "stakeholder", resource_id: null, task_id: null, payload: { ruleId: "rel_x" } },
        { event_type: "proactive_message_delivered", actor: "stakeholder", resource_id: null, task_id: null, payload: { proactiveId: "welc" } },
      ]),
    })
  );
  check("minutesSinceCurveball ~5", ctx.minutesSinceCurveball !== null && ctx.minutesSinceCurveball >= 4 && ctx.minutesSinceCurveball <= 6, `got ${ctx.minutesSinceCurveball}`);
  check("curveballPresented true", ctx.curveballPresented === true);
  check(
    "answeredQuestionIds unions deliverable + edit events",
    ["q1", "q3", "q4", "q9"].every((q) => ctx.answeredQuestionIds.includes(q)) &&
      !ctx.answeredQuestionIds.includes("q2"),
    ctx.answeredQuestionIds.join(",")
  );
  check(
    "openedResourceIds unions workspace + events",
    ctx.openedResourceIds.includes("r1") && ctx.openedResourceIds.includes("r2"),
    ctx.openedResourceIds.join(",")
  );
  check("flaggedRowCount sums", ctx.flaggedRowCount === 3, `got ${ctx.flaggedRowCount}`);
  check(
    "completedTaskIds unions state + events",
    ctx.completedTaskIds.includes("t1") && ctx.completedTaskIds.includes("t9"),
    ctx.completedTaskIds.join(",")
  );
  check("candidateMessageCount counts message_sent", ctx.candidateMessageCount === 1);
  check("usedRuleIds from message_received", ctx.usedRuleIds.join(",") === "rel_x");
  check("usedProactiveIds from delivery events", ctx.usedProactiveIds.join(",") === "welc");
}
{
  const ctx = buildSessionChatContext(baseInput({ startedAt: null }));
  check("not started -> elapsed 0", ctx.elapsedMinutes === 0);
  const lines = describeSessionContext(ctx);
  check("describeSessionContext is facts-only", lines.every((l) => !/answer key|rubric/i.test(l)));
}

// ---------------------------------------------------------------------------
// stakeholder reply selection
// ---------------------------------------------------------------------------
console.log("\nselectAuthoredReply");
const STAKE: SimulationStakeholder = {
  id: "s1",
  name: "Test Lead",
  role: "Lead",
  blurb: "b",
  knowledge: [],
  withholds: [],
  responseRules: [
    {
      id: "gated",
      priority: 10,
      anyKeywords: ["context"],
      requires: { answeredQuestion: "q1", minElapsedMinutes: 5 },
      reply: "gated reply: {answeredCount} answer(s), {elapsedMinutes} min in",
    },
    { id: "cb", priority: 8, anyKeywords: ["change"], requiresCurveball: true, reply: "curveball reply" },
    { id: "once", priority: 7, anyKeywords: ["once"], onceOnly: true, reply: "once reply" },
    { id: "kw", priority: 5, anyKeywords: ["hello"], reply: "hi there" },
  ],
  fallbackReply: "fallback {unknownToken} {answeredCount}",
};
{
  const chat = buildSessionChatContext(baseInput());
  const r = selectAuthoredReply(STAKE, "give me context please", replyCtx(chat));
  check("gated rule blocked before answering -> fallback", r.ruleId === null && r.reply.startsWith("fallback"), r.reply);
  check("fallback leaves unknown tokens untouched", r.reply.includes("{unknownToken}"), r.reply);
  check("fallback interpolates known tokens", /\d+/.test(r.reply), r.reply);
}
{
  const chat = buildSessionChatContext(baseInput({ deliverable: { q1: "x" } }));
  const r = selectAuthoredReply(STAKE, "give me context please", replyCtx(chat));
  check("gated rule fires once conditions met", r.ruleId === "gated", r.reply);
  check("gated reply interpolates answeredCount=1", r.reply.includes("1 answer(s)"), r.reply);
  check("gated reply interpolates elapsedMinutes", /1[12] min in/.test(r.reply), r.reply);
}
{
  const chat = buildSessionChatContext(baseInput({ deliverable: { q1: "x" } }));
  const r = selectAuthoredReply(STAKE, "context again", replyCtx(chat, { usedRuleIds: ["gated"] }));
  check("non-onceOnly rule may fire again", r.ruleId === "gated");
  const r2 = selectAuthoredReply(STAKE, "say once more", replyCtx(chat, { usedRuleIds: ["once"] }));
  check("onceOnly rule blocked after firing", r2.ruleId === null, r2.reply);
}
{
  const chat = buildSessionChatContext(baseInput());
  const pre = selectAuthoredReply(STAKE, "what changed?", replyCtx(chat));
  check("requiresCurveball rule blocked pre-curveball", pre.ruleId === null, pre.reply);
  const post = selectAuthoredReply(
    STAKE,
    "what changed?",
    replyCtx(chat, { curveballPresented: true })
  );
  check("requiresCurveball rule fires post-curveball", post.ruleId === "cb", post.reply);
}
{
  const chat = buildSessionChatContext(baseInput());
  check("interpolateReply keeps unknown tokens", interpolateReply("a {nope} b", chat) === "a {nope} b");
  check(
    "interpolateReply replaces messageCount/eventCount",
    interpolateReply("{messageCount}/{eventCount}", chat) === "0/0"
  );
}

// ---------------------------------------------------------------------------
// proactive engine
// ---------------------------------------------------------------------------
console.log("\nproactive engine");
const DEFS: ProactiveMessageDef[] = [
  { id: "welcome", trigger: { kind: "session_start" }, body: "welcome!" },
  { id: "nudge", trigger: { kind: "elapsed_minutes", minutes: 10 }, body: "nudge at {elapsedMinutes}" },
  { id: "first_answer", trigger: { kind: "answered_question", questionId: "q1" }, body: "answered!" },
  { id: "busy", trigger: { kind: "candidate_events", count: 3 }, body: "busy!" },
  { id: "cb_follow", trigger: { kind: "curveball_presented" }, body: "after cb" },
  { id: "cb_late", trigger: { kind: "curveball_elapsed_minutes", minutes: 2 }, body: "late cb" },
  {
    id: "smart_nudge",
    trigger: { kind: "elapsed_minutes", minutes: 5 },
    unless: { openedResource: "r_doc" },
    body: "smart nudge",
  },
];
const PSH: SimulationStakeholder = { ...STAKE, proactiveMessages: DEFS };
const PCONTENT = { stakeholders: [PSH] } as unknown as SimulationContent;
{
  const chat = buildSessionChatContext(baseInput({ startedAt: new Date(Date.now() - 6 * 60000).toISOString() }));
  check("session_start due immediately", isProactiveDue(DEFS[0], chat));
  check("elapsed trigger not due early", !isProactiveDue(DEFS[1], chat));
  check("smart_nudge due before doc opened", isProactiveDue(DEFS[6], chat));
  const due = evaluateProactiveMessages(PCONTENT, chat, []);
  const dueIds = due.map((d) => d.def.id).sort();
  check("welcome + smart_nudge due at t=6", JSON.stringify(dueIds) === JSON.stringify(["smart_nudge", "welcome"]), dueIds.join(","));
}
{
  const chat = buildSessionChatContext(
    baseInput({
      deliverable: { q1: "x" },
      workspace: { openedResources: ["r_doc"] },
      events: toChatEvents([
        { event_type: "resource_opened", actor: "candidate", resource_id: "x", task_id: null, payload: {} },
        { event_type: "resource_opened", actor: "candidate", resource_id: "y", task_id: null, payload: {} },
        { event_type: "resource_opened", actor: "candidate", resource_id: "z", task_id: null, payload: {} },
      ]),
    })
  );
  check("elapsed trigger due after 10 min", isProactiveDue(DEFS[1], chat));
  check("answered_question due", isProactiveDue(DEFS[2], chat));
  check("candidate_events due at 3", isProactiveDue(DEFS[3], chat));
  check("unless blocks smart_nudge after doc opened", !isProactiveDue(DEFS[6], chat));
  const due = evaluateProactiveMessages(PCONTENT, chat, ["welcome"]);
  const ids = due.map((d) => d.def.id).sort();
  check(
    "due set excludes used + blocked",
    JSON.stringify(ids) === JSON.stringify(["busy", "first_answer", "nudge"]),
    ids.join(",")
  );
  const interpolated = due.find((d) => d.def.id === "nudge")!;
  check("proactive body interpolated", /1[12]/.test(interpolated.body), interpolated.body);
}
{
  const chat = buildSessionChatContext(
    baseInput({ curveballPresentedAt: new Date(Date.now() - 3 * 60000).toISOString() })
  );
  check("curveball_presented due", isProactiveDue(DEFS[4], chat));
  check("curveball_elapsed_minutes due after 2", isProactiveDue(DEFS[5], chat));
  const early = buildSessionChatContext(baseInput({ curveballPresentedAt: new Date().toISOString() }));
  check("curveball_elapsed_minutes not due immediately", !isProactiveDue(DEFS[5], early));
}
console.log("\ndeliverDueProactiveMessages (idempotent)");
async function deliveryTests() {
  const chat = buildSessionChatContext(baseInput({ startedAt: new Date().toISOString() }));
  const inserted: { clientMsgId: string; body: string }[] = [];
  const recorded: string[] = [];
  const deps = {
    sessionId: "s1",
    content: PCONTENT,
    ctx: chat,
    insertMessage: async (input: { clientMsgId: string; body: string }) => {
      inserted.push({ clientMsgId: input.clientMsgId, body: input.body });
      return { duplicate: false };
    },
    recordEvent: async (input: { clientEventId: string }) => {
      recorded.push(input.clientEventId);
      return {};
    },
  };
  const n1 = await deliverDueProactiveMessages(deps);
  check("first delivery sends welcome", n1 === 1 && inserted[0].clientMsgId === "proactive_welcome", `${n1} ${inserted[0]?.clientMsgId}`);
  // Simulate the route rebuilding context from fresh events (delivery recorded).
  const chat2 = buildSessionChatContext(
    baseInput({
      startedAt: new Date().toISOString(),
      events: toChatEvents([
        {
          event_type: "proactive_message_delivered",
          actor: "stakeholder",
          resource_id: null,
          task_id: null,
          payload: { proactiveId: "welcome" },
        },
      ]),
    })
  );
  const n2 = await deliverDueProactiveMessages({ ...deps, ctx: chat2 });
  check("second delivery is a no-op (idempotent)", n2 === 0 && inserted.length === 1, `n2=${n2}`);
  check("delivery recorded an event", recorded.includes("proactive_evt_welcome"));
}

async function main() {
  await deliveryTests();

// ---------------------------------------------------------------------------
// content validation
// ---------------------------------------------------------------------------
console.log("\nvalidateMicroSim (proactive)");
{
  const errors = validateMicroSim(MICRO_OPS_YIELD);
  check("flagship content validates", errors.length === 0, errors.join("; "));
  const jordan = MICRO_OPS_YIELD.stakeholders.find((s) => s.id === "jordan")!;
  check("jordan has proactive messages", (jordan.proactiveMessages || []).length >= 3, String(jordan.proactiveMessages?.length));
}
{
  const dup = JSON.parse(JSON.stringify(MICRO_OPS_YIELD)) as typeof MICRO_OPS_YIELD;
  const j = dup.stakeholders.find((s) => s.id === "jordan")!;
  j.proactiveMessages = [
    { id: "dup", trigger: { kind: "session_start" }, body: "a" },
    { id: "dup", trigger: { kind: "session_start" }, body: "b" },
  ];
  const errors = validateMicroSim(dup);
  check("duplicate proactive ids flagged", errors.some((e) => /Duplicate proactive id dup/.test(e)), errors.join("; "));
}
{
  const empty = JSON.parse(JSON.stringify(MICRO_OPS_YIELD)) as typeof MICRO_OPS_YIELD;
  const je = empty.stakeholders.find((s) => s.id === "jordan")!;
  je.proactiveMessages = [{ id: "blank", trigger: { kind: "session_start" }, body: "   " }];
  check(
    "empty proactive body flagged",
    validateMicroSim(empty).some((e) => /empty body/.test(e))
  );
}
{
  // Full-sim validator also guards proactive defs.
  const dupDef = { id: "dup", trigger: { kind: "session_start" }, body: "a" };
  const full = {
    slug: "x",
    title: "t",
    mission: "m",
    tasks: [{ id: "t1" }, { id: "t2" }, { id: "t3" }, { id: "t4" }],
    resources: [1, 2, 3, 4, 5, 6].map((i) => ({ id: `r${i}`, content: "c" })),
    stakeholders: [
      { id: "jordan", fallbackReply: "f", responseRules: [], proactiveMessages: [dupDef, { ...dupDef, body: "b" }] },
      { id: "s2", fallbackReply: "f", responseRules: [] },
    ],
    curveball: { stakeholderId: "jordan" },
    deliverableFields: [{ key: "q1" }],
    answerKey: { validAlternatives: ["a"] },
    competencies: [{ key: "c1", weight: 1 }],
    deterministicChecks: [],
    rubricIndicators: [],
  } as unknown as SimulationContent;
  const errors = validateSimulationContent(full);
  check(
    "full validator flags duplicate proactive ids",
    errors.some((e) => /duplicate proactive id dup/.test(e)),
    errors.join("; ")
  );
}

console.log(failures === 0 ? "\nAll sim-chat contract tests passed." : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
}

void main();
