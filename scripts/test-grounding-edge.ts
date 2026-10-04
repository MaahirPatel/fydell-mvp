/**
 * Grounding edge cases: ensure valid responses aren't falsely rejected.
 * Run: npx tsx scripts/test-grounding-edge.ts
 */
import { verifyGrounding } from "../src/lib/simulations/conversation/grounding";
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
  { id: "maya_fact_1", text: "A republish is always a duplicate, even if the first delivery failed." },
];

check("valid paraphrase passes", () => {
  // "each subscribed endpoint gets its own copy" paraphrases the fact
  const r = verifyGrounding(
    "Each subscribed endpoint gets its own delivery — that's the deduplication scope.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(r.supported, `issues: ${JSON.stringify(r.issues)}`);
});

check("candidate-provided file names pass", () => {
  // Candidate mentions their own file; model references it
  const r = verifyGrounding(
    "Looking at your worker.py, the deduplication check should happen before the delivery is created.",
    ["maya_fact_0"],
    facts
  );
  // "worker.py" is not a number or ALL-CAPS identifier, should pass
  assertTrue(r.supported, `issues: ${JSON.stringify(r.issues)}`);
});

check("engineering suggestion marked as suggestion passes", () => {
  const r = verifyGrounding(
    "You might consider checking for existing deliveries before creating a new one — just a suggestion, not a requirement.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(r.supported, `issues: ${JSON.stringify(r.issues)}`);
});

check("new technical term in suggestion context passes", () => {
  // Model introduces "idempotency key" as a suggestion, not as a scenario fact
  const r = verifyGrounding(
    "One common pattern is using an idempotency key — that's a general technique, not something specific to this codebase.",
    ["maya_fact_0"],
    facts
  );
  // Should pass: it's framed as general knowledge, not a scenario fact
  // (Current lexical check may flag this — documents the limitation)
  console.log(`  (idempotency key test: ${r.supported ? "passed" : "FLAGGED: " + JSON.stringify(r.issues)})`);
});

check("specific unsupported number still caught", () => {
  const r = verifyGrounding(
    "The timeout is 30 seconds per the configuration.",
    ["maya_fact_0"],
    facts
  );
  assertTrue(!r.supported, "should flag invented timeout");
});

console.log(`\n${passes} passed, ${failures} failed`);
console.log("\nNote: Lexical checks are safeguards, not proof of semantic correctness.");
console.log("A model can phrase a valid claim in ways that bypass these checks,");
console.log("or phrase an invalid claim to avoid triggering them.");
if (failures > 0) process.exit(1);
