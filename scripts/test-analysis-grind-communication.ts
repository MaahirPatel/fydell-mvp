/**
 * AI-08 tests: narrow communication evaluation.
 *
 * Only clarification, uncertainty, impact, and handoff accuracy may be
 * assessed — each cited to messages. Culture-fit, personality, accent,
 * sentiment, and suitability inferences are rejected.
 *
 * Run: npx tsx scripts/test-analysis-grind-communication.ts
 */
import {
  assessCommunication,
  validateCommunicationSection,
  type TranscriptMessage,
} from "../src/lib/analysis/communication";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (cond) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const MESSAGES: TranscriptMessage[] = [
  { id: "m-41", from: "coworker", text: "The ids may have different formats.", at: "2026-09-27T10:00:00Z" },
  { id: "m-42", from: "candidate", text: "Should I normalize case as well as whitespace?", at: "2026-09-27T10:01:00Z" },
  { id: "m-43", from: "candidate", text: "I'm not sure the legacy ids are zero-padded; assuming they are.", at: "2026-09-27T10:02:00Z" },
  { id: "m-44", from: "candidate", text: "If unmatched rows are dropped silently it could affect the downstream report.", at: "2026-09-27T10:03:00Z" },
];

// 1. Narrow observations are extracted with message citations.
const { observations, messageCount } = assessCommunication(MESSAGES);
check("candidate message count is reported", messageCount === 3);
const kinds = observations.map((o) => o.kind);
check("clarifying question observed", kinds.includes("clarification"));
check("stated uncertainty observed", kinds.includes("uncertainty_stated"));
check("impact description observed", kinds.includes("impact_described"));
check(
  "every observation cites its message",
  observations.every((o) => o.messageIds.length > 0 && MESSAGES.some((m) => m.id === o.messageIds[0])),
);
check(
  "no observation kind outside the allowed set",
  observations.every((o) =>
    ["clarification", "uncertainty_stated", "impact_described", "handoff_accuracy"].includes(o.kind),
  ),
);

// 2. Empty transcript -> no observations (not a negative signal).
const empty = assessCommunication([]);
check("empty transcript yields no observations", empty.observations.length === 0 && empty.messageCount === 0);

// 3. Prohibited inferences are rejected.
const prohibited = [
  "The candidate is a great culture fit.",
  "Confident personality, would be a strong hire.",
  "Introvert style; may not fit a fast-paced team.",
  "Positive sentiment throughout; attitude is excellent.",
  "No accent issues; communication is clear.",
  "Very likeable candidate.",
];
for (const text of prohibited) {
  const r = validateCommunicationSection(text);
  check(`rejected: "${text.slice(0, 40)}…"`, !r.ok && /AI-08/.test(r.reason ?? ""), r.reason);
}

// 4. Legitimate narrow assessments pass.
const legitimate = [
  "Candidate asked whether case normalization was expected (m-42).",
  "Candidate stated uncertainty about legacy id padding (m-43).",
  "Handoff matches the harness record; no disagreements.",
];
for (const text of legitimate) {
  check(`allowed: "${text.slice(0, 40)}…"`, validateCommunicationSection(text).ok);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
