/**
 * Simulated teammates, scenario events, the coding assistant and the
 * communication evidence for authored simulations. Pure rules only: no model
 * calls and no database.
 *
 * Run: npx tsx --conditions react-server scripts/test-collaboration.ts
 */
import assert from "node:assert/strict";
import type { Coworker, ScenarioPackage } from "../src/lib/eng/authoring/package";
import {
  assistantContext,
  assistantEnabled,
  betterTeammate,
  checkAssistantOutput,
  checkTeammateDraft,
  eventDisclosure,
  factRelevance,
  initialContextMessage,
  messageView,
  relevantFacts,
  reviewQuestionDue,
  scenarioNotesReply,
  teammatePrompt,
  validReviewQuestion,
  ASSISTANT_CONTEXT_CHAR_BUDGET,
  type Fact,
} from "../src/lib/eng/authored/collaboration-core";
import { buildCommunicationEvidence, summarizeAssistantUse } from "../src/lib/eng/authored/collaboration-evidence";
import type { AssistantInteractionView, TeamMessageView } from "../src/lib/eng/authored/collaboration-types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const lead: Coworker = {
  id: "lead",
  name: "Dana Ortiz",
  title: "Engineering lead",
  responsibilities: "Owns the payments service and its delivery contract.",
  topics: ["delivery contract", "retry policy", "deployment constraints"],
  tone: "direct",
  boundaries: "Does not know customer incident details.",
};
const support: Coworker = {
  id: "support",
  name: "Sam Lee",
  title: "Support engineer",
  responsibilities: "Handles merchant escalations.",
  topics: ["customer impact", "incident timeline", "duplicate charges"],
  tone: "friendly",
  boundaries: "Does not know the code.",
};

const pkg = {
  brief: { title: "Prevent duplicate webhook processing", task: "Make the receiver process each event once.", constraints: ["Keep the public interface"] },
  coworkers: [lead, support],
  aiPolicy: { id: "assistants_disclosed", candidateText: "AI assistants are allowed; disclose use." },
  reviewQuestion: { coworkerId: "lead", text: "What happens to an event that arrives while the worker restarts — is it processed twice?" },
} as unknown as ScenarioPackage;

const leadFacts: Fact[] = [
  { id: "lead.retries", text: "The provider retries a webhook up to 5 times over 24 hours with the same event id.", topics: ["retry policy", "retries", "same event id"] },
  { id: "lead.restart", text: "Workers restart during every deploy, roughly twice a day.", topics: ["deploy", "restart"] },
];
const supportFacts: Fact[] = [{ id: "support.impact", text: "Three merchants reported customers charged twice last week.", topics: ["customer impact", "charged twice"] }];

function msg(over: Partial<TeamMessageView> & Pick<TeamMessageView, "id" | "seq" | "sender" | "body">): TeamMessageView {
  return { teammateId: null, toTeammateId: null, createdAt: "2026-10-07T10:00:00Z", kind: "message", eventKey: null, answeredFrom: null, ...over };
}

