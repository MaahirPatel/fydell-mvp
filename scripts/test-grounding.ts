/**
 * Grounding verification tests.
 * Run: npx tsx scripts/test-grounding.ts
 */
import { verifyGrounding, checkContradiction } from "../src/lib/simulations/conversation/grounding";
import type { PermittedFact } from "../src/lib/simulations/conversation/generation-context";

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

const facts: PermittedFact[] = [
  { id: "maya_fact_0", text: "Deduplication is per event and endpoint: one event fans out to each subscribed endpoint." },
  { id: "maya_fact_1", text: "Three merchants reported duplicates starting at 09:14 UTC." },
  { id: "maya_fact_2", text: "Cap retries at MAX_DELAY_SECONDS (one hour)." },
];

check("supported claims pass", () => {
  const r = verifyGrounding(
    "Deduplication is per event and endpoint.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(r.supported, `issues: ${JSON.stringify(r.issues)}`);
});

check("unsupported number flagged", () => {
  const r = verifyGrounding(
    "Five merchants were affected by the outage.",
    ["maya_fact_1"], // Fact says THREE merchants
    facts
  );
  assertTrue(!r.supported, "should flag unsupported number");
  assertTrue(r.issues.some((i) => i.type === "unsupported_number"), "should be number issue");
});

check("unsupported identifier flagged", () => {
  const r = verifyGrounding(
    "Check the RETRY_POLICY_V2 config for the new behavior.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(!r.supported, "should flag invented identifier");
});

check("hedged suggestions not flagged", () => {
  const r = verifyGrounding(
    "You might try around 3 retries to see if it helps.",
    ["maya_fact_0"],
    facts
  );
  // "3" is hedged with "around" and "might" — should not be flagged
  assertTrue(r.supported, `issues: ${JSON.stringify(r.issues)}`);
});

check("contradiction detected", () => {
  const factsWithAlways: PermittedFact[] = [
    { id: "f0", text: "A republish is always a duplicate, even if the first delivery failed." },
  ];
  const c = checkContradiction(
    "A republish is never a duplicate if the first delivery failed.",
    ["f0"],
    factsWithAlways
  );
  assertTrue(c !== null, "should detect contradiction");
});

check("no false contradiction", () => {
  const c = checkContradiction(
    "A republish is always a duplicate, even if the first delivery failed.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(c === null, "should not flag consistent statement");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
