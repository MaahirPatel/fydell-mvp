/**
 * Before/after conversation demo.
 *
 * Simulates a realistic candidate conversation through the new coordinator,
 * showing what the candidate sees now vs the old behavior.
 *
 * Run: npx tsx scripts/demo-conversation.ts
 */
import { classifyMessage } from "../src/lib/simulations/conversation/intent";
import { decideResponse } from "../src/lib/simulations/conversation/coordinator";
import {
  createInitialState,
  recordCandidateMessage,
  recordCoworkerMessage,
} from "../src/lib/simulations/conversation/memory";

const coworkers = [
  { id: "maya", ownsTopics: ["retry_backoff", "idempotency", "api_compat", "scope", "testing", "runbook"], canHelp: true },
  { id: "priya", ownsTopics: ["user_impact", "timeline"], canHelp: true },
];

// Simulated authored replies (what draftReply would return)
const REPLIES: Record<string, string> = {
  retry_backoff: "Retries use exponential backoff with jitter, capped at MAX_DELAY_SECONDS.",
  user_impact: "Three merchants reported duplicates starting 09:14 UTC. No data loss.",
};

const conversation: Array<{ from: "candidate"; text: string }> = [
  { from: "candidate", text: "What is the expected retry behavior?" },
  { from: "candidate", text: "I'm going to check the retry path first" },
  { from: "candidate", text: "Can you explain how retries should work?" }, // paraphrase!
  { from: "candidate", text: "Which merchants were affected?" },
  { from: "candidate", text: "thanks, got it" },
  { from: "candidate", text: "What about the retry behavior again?" }, // repeat!
  { from: "candidate", text: "hmm interesting" }, // unclear
];

console.log("=== NEW BEHAVIOR (with coordinator) ===\n");

let state = createInitialState("demo", "webhook-retry", "v1");
let msgNum = 0;

for (const turn of conversation) {
  msgNum++;
  const msgId = `c${msgNum}`;
  console.log(`Candidate: ${turn.text}`);

  const classified = classifyMessage(turn.text);
  state = recordCandidateMessage(state, msgId, turn.text, classified);

  const decision = decideResponse({
    state,
    classified,
    messageText: turn.text,
    coworkers,
    msSinceLastCoworkerMsg: 60000,
    unsolicitedCooldownMs: 300000,
  });

  if (decision.shouldSpeak) {
    const replyText = REPLIES[decision.topicId || ""] || "Let me check on that.";
    console.log(`  [${decision.speakerId}] ${replyText}`);
    console.log(`  (purpose: ${decision.purpose})`);
    state = recordCoworkerMessage(state, `r${msgNum}`, decision.speakerId!, replyText, {
      topicId: decision.topicId,
    });
  } else {
    console.log(`  (silent: ${decision.silenceReason})`);
  }
  console.log();
}

console.log("=== OLD BEHAVIOR (without coordinator) ===\n");
console.log("Candidate: What is the expected retry behavior?");
console.log("  [maya] <keyword-matched reply about retries>");
console.log();
console.log("Candidate: I'm going to check the retry path first");
console.log("  [maya] I can clarify the delivery promise, the incident, or how big the change should be. What do you need to know?");
console.log("  (fallback question — repeats every time)");
console.log();
console.log("Candidate: Can you explain how retries should work?");
console.log("  [maya] <same retry reply again — no memory it was already answered>");
console.log();
console.log("Candidate: thanks, got it");
console.log("  [maya] I can clarify the delivery promise, the incident, or how big the change should be. What do you need to know?");
console.log("  (fallback question again)");
console.log();
console.log("=== SUMMARY ===");
console.log(`Topics tracked: ${state.topics.map((t) => `${t.id}(${t.status})`).join(", ")}`);
console.log(`Plans recorded: ${state.plans.length}`);
console.log(`Questions asked: ${state.openQuestions.length}`);
console.log(`Coworker messages sent: ${state.handledMessageIds.filter((id) => id.startsWith("r")).length} (vs 7 in old system)`);
