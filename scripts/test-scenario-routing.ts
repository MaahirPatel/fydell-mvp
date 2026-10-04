/**
 * Verify coworker routing works with different scenario configurations.
 * Run: npx tsx scripts/test-scenario-routing.ts
 */
import { decideResponse } from "../src/lib/simulations/conversation/coordinator";
import { classifyMessage } from "../src/lib/simulations/conversation/intent";
import { createInitialState } from "../src/lib/simulations/conversation/memory";

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

// Scenario A: webhook-retry (maya=technical, priya=support)
const scenarioA = [
  { id: "maya", ownsTopics: ["retry_backoff", "idempotency", "api_compat"], canHelp: true },
  { id: "priya", ownsTopics: ["user_impact", "timeline"], canHelp: true },
];

// Scenario B: hypothetical frontend scenario (different roles/topics)
const scenarioB = [
  { id: "alex", ownsTopics: ["accessibility", "keyboard_nav", "aria"], canHelp: true },
  { id: "jordan", ownsTopics: ["performance", "bundle_size", "rendering"], canHelp: true },
];

function decide(coworkers: typeof scenarioA, text: string) {
  const state = createInitialState("s1", "sc1", "v1");
  const classified = classifyMessage(text);
  return decideResponse({
    state,
    classified,
    messageText: text,
    coworkers,
    msSinceLastCoworkerMsg: 60000,
    unsolicitedCooldownMs: 300000,
  });
}

check("scenario A: technical question routes to maya", () => {
  const d = decide(scenarioA, "What is the expected retry behavior?");
  assertTrue(d.shouldSpeak, "should speak");
  assertTrue(d.speakerId === "maya", `got ${d.speakerId}`);
});

check("scenario A: impact question routes to priya", () => {
  const d = decide(scenarioA, "Which merchants were affected?");
  assertTrue(d.shouldSpeak, "should speak");
  assertTrue(d.speakerId === "priya", `got ${d.speakerId}`);
});

check("scenario B: different coworkers, different routing", () => {
  // Same question text, different scenario config → different routing
  // (In a real frontend scenario, "retry" wouldn't be a topic, but this
  // tests that the config drives routing, not hardcoded IDs)
  const d = decide(scenarioB, "What is the expected retry behavior?");
  // retry_backoff not in scenario B's topics, so falls back to first coworker
  assertTrue(d.shouldSpeak, "should speak");
  // Should NOT route to maya/priya (they don't exist in scenario B)
  assertTrue(d.speakerId === "alex" || d.speakerId === "jordan", `got ${d.speakerId}`);
});

check("unowned topic falls back gracefully", () => {
  const d = decide(scenarioA, "What is the meaning of life?");
  // No topic match, unclear intent — should still reach model or be handled
  // (not crash, not route to nonexistent coworker)
  assertTrue(d.speakerId === undefined || scenarioA.some((c) => c.id === d.speakerId),
    "speaker must be from config");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
