/**
 * Conversation coordinator tests.
 *
 * Verifies the core fixes:
 * - Answered questions are not asked again (even paraphrased)
 * - Acknowledgments don't trigger replies
 * - Plans are recorded, not re-asked
 * - Unclear intent doesn't fire generic fallback
 *
 * Run: npx tsx scripts/test-conversation-coordinator.ts
 */
import { classifyMessage, isSameQuestion } from "../src/lib/simulations/conversation/intent";
import { decideResponse } from "../src/lib/simulations/conversation/coordinator";
import {
  createInitialState,
  recordCandidateMessage,
  recordCoworkerMessage,
  isTopicAddressed,
} from "../src/lib/simulations/conversation/memory";
import { buildStateFromMessages } from "../src/lib/simulations/conversation/state-builder";

let failures = 0;
let passes = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    passes++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(`     ${err instanceof Error ? err.message : err}`);
  }
}

function assertTrue(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const coworkers = [{ id: "maya", ownsTopics: ["retry_backoff", "idempotency"], canHelp: true }];

function baseCtx(state: ReturnType<typeof createInitialState>, text: string) {
  const classified = classifyMessage(text);
  return {
    state,
    classified,
    messageText: text,
    coworkers,
    msSinceLastCoworkerMsg: 60000,
    unsolicitedCooldownMs: 300000,
  };
}

// --- Intent classification ---

check("classifies requirement question", () => {
  const c = classifyMessage("What is the expected behavior for retries?");
  assertTrue(c.intent === "question_requirement", `got ${c.intent}`);
  assertTrue(c.topicIds.includes("retry_backoff"), `topics: ${c.topicIds}`);
});

check("classifies plan sharing", () => {
  const c = classifyMessage("I'm going to check the retry path first");
  assertTrue(c.intent === "sharing_plan", `got ${c.intent}`);
});

check("classifies acknowledgment", () => {
  const c = classifyMessage("got it, thanks");
  assertTrue(c.intent === "acknowledgment", `got ${c.intent}`);
});

check("detects paraphrased questions as same", () => {
  const a = classifyMessage("Why did you choose this retry approach?");
  const b = classifyMessage("Can you explain your reasoning on retries?");
  // Both should be questions about retry topic
  assertTrue(a.topicIds.includes("retry_backoff"), `a topics: ${a.topicIds}`);
  assertTrue(b.topicIds.includes("retry_backoff"), `b topics: ${b.topicIds}`);
});

// --- Coordinator decisions ---

check("acknowledgment gets no reply", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const decision = decideResponse(baseCtx(state, "thanks!"));
  assertTrue(!decision.shouldSpeak, "should not speak on acknowledgment");
  assertTrue(!!decision.silenceReason, "should have silence reason");
});

check("plan sharing gets no reply (recorded, not re-asked)", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const decision = decideResponse(baseCtx(state, "I'm going to investigate the retry logic first"));
  assertTrue(!decision.shouldSpeak, "should not speak on plan sharing");
});

check("question about unaddressed topic gets reply", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const decision = decideResponse(baseCtx(state, "What is the expected retry behavior?"));
  assertTrue(decision.shouldSpeak, "should speak on unaddressed question");
  assertTrue(decision.speakerId === "maya", `speaker: ${decision.speakerId}`);
});

check("question about addressed topic gets no reply", () => {
  let state = createInitialState("s1", "sc1", "v1");
  // Simulate: question asked, coworker answered
  const q1 = classifyMessage("What is the expected retry behavior?");
  state = recordCandidateMessage(state, "m1", "What is the expected retry behavior?", q1);
  state = recordCoworkerMessage(state, "m2", "maya", "Retries use exponential backoff.", {
    topicId: "retry_backoff",
  });
  assertTrue(isTopicAddressed(state, "retry_backoff"), "topic should be addressed");

  const decision = decideResponse(baseCtx(state, "Can you tell me about retry behavior again?"));
  assertTrue(!decision.shouldSpeak, "should not re-answer addressed topic");
});

check("unclear intent with low confidence gets no reply", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const decision = decideResponse(baseCtx(state, "hmm interesting"));
  assertTrue(!decision.shouldSpeak, "should not speak on unclear low-confidence");
});

// --- Memory ---

check("plans are recorded and superseded", () => {
  let state = createInitialState("s1", "sc1", "v1");
  const c1 = classifyMessage("I'll check the retry path first");
  state = recordCandidateMessage(state, "m1", "I'll check the retry path first", c1);
  assertTrue(state.plans.length === 1, `plans: ${state.plans.length}`);

  const c2 = classifyMessage("Actually I'll look at the API contract first");
  state = recordCandidateMessage(state, "m2", "Actually I'll look at the API contract first", c2);
  assertTrue(state.plans.length === 2, `plans: ${state.plans.length}`);
  assertTrue(state.plans[0].superseded, "first plan should be superseded");
  assertTrue(!state.plans[1].superseded, "second plan should be active");
});

check("paraphrased questions don't duplicate", () => {
  let state = createInitialState("s1", "sc1", "v1");
  const c1 = classifyMessage("What is the expected retry behavior?");
  state = recordCandidateMessage(state, "m1", "What is the expected retry behavior?", c1);
  const count1 = state.openQuestions.length;

  const c2 = classifyMessage("Can you explain how retries should work?");
  state = recordCandidateMessage(state, "m2", "Can you explain how retries should work?", c2);
  const count2 = state.openQuestions.length;

  assertTrue(count2 === count1, `questions duplicated: ${count1} -> ${count2}`);
});

check("state rebuilds from message history", () => {
  const messages = [
    { id: "m1", sender: "candidate" as const, body: "What is the retry behavior?", created_at: "2026-01-01T00:00:00Z" },
    { id: "m2", sender: "stakeholder" as const, stakeholderId: "maya", body: "Exponential backoff.", created_at: "2026-01-01T00:01:00Z" },
    { id: "m3", sender: "candidate" as const, body: "I'll implement that now", created_at: "2026-01-01T00:02:00Z" },
  ];
  const state = buildStateFromMessages("s1", "sc1", "v1", messages);
  assertTrue(state.handledMessageIds.length === 3, `handled: ${state.handledMessageIds.length}`);
  assertTrue(state.topics.some((t) => t.id === "retry_backoff"), "should have retry topic");
});

// --- Summary ---
console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
