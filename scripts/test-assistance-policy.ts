/**
 * Assistance policy tests.
 * Run: npx tsx scripts/test-assistance-policy.ts
 */
import { classifyHelpRequest, DEFAULT_POLICY, summarizeHelp } from "../src/lib/simulations/conversation/assistance";
import { createInitialState, recordHelp } from "../src/lib/simulations/conversation/memory";
import { decideResponse } from "../src/lib/simulations/conversation/coordinator";
import { classifyMessage } from "../src/lib/simulations/conversation/intent";

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

const coworkers = [{ id: "maya", ownsTopics: ["retry_backoff"], canHelp: true }];

function ctxFor(state: ReturnType<typeof createInitialState>, text: string) {
  return {
    state,
    classified: classifyMessage(text),
    messageText: text,
    coworkers,
    msSinceLastCoworkerMsg: 60000,
    unsolicitedCooldownMs: 300000,
  };
}

check("clarification always allowed", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const r = classifyHelpRequest("What is the expected behavior?", state, DEFAULT_POLICY);
  assertTrue(r.level === "clarification", `level: ${r.level}`);
  assertTrue(r.allowed, "should be allowed");
});

check("hint allowed within limit", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const r = classifyHelpRequest("Can you give me a hint?", state, DEFAULT_POLICY);
  assertTrue(r.level === "hint", `level: ${r.level}`);
  assertTrue(r.allowed, "should be allowed");
});

check("hint denied after limit", () => {
  let state = createInitialState("s1", "sc1", "v1");
  state = recordHelp(state, "hint", "retry", "m1", "test");
  state = recordHelp(state, "hint", "retry", "m2", "test");
  const r = classifyHelpRequest("Another hint please?", state, DEFAULT_POLICY);
  assertTrue(r.level === "hint", `level: ${r.level}`);
  assertTrue(!r.allowed, "should be denied after 2 hints");
  assertTrue(r.reason.includes("limit"), `reason: ${r.reason}`);
});

check("solution never allowed by default", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const r = classifyHelpRequest("What's the solution? Just show me the fix.", state, DEFAULT_POLICY);
  assertTrue(r.level === "solution", `level: ${r.level}`);
  assertTrue(!r.allowed, "solution should be denied");
});

check("coordinator routes help request with level", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const d = decideResponse(ctxFor(state, "I'm stuck, can you give me a hint about retries?"));
  assertTrue(d.shouldSpeak, "should speak on help request");
  assertTrue(d.helpLevel === "hint", `helpLevel: ${d.helpLevel}`);
  assertTrue(d.helpAllowed === true, "should be allowed");
});

check("coordinator denies hint over limit", () => {
  let state = createInitialState("s1", "sc1", "v1");
  state = recordHelp(state, "hint", "retry", "m1", "test");
  state = recordHelp(state, "hint", "retry", "m2", "test");
  const d = decideResponse(ctxFor(state, "One more hint please?"));
  assertTrue(d.shouldSpeak, "should still speak (to decline)");
  assertTrue(d.helpAllowed === false, "should be denied");
});

check("help summary for report", () => {
  let state = createInitialState("s1", "sc1", "v1");
  state = recordHelp(state, "clarification", "retry", "m1", "test");
  state = recordHelp(state, "hint", "retry", "m2", "test");
  const summary = summarizeHelp(state);
  assertTrue(summary.totalHelps === 2, `total: ${summary.totalHelps}`);
  assertTrue(summary.byLevel.clarification === 1, "clarification count");
  assertTrue(summary.byLevel.hint === 1, "hint count");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
