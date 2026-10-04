/**
 * Assistance guard tests.
 * Run: npx tsx scripts/test-assistance-guard.ts
 */
import {
  isMislabeledAssistance,
  checkCumulativeReveal,
  validateAssistance,
} from "../src/lib/simulations/conversation/assistance-guard";
import { createInitialState, recordHelp } from "../src/lib/simulations/conversation/memory";
import { DEFAULT_POLICY } from "../src/lib/simulations/conversation/assistance";

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

check("detects solution labeled as clarification", () => {
  const r = isMislabeledAssistance(
    "Here's the fix: change line 42 to use exponential backoff.",
    "clarification"
  );
  assertTrue(r.mislabeled, "should detect mislabeled solution");
});

check("detects code blocks in clarification", () => {
  const r = isMislabeledAssistance(
    "You should do something like:\n```python\ndef retry():\n    pass\n```",
    "clarification"
  );
  assertTrue(r.mislabeled, "should detect code in clarification");
});

check("honest hint not flagged", () => {
  const r = isMislabeledAssistance(
    "Think about what makes each delivery unique — the combination of event and endpoint.",
    "hint"
  );
  assertTrue(!r.mislabeled, "honest hint should pass");
});

check("cumulative reveal blocked", () => {
  let state = createInitialState("s1", "sc1", "v1");
  state = recordHelp(state, "hint", "retry", "m1", "test");
  state = recordHelp(state, "direction", "retry", "m2", "test");
  state = recordHelp(state, "hint", "retry", "m3", "test");
  const r = checkCumulativeReveal(state, "One more specific tip...", "hint");
  assertTrue(r.exceeds, "should block 4th substantive help");
});

check("solution blocked by default policy", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const r = validateAssistance(
    "The solution is to add idempotency keys.",
    "solution",
    state,
    DEFAULT_POLICY.maxHints,
    DEFAULT_POLICY.allowSolution
  );
  assertTrue(!r.valid, "solution should be blocked");
});

check("hint within budget passes", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const r = validateAssistance(
    "Consider where duplicates might slip through.",
    "hint",
    state,
    DEFAULT_POLICY.maxHints,
    DEFAULT_POLICY.allowSolution
  );
  assertTrue(r.valid, "hint within budget should pass");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
