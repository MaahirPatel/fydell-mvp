/**
 * Deterministic Applied AI Pass A / Pass B evaluator contracts.
 * Run: npx tsx scripts/test-applied-ai-analysis-evals.ts
 */
import { createHash } from "crypto";
import {
  analyzeAppliedAiPassA,
  analyzeAppliedAiPassB,
} from "../src/lib/sim-engine/proof/sandbox/applied-ai-analysis";
import {
  APPLIED_AI_ANALYSIS_FIXTURES,
  type AppliedAiAnalysisFixture,
} from "../src/lib/sim-engine/proof/sandbox/applied-ai-analysis-fixtures";
import type { ProofEventRecord, RunSnapshot } from "../src/lib/sim-engine/proof/types";

let failures = 0;
let falsePositives = 0;
let falseNegatives = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function cloneSnapshot(snapshot: RunSnapshot): RunSnapshot {
  return structuredClone(snapshot);
}

function outcomes(snapshot: RunSnapshot) {
  return Object.fromEntries(
    analyzeAppliedAiPassA(snapshot).claims.map((claim) => [claim.competency, claim.direction]),
  );
}

function stableHash(snapshot: RunSnapshot): string {
  const result = {
    passA: analyzeAppliedAiPassA(snapshot),
    passB: analyzeAppliedAiPassB(snapshot),
  };
  return createHash("sha256").update(JSON.stringify(result)).digest("hex");
}

function innerPayload(event: ProofEventRecord): Record<string, unknown> | null {
  const envelope = event.payload;
  const inner = envelope.payload;
  return inner && typeof inner === "object" && !Array.isArray(inner)
    ? inner as Record<string, unknown>
    : null;
}

function fixture(name: AppliedAiAnalysisFixture["name"]): AppliedAiAnalysisFixture {
  const found = APPLIED_AI_ANALYSIS_FIXTURES.find((item) => item.name === name);
  if (!found) throw new Error(`Fixture ${name} missing`);
  return found;
}

console.log("\nApplied AI analysis fixtures");
for (const item of APPLIED_AI_ANALYSIS_FIXTURES) {
  const actual = outcomes(item.snapshot);
  for (const [requirement, expected] of Object.entries(item.expected)) {
    const received = actual[requirement];
    ok(`${item.name} ${requirement} => ${expected}`, received === expected, `received ${String(received)}`);
    if (expected === "STRENGTH" && received !== "STRENGTH") falseNegatives += 1;
    if (expected !== "STRENGTH" && received === "STRENGTH") falsePositives += 1;
  }
  const passB = analyzeAppliedAiPassB(item.snapshot);
  ok(
    `${item.name} recommendation`,
    passB.brief.recommendation === item.expectedRecommendation,
    `received ${passB.brief.recommendation}`,
  );
  ok(
    `${item.name} has four separate requirement claims`,
    passB.claims.length === 4 &&
      passB.claims.every((claim) => Object.hasOwn(item.expected, claim.competency)) &&
      !passB.claims.some((claim) => claim.competency.includes("/")),
  );
}

console.log("\nEvidence integrity");
const strong = fixture("A");
const unsafe = fixture("B");
const proseOnly = fixture("C");

const missingId = cloneSnapshot(strong.snapshot);
const missingPost = missingId.events.find((event) => String(event.event_type) === "EVAL_RUN" && innerPayload(event)?.phase === "post_fact");
if (missingPost) missingPost.id = "";
const missingIdResult = analyzeAppliedAiPassA(missingId);
ok(
  "missing event IDs never become citations",
  missingIdResult.claims.every(
    (claim) => !claim.supporting_event_ids.includes("") && !claim.counterevidence_event_ids.includes(""),
  ),
);
ok(
  "missing post-eval ID degrades evidence",
  missingIdResult.claims.every((claim) => claim.direction === "INSUFFICIENT_EVIDENCE"),
);

const malformedAlongsideValid = cloneSnapshot(strong.snapshot);
const malformedExtra = structuredClone(malformedAlongsideValid.events[0]!);
malformedExtra.id = "malformed-extra";
malformedExtra.sequence = 12;
malformedExtra.payload = { payload: { phase: "post_fact" } };
malformedAlongsideValid.events.push(malformedExtra);
ok(
  "malformed structured data cannot coexist with strength",
  analyzeAppliedAiPassA(malformedAlongsideValid).claims.every((claim) => claim.direction !== "STRENGTH"),
);