function main() {
  test("topic phrases decide disclosure, not single shared words", () => {
    assert.ok(factRelevance("How many retries does the provider send?", leadFacts[0]) > 0);
    assert.ok(factRelevance("Do events keep the same event id across retries?", leadFacts[0]) > 0);
    assert.equal(factRelevance("What's the event schema?", leadFacts[0]), 0);
    assert.equal(factRelevance("hello", leadFacts[1]), 0);
    assert.deepEqual(relevantFacts("Do workers restart when we deploy?", leadFacts).map((f) => f.id), ["lead.restart"]);
  });

  test("facts without topics need two distinctive overlapping words", () => {
    const f: Fact = { id: "x", text: "The ledger table has a unique index on transaction reference." };
    assert.equal(factRelevance("Is there an index?", f), 0);
    assert.ok(factRelevance("Does the ledger have a unique index?", f) > 0);
  });

  test("scenario-notes reply discloses only matching facts of the addressed teammate", () => {
    const r = scenarioNotesReply(lead, [lead, support], leadFacts, "What is the retry policy?", []);
    assert.deepEqual(r.factIds, ["lead.retries"]);
    assert.match(r.body, /5 times/);
    const none = scenarioNotesReply(lead, [lead, support], leadFacts, "How many customers were charged twice?", []);
    assert.deepEqual(none.factIds, []);
    assert.match(none.body, /Sam would know more/);
    assert.doesNotMatch(none.body, /Three merchants/);
  });

  test("reply to a review question is acknowledged neutrally", () => {
    const r = scenarioNotesReply(lead, [lead, support], leadFacts, "The insert is idempotent so a replay is ignored.", [
      { sender: "teammate", teammateId: "lead", body: "What happens on restart?", eventKey: "review_question" },
    ]);
    assert.equal(r.body, "Thanks for explaining. That answers my question.");
    const onTopic = scenarioNotesReply(lead, [lead, support], leadFacts, "After a restart the retry finds the stored event id, so it is not processed again.", [
      { sender: "teammate", teammateId: "lead", body: "What happens on restart?", eventKey: "review_question" },
    ]);
    assert.deepEqual(onTopic.factIds, []);
    const followUp = scenarioNotesReply(lead, [lead, support], leadFacts, "Do workers restart on every deploy?", [
      { sender: "teammate", teammateId: "lead", body: "What happens on restart?", eventKey: "review_question" },
    ]);
    assert.deepEqual(followUp.factIds, ["lead.restart"]);
  });

  test("betterTeammate points by public topics only", () => {
    assert.equal(betterTeammate("What was the customer impact?", lead, [lead, support])?.id, "support");
    assert.equal(betterTeammate("What colour is the logo?", lead, [lead, support]), null);
  });

  test("teammate prompt contains only the addressed teammate's facts", () => {
    const messages = teammatePrompt(pkg, lead, leadFacts, [{ sender: "candidate", teammateId: "support", body: "secret to sam", eventKey: null }], "Retry policy?");
    const all = messages.map((m) => m.content).join("\n");
    assert.match(all, /lead\.retries/);
    assert.doesNotMatch(all, /Three merchants/);
    assert.doesNotMatch(all, /secret to sam/);
    assert.match(all, /Never write code/);
  });

  const prot = {
    reference: { files: [{ path: "app/receiver.py", content: "    cursor.execute('INSERT OR IGNORE INTO processed_events (event_id) VALUES (?)', (event_id,))\n" }], approaches: [] },
    protectedTests: [{ path: "tests/test_hidden.py", content: "def test_concurrent_duplicate_deliveries_are_processed_once():\n    pass\n" }],
    protectedTestRefs: [{ name: "test_concurrent_duplicate_deliveries_are_processed_once", file: "tests/test_hidden.py", criterionIds: [] }],
  };

  test("draft checks reject unknown facts, code, reference text and hidden test names", () => {
    assert.equal(checkTeammateDraft({ reply: "Up to five retries.", factIds: ["lead.retries"] }, leadFacts, prot).ok, true);
    assert.deepEqual(checkTeammateDraft({ reply: "Three merchants complained.", factIds: ["support.impact"] }, leadFacts, prot), { ok: false, reason: "unknown_fact" });
    assert.deepEqual(checkTeammateDraft({ reply: "Try ```python\nx```", factIds: [] }, leadFacts, prot), { ok: false, reason: "code" });
    assert.deepEqual(
      checkTeammateDraft({ reply: "Use cursor.execute('INSERT OR IGNORE INTO processed_events (event_id) VALUES (?)', (event_id,)) there.", factIds: [] }, leadFacts, prot),
      { ok: false, reason: "protected_text" },
    );
    assert.deepEqual(checkTeammateDraft({ reply: "Check test_concurrent_duplicate_deliveries_are_processed_once.", factIds: [] }, leadFacts, prot), { ok: false, reason: "protected_test_name" });
    const dashed = checkTeammateDraft({ reply: "Five retries \u2014 same id.", factIds: [] }, leadFacts, prot);
    assert.ok(dashed.ok && !dashed.body.includes("\u2014"));
  });

  test("planned events: kickoff names both teammates, review question validated, no dashes", () => {
    const kickoff = initialContextMessage(pkg);
    assert.ok(kickoff);
    assert.equal(kickoff.coworker.id, "lead");
    assert.match(kickoff.body, /Sam Lee/);
    assert.match(kickoff.body, /won't change/);
    const review = validReviewQuestion(pkg);
    assert.ok(review && !review.text.includes("\u2014"));
    assert.equal(validReviewQuestion({ ...pkg, reviewQuestion: { coworkerId: "ghost", text: "x" } } as ScenarioPackage), null);
    assert.match(eventDisclosure(pkg), /may ask one question/);
    assert.match(eventDisclosure(pkg), /not scored/);
  });

  test("review question falls due at 70% of the time", () => {
    const start = "2026-10-07T10:00:00Z";
    const due = new Date("2026-10-07T11:00:00Z");
    assert.equal(reviewQuestionDue(start, due, new Date("2026-10-07T10:30:00Z")), false);
    assert.equal(reviewQuestionDue(start, due, new Date("2026-10-07T10:43:00Z")), true);
    assert.equal(reviewQuestionDue(null, due), false);
  });

  test("message view labels provenance honestly", () => {
    const base = { id: "1", seq: 1, sender: "teammate" as const, teammate_id: "lead", body: "x", created_at: "2026-10-07T10:00:00Z" };
    assert.equal(messageView({ ...base, rule_id: "gen:lead.retries" }).answeredFrom, "model");
    assert.equal(messageView({ ...base, rule_id: "notes:none" }).answeredFrom, "scenario_notes");
    const ev = messageView({ ...base, rule_id: "event:review_question" });
    assert.equal(ev.kind, "scenario_event");
    assert.equal(ev.eventKey, "review_question");
    assert.equal(ev.answeredFrom, null);
    const cand = messageView({ ...base, sender: "candidate", rule_id: null });
    assert.equal(cand.toTeammateId, "lead");
    assert.equal(cand.teammateId, null);
  });

  test("assistant availability follows the AI policy", () => {
    assert.equal(assistantEnabled("assistants_disclosed"), true);
    assert.equal(assistantEnabled("any_tools"), true);
    assert.equal(assistantEnabled("no_assistants"), false);
    assert.equal(assistantEnabled("custom"), false);
  });

  test("assistant context respects the budget and marks truncation", () => {
    const big = { path: "a.py", content: "x".repeat(ASSISTANT_CONTEXT_CHAR_BUDGET + 500) };
    const ctx = assistantContext([big, { path: "b.py", content: "y" }]);
    assert.deepEqual(ctx.truncated, ["a.py", "b.py"]);
    assert.ok(ctx.text.length < ASSISTANT_CONTEXT_CHAR_BUDGET + 200);
  });

  test("assistant output: patches limited to shared files, pass claims annotated", () => {
    const shared = [{ path: "app/receiver.py", content: "old" }];
    const ok = checkAssistantOutput({ answer: "All tests should pass now.", patch: [{ path: "app/receiver.py", content: "new" }] }, shared);
    assert.ok(ok.ok);
    assert.equal(ok.patch.length, 1);
    assert.match(ok.answer, /cannot run tests/);
    assert.deepEqual(checkAssistantOutput({ answer: "x", patch: [{ path: "tests/test_x.py", content: "y" }] }, shared), { ok: false, reason: "patch_outside_context" });
    const same = checkAssistantOutput({ answer: "No change needed.", patch: [{ path: "app/receiver.py", content: "old" }] }, shared);
    assert.ok(same.ok && same.patch.length === 0);
  });

  test("collaboration evidence: seven task-relevant behaviours, each observation linked to its source", () => {
    const review = msg({ id: "r", seq: 3, sender: "teammate", teammateId: "lead", body: "What happens on restart?", kind: "scenario_event", eventKey: "review_question" });
    const items = buildCommunicationEvidence({
      hasTeammates: true,
      messages: [
        msg({ id: "a", seq: 1, sender: "candidate", toTeammateId: "lead", body: "Does the provider reuse the event id on retries?" }),
        msg({ id: "b", seq: 2, sender: "teammate", teammateId: "lead", body: "Yes.", answeredFrom: "model" }),
        review,
        msg({ id: "c", seq: 4, sender: "candidate", toTeammateId: "lead", body: "The insert is atomic, so a replay after restart is ignored." }),
      ],
      handoff: [
        { id: "what_changed", label: "What did you change?", answer: "Record event ids in receiver.py in the same transaction rather than after, because a crash between them double credits." },
        { id: "how_checked", label: "How did you check it?", answer: "Ran the public tests; the duplicate delivery test failed before and passes now." },
        { id: "unresolved", label: "What remains unresolved?", answer: "" },
      ],
      submitted: true,
    });
    const by = Object.fromEntries(items.map((i) => [i.behavior, i]));
    assert.deepEqual(Object.keys(by).sort(), ["blocker", "clarification", "decision", "feedback", "handoff", "new_information", "uncertainty"]);
    assert.equal(by.clarification.state, "observed");
    assert.deepEqual(by.clarification.excerpts.map((e) => e.ref), [{ kind: "team_message", messageId: "a", seq: 1 }, { kind: "team_message", messageId: "b", seq: 2 }]);
    assert.equal(by.decision.state, "observed");
    assert.deepEqual(by.decision.excerpts[0].ref, { kind: "handoff", promptId: "what_changed" });
    assert.equal(by.feedback.state, "observed");
    assert.equal(by.handoff.state, "observed");
    assert.match(by.handoff.summary, /2 of 3/);
    assert.equal(by.blocker.state, "not_assessed", "nothing blocked the work, so there was no opportunity");
    assert.equal(by.new_information.state, "not_assessed", "the scenario introduced no new information");
    assert.equal(by.uncertainty.state, "not_observed", "the open-risks question was asked and left empty");
    for (const i of items) for (const e of i.excerpts) assert.ok(e.ref, `${i.behavior} excerpt has a source link`);
    assert.equal(by.handoff.opportunities, 3, "each handoff prompt is one opportunity");
    assert.equal(by.clarification.opportunities, 1);
    assert.equal(by.feedback.opportunities, 1, "one review question was asked");
    assert.equal(by.new_information.opportunities, 0, "no new information was introduced");
    for (const i of items) if (i.state === "observed") assert.ok(i.opportunities >= 1, `${i.behavior} observed with an opportunity`);

    const quiet = buildCommunicationEvidence({ hasTeammates: true, messages: [], handoff: null, submitted: false });
    const q = Object.fromEntries(quiet.map((i) => [i.behavior, i]));
    assert.equal(q.clarification.state, "not_assessed", "not asking a question is never a negative finding");
    assert.equal(q.feedback.state, "not_assessed");
    assert.equal(q.handoff.state, "not_assessed");
    assert.equal(q.handoff.opportunities, 0);
    for (const i of quiet) assert.notEqual(i.state, "not_observed", "an unsubmitted, silent attempt has no negative findings");
    for (const i of [...quiet, ...items]) assert.ok(!/\b(score|weak|poor|bad|concern|personality|culture|attitude|confident)\b/i.test(`${i.summary} ${i.limits}`), i.behavior);
  });

  test("collaboration evidence: brevity and volume are not counted; platform faults are not the candidate's", () => {
    const brief = buildCommunicationEvidence({
      hasTeammates: true,
      messages: [],
      handoff: [
        { id: "what_changed", label: "What did you change?", answer: "Keyed dedupe on event id since retries get a new delivery id." },
        { id: "unresolved", label: "What remains unresolved?", answer: "Assumes one SQLite file." },
      ],
      submitted: true,
      technicalIssues: [{ at: "2026-10-09T10:00:00Z" }],
    });
    const b = Object.fromEntries(brief.map((i) => [i.behavior, i]));
    assert.equal(b.decision.state, "observed", "a one-line reason counts the same as a long one");
    assert.equal(b.uncertainty.state, "observed");
    assert.equal(b.clarification.state, "not_assessed");
    assert.equal(b.blocker.state, "not_assessed", "a platform fault the candidate did not report is not held against them");
    assert.match(b.blocker.summary, /platform fault, not a candidate result/);

    const chatty = buildCommunicationEvidence({
      hasTeammates: true,
      messages: Array.from({ length: 12 }, (_, i) => msg({ id: `m${i}`, seq: i + 1, sender: "candidate", toTeammateId: "lead", body: `Note ${i}` })),
      handoff: null,
      submitted: false,
    });
    const c = Object.fromEntries(chatty.map((i) => [i.behavior, i]));
    assert.equal(c.clarification.state, "not_assessed", "many messages without a question earn nothing extra");
    const blocked = buildCommunicationEvidence({
      hasTeammates: true,
      messages: [msg({ id: "x", seq: 1, sender: "candidate", toTeammateId: "lead", body: "I'm blocked: the public tests keep timing out on the runner." })],
      handoff: null,
      submitted: false,
    });
    assert.equal(blocked.find((i) => i.behavior === "blocker")?.state, "observed");
  });

  test("assistant use summary tracks accepted patches into the submission", () => {
    const base: AssistantInteractionView = {
      id: "1", seq: 1, prompt: "fix it", contextPaths: ["a.py"], status: "answered", answer: "", patch: [{ path: "a.py", content: "A" }],
      decision: "accepted", decidedAt: null, appliedRevision: 3, createdAt: "2026-10-07T10:00:00Z",
    };
    const s = summarizeAssistantUse(
      [base, { ...base, id: "2", seq: 2, patch: [{ path: "b.py", content: "B" }] }, { ...base, id: "3", seq: 3, decision: "rejected" }, { ...base, id: "4", seq: 4, patch: null, decision: "none", status: "limit_reached" }],
      [{ path: "a.py", content: "A" }, { path: "b.py", content: "B2" }],
    );
    assert.equal(s.requests, 3);
    assert.equal(s.accepted, 2);
    assert.equal(s.rejected, 1);
    assert.equal(s.retainedUnchanged, 1);
    assert.equal(s.items[1].submittedAs, "modified_after");
  });

  console.log(`\n${passed} collaboration tests passed`);
}

main();
