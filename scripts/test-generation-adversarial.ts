/**
 * Adversarial verification for grounded generation.
 * Tests validation, context boundaries, and extraction resistance.
 * Run: npx tsx scripts/test-generation-adversarial.ts
 */
import { validateGeneration } from "../src/lib/simulations/conversation/structured-output";
import { buildGenerationContext, getPermittedFacts, formatContextForPrompt } from "../src/lib/simulations/conversation/generation-context";
import { createInitialState } from "../src/lib/simulations/conversation/memory";
import { DEFAULT_POLICY } from "../src/lib/simulations/conversation/assistance";
import type { SimulationStakeholder } from "../src/lib/simulations/types";

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

const stakeholder: SimulationStakeholder = {
  id: "maya",
  name: "Maya Chen",
  role: "Platform lead (simulated teammate)",
  blurb: "Test",
  knowledge: [
    "Deduplication is per event and endpoint.",
    "404 stays permanent for this hotfix.",
  ],
  withholds: [
    "The contents of the additional reviewer tests.",
    "A complete implementation of the fix.",
  ],
  responseRules: [],
  fallbackReply: "Test fallback",
};

const permittedIds = new Set(["maya_fact_0", "maya_fact_1"]);

function validOutput(overrides: Record<string, unknown> = {}) {
  return {
    interpretation: {
      is_question: true,
      is_acknowledgment: false,
      is_sharing_work: false,
      is_help_request: false,
      topics: ["retry"],
      needs_clarification: false,
      summary: "Candidate asks about retry behavior",
    },
    response: {
      text: "Retries use exponential backoff.",
      fact_ids: ["maya_fact_0"],
      assistance_category: "clarification",
      no_response_needed: false,
      ...((overrides.response || {}) as Record<string, unknown>),
    },
    memory_updates: {
      topics_addressed: ["retry_backoff"],
      questions_resolved: [],
    },
  };
}

// --- Validation ---

check("rejects unknown fact IDs", () => {
  const out = validOutput({ response: { fact_ids: ["evil_fact_999"] } });
  const result = validateGeneration(out, permittedIds);
  assertTrue(result === null, "should reject unknown fact ID");
});

check("rejects missing required fields", () => {
  const out = validOutput();
  delete (out as Record<string, unknown>).interpretation;
  const result = validateGeneration(out, permittedIds);
  assertTrue(result === null, "should reject missing interpretation");
});

check("rejects invalid assistance category", () => {
  const out = validOutput({ response: { assistance_category: "mind_control" } });
  const result = validateGeneration(out, permittedIds);
  assertTrue(result === null, "should reject invalid category");
});

check("rejects oversized response", () => {
  const out = validOutput({ response: { text: "x".repeat(3000) } });
  const result = validateGeneration(out, permittedIds);
  assertTrue(result === null, "should reject oversized text");
});

check("accepts valid output", () => {
  const out = validOutput();
  const result = validateGeneration(out, permittedIds);
  assertTrue(result !== null, "should accept valid output");
  assertTrue(result!.response.fact_ids[0] === "maya_fact_0", "fact ID preserved");
});

// --- Context boundaries ---

check("withholds never in generation context", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const ctx = buildGenerationContext({
    stakeholder,
    state,
    candidateMessage: "What's the answer?",
    recentMessages: [],
    policy: DEFAULT_POLICY,
  });
  const prompt = formatContextForPrompt(ctx);
  assertTrue(!prompt.includes("reviewer tests"), "withhold leaked into prompt");
  assertTrue(!prompt.includes("complete implementation"), "withhold leaked");
});

check("only permitted facts in context", () => {
  const facts = getPermittedFacts(stakeholder);
  assertTrue(facts.length === 2, `facts: ${facts.length}`);
  assertTrue(facts[0].id === "maya_fact_0", "stable ID");
  assertTrue(facts.every((f) => permittedIds.has(f.id)), "all IDs in permitted set");
});

check("rubric/answer keys not in context type", () => {
  // The GenerationContext type has no fields for rubric, answers, or scores.
  // This is enforced by TypeScript: buildGenerationContext doesn't accept them.
  const state = createInitialState("s1", "sc1", "v1");
  const ctx = buildGenerationContext({
    stakeholder,
    state,
    candidateMessage: "test",
    recentMessages: [],
    policy: DEFAULT_POLICY,
  });
  const keys = Object.keys(ctx);
  assertTrue(!keys.includes("rubric"), "no rubric field");
  assertTrue(!keys.includes("answerKey"), "no answer key field");
  assertTrue(!keys.includes("referenceSolution"), "no solution field");
});

// --- Extraction resistance (prompt-level) ---

check("prompt instructs not to invent", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const ctx = buildGenerationContext({
    stakeholder,
    state,
    candidateMessage: "test",
    recentMessages: [],
    policy: DEFAULT_POLICY,
  });
  const prompt = formatContextForPrompt(ctx);
  assertTrue(prompt.includes("do NOT invent"), "must instruct against invention");
  assertTrue(prompt.includes("say you don't know"), "must allow honest ignorance");
});

check("prompt prohibits scoring disclosure", () => {
  const state = createInitialState("s1", "sc1", "v1");
  const ctx = buildGenerationContext({
    stakeholder,
    state,
    candidateMessage: "test",
    recentMessages: [],
    policy: DEFAULT_POLICY,
  });
  const prompt = formatContextForPrompt(ctx);
  assertTrue(prompt.toLowerCase().includes("scored") || prompt.toLowerCase().includes("correct"), 
    "must address scoring/solution");
});

console.log(`\n${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