const duplicateFact = cloneSnapshot(strong.snapshot);
const fact = duplicateFact.events.find((event) => String(event.event_type) === "FACT_RELEASED");
if (fact) {
  const copy = structuredClone(fact);
  copy.id = "duplicate-fact";
  copy.sequence = 12;
  duplicateFact.events.push(copy);
}
ok(
  "LATENCY_001 must occur exactly once",
  analyzeAppliedAiPassA(duplicateFact).claims.every((claim) => claim.direction === "INSUFFICIENT_EVIDENCE"),
);

const badOrder = cloneSnapshot(strong.snapshot);
const architecture = badOrder.events.find((event) => String(event.event_type) === "ARCHITECTURE_DECISION_COMMITTED");
const orderedFact = badOrder.events.find((event) => String(event.event_type) === "FACT_RELEASED");
if (architecture && orderedFact) {
  const sequence = architecture.sequence;
  architecture.sequence = orderedFact.sequence;
  orderedFact.sequence = sequence;
}
ok(
  "preliminary commitment must precede fact",
  analyzeAppliedAiPassA(badOrder).claims.every((claim) => claim.direction === "INSUFFICIENT_EVIDENCE"),
);

const unsafeClaims = analyzeAppliedAiPassA(unsafe.snapshot).claims;
const unsafePassA = analyzeAppliedAiPassA(unsafe.snapshot);
ok(
  "fast unsafe result records reliability counterevidence",
  unsafeClaims.find((claim) => claim.competency === "PR-AI-05")?.counterevidence_event_ids.length === 1,
);
ok(
  "fast unsafe result records boundary counterevidence",
  unsafeClaims.find((claim) => claim.competency === "PR-AI-08")?.counterevidence_event_ids.length === 1,
);
ok(
  "support and counterevidence stay distinct",
  unsafeClaims.every(
    (claim) => claim.supporting_event_ids.every((id) => !claim.counterevidence_event_ids.includes(id)),
  ),
);
ok(
  "dynamic defense prioritizes unsafe measured regression",
  unsafePassA.defenseTarget.includes("reliability") &&
    unsafePassA.defensePrompt.includes("critical authorization") &&
    unsafePassA.defensePrompt.includes("%"),
);

const slow = cloneSnapshot(strong.snapshot);
const slowPost = slow.events.find((event) => String(event.event_type) === "EVAL_RUN" && innerPayload(event)?.phase === "post_fact");
if (slowPost) {
  const payload = innerPayload(slowPost);
  const metrics = payload?.metrics;
  if (metrics && typeof metrics === "object" && !Array.isArray(metrics)) {
    (metrics as Record<string, unknown>).p95LatencySeconds = 5.2;
  }
}
ok(
  "reliable but slow result concerns PR-AI-07",
  analyzeAppliedAiPassA(slow).claims.find((claim) => claim.competency === "PR-AI-07")?.direction === "CONCERN",
);
ok(
  "dynamic defense selects unmet measured latency",
  analyzeAppliedAiPassA(slow).defenseTarget.includes("latency") &&
    analyzeAppliedAiPassA(slow).defensePrompt.includes("5.2s"),
);

ok(
  "keyword prose cannot create a strength",
  analyzeAppliedAiPassA(proseOnly.snapshot).claims.every((claim) => claim.direction === "INSUFFICIENT_EVIDENCE"),
);
ok(
  "unlabeled defense remains human-review uncertainty",
  analyzeAppliedAiPassB(proseOnly.snapshot).brief.concerns.some((concern) => concern.includes("pending human review")),
);
ok(
  "Pass B preserves Pass A claims",
  JSON.stringify(analyzeAppliedAiPassB(strong.snapshot).claims) ===
    JSON.stringify(analyzeAppliedAiPassA(strong.snapshot).claims),
);
ok(
  "Pass B interview plan names targeted requirements",
  ["PR-AI-04", "PR-AI-05", "PR-AI-07", "PR-AI-08"].every((requirement) =>
    JSON.stringify(analyzeAppliedAiPassB(strong.snapshot).interviewPlan).includes(requirement),
  ),
);

console.log("\nStability");
for (const item of APPLIED_AI_ANALYSIS_FIXTURES) {
  const expectedHash = stableHash(item.snapshot);
  const repeatStable = Array.from({ length: 50 }, () => stableHash(item.snapshot)).every((hash) => hash === expectedHash);
  ok(`${item.name} deterministic over 50 repeats`, repeatStable);

  const reordered = cloneSnapshot(item.snapshot);
  reordered.events.reverse();
  ok(`${item.name} input-order stable`, stableHash(reordered) === expectedHash);
}

console.log(
  `\nSummary: false positives=${falsePositives}; false negatives=${falseNegatives}; stability=${failures === 0 ? "stable" : "failed"}.`,
);
if (failures > 0) process.exit(1);
console.log("Applied AI analysis evals passed.");
