/**
 * Integration tests for the full conversation pipeline.
 * Covers: state transitions, dedup, multi-coworker, help tracking, coherence.
 * Run: npx tsx scripts/test-conversation-integration.ts
 */
import { classifyMessage } from "../src/lib/simulations/conversation/intent";
import { decideResponse } from "../src/lib/simulations/conversation/coordinator";
import {
  createInitialState,
  recordCandidateMessage,
  recordCoworkerMessage,
  recordHelp,
  resolveTopic,
  getActivePlan,
} from "../src/lib/simulations/conversation/memory";
import { buildStateFromMessages } from "../src/lib/simulations/conversation/state-builder";
import { summarizeHelp, DEFAULT_POLICY } from "../src/lib/simulations/conversation/assistance";

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

const coworkers = [
  { id: "maya", ownsTopics: ["retry_backoff", "idempotency"], canHelp: true },
  { id: "priya", ownsTopics: ["user_impact", "timeline"], canHelp: true },
];

let msgCounter = 0;
function decide(state: ReturnType<typeof createInitialState>, text: string) {
  const classified = classifyMessage(text);
  msgCounter++;
  const newState = recordCandidateMessage(state, `msg_${msgCounter}`, text, classified);
  const decision = decideResponse({
    state: newState,
    classified,
    messageText: text,
    coworkers,
    msSinceLastCoworkerMsg: 60000,
    unsolicitedCooldownMs: 300000,
  });
  return { newState, decision, classified };
}

// --- Full conversation coherence ---

check("full conversation stays coherent", () => {
  let state = createInitialState("s1", "webhook-retry", "v1");

  // 1. Candidate asks about retries
  let r = decide(state, "What is the expected retry behavior?");
  assertTrue(r.decision.shouldSpeak, "should answer retry question");
  assertTrue(r.decision.speakerId === "maya", "maya should answer");
  state = recordCoworkerMessage(r.newState, "r1", "maya", "Exponential backoff.", { topicId: "retry_backoff" });

  // 2. Candidate shares plan
  r = decide(state, "I'll check the retry logic in the worker first");
  assertTrue(!r.decision.shouldSpeak, "plan should not trigger reply");
  assertTrue(getActivePlan(r.newState)?.plan.includes("retry logic"), "plan recorded");
  state = r.newState;

  // 3. Candidate asks paraphrased question (should be suppressed)
  r = decide(state, "Can you explain how retries should work?");
  assertTrue(!r.decision.shouldSpeak, "paraphrase should be suppressed");
  state = r.newState;

  // 4. Candidate asks Priya's topic
  r = decide(state, "Which merchants reported the issue?");
  assertTrue(r.decision.shouldSpeak, "should answer merchant question");
  assertTrue(r.decision.speakerId === "priya", `priya should answer, got ${r.decision.speakerId}`);
  state = recordCoworkerMessage(r.newState, "r2", "priya", "Three merchants.", { topicId: "user_impact" });

  // 5. Candidate acknowledges
  r = decide(state, "thanks!");
  assertTrue(!r.decision.shouldSpeak, "ack should not trigger reply");
});

// --- Corrected explanation replaces prior ---

check("corrected plan supersedes prior", () => {
  let state = createInitialState("s1", "sc1", "v1");
  let r = decide(state, "I'll start with the API layer");
  state = r.newState;
  r = decide(state, "Actually, the retry logic seems more important, I'll start there");
  const plan = getActivePlan(r.newState);
  assertTrue(plan?.plan.includes("retry logic"), "new plan should be active");
  assertTrue(r.newState.plans[0].superseded, "old plan superseded");
});

// --- Help tracking through conversation ---

check("help requests tracked for report", () => {
  let state = createInitialState("s1", "sc1", "v1");
  let r = decide(state, "Can I get a hint on the retry logic?");
  assertTrue(r.decision.helpLevel === "hint", `level: ${r.decision.helpLevel}`);
  state = recordHelp(r.newState, "hint", "retry_backoff", "r1", "Candidate requested hint");
  const summary = summarizeHelp(state);
  assertTrue(summary.byLevel.hint === 1, "hint recorded");
});

// --- Topic resolution ---

check("resolved topics stay resolved", () => {
  let state = createInitialState("s1", "sc1", "v1");
  let r = decide(state, "What is the retry behavior?");
  state = recordCoworkerMessage(r.newState, "r1", "maya", "Backoff.", { topicId: "retry_backoff" });
  state = resolveTopic(state, "retry_backoff", "Answered and confirmed");

  r = decide(state, "Tell me about retries again?");
  assertTrue(!r.decision.shouldSpeak, "resolved topic should not re-trigger");
});

// --- State survives rebuild ---

check("state rebuild preserves conversation", () => {
  const messages = [
    { id: "m1", sender: "candidate" as const, body: "What is the retry behavior?", created_at: "2026-01-01T00:00:00Z" },
    { id: "m2", sender: "stakeholder" as const, stakeholderId: "maya", body: "Exponential backoff.", created_at: "2026-01-01T00:01:00Z" },
    { id: "m3", sender: "candidate" as const, body: "I'll implement that", created_at: "2026-01-01T00:02:00Z" },
    { id: "m4", sender: "candidate" as const, body: "Which merchants were affected?", created_at: "2026-01-01T00:03:00Z" },
    { id: "m5", sender: "stakeholder" as const, stakeholderId: "priya", body: "Three merchants.", created_at: "2026-01-01T00:04:00Z" },
  ];
  const state = buildStateFromMessages("s1", "sc1", "v1", messages);
  assertTrue(state.topics.length >= 2, `topics: ${state.topics.length}`);
  assertTrue(state.plans.length === 1, `plans: ${state.plans.length}`);
  // Both coworkers participated
  const owners = new Set(state.topics.map((t) => t.ownerId).filter(Boolean));
  assertTrue(owners.has("maya") && owners.has("priya"), "both coworkers in history");
});

// --- Idempotent message handling ---

check("duplicate message IDs not double-counted", () => {
  let state = createInitialState("s1", "sc1", "v1");
  const c = classifyMessage("What is the retry behavior?");
  state = recordCandidateMessage(state, "dup1", "What is the retry behavior?", c);
  const count1 = state.handledMessageIds.length;
  state = recordCandidateMessage(state, "dup1", "What is the retry behavior?", c);
  assertTrue(state.handledMessageIds.length === count1, "duplicate not double-counted");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
