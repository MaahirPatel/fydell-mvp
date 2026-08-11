/**
 * Tests for the deterministic micro simulation analysis. No database needed.
 * Run with: npx tsx --conditions react-server scripts/test-micro-scoring.ts
 */
import { ALL_SIMULATIONS } from "../src/lib/simulations/content/index";
import { ROLES } from "../src/lib/simulations/roles";
import { validateMicroSim, bandForScore, type MicroSimContent } from "../src/lib/simulations/micro-types";
import {
  analyzeMicroSubmission,
  multiSelectF1,
  scoreObjective,
  scoreTextByKeywords,
  conceptPoints,
  INSUFFICIENT_COVERAGE,
  type MicroSubmissionInput,
} from "../src/lib/simulations/micro-scoring";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

// ---- catalog ---------------------------------------------------------------
console.log("catalog");
const slugs = ALL_SIMULATIONS.map((s) => s.slug);
check("31 simulations registered", ALL_SIMULATIONS.length === 31, `got ${ALL_SIMULATIONS.length}`);
check("slugs are unique", new Set(slugs).size === slugs.length);
const roleKeys = new Set(ROLES.map((r) => r.key));
check(
  "every sim has a valid role",
  ALL_SIMULATIONS.every((s) => roleKeys.has(s.roleKey))
);
for (const role of ROLES) {
  const count = ALL_SIMULATIONS.filter((s) => s.roleKey === role.key).length;
  const expected = role.key === "data_analyst" ? 6 : 5;
  check(`${role.key} has ${expected} simulations (${count})`, count === expected);
  const registered = new Set(slugs);
  check(
    `${role.key} simulationSlugs all registered`,
    role.simulationSlugs.every((s) => registered.has(s)),
    role.simulationSlugs.filter((s) => !registered.has(s)).join(", ")
  );
}

// ---- bands -------------------------------------------------------------------
console.log("\nbands");
check("85 is strong", bandForScore(85).band === "strong");
check("100 is strong", bandForScore(100).band === "strong");
check("84 is established", bandForScore(84).band === "established");
check("70 is established", bandForScore(70).band === "established");
check("69 is developing", bandForScore(69).band === "developing");
check("50 is developing", bandForScore(50).band === "developing");
check("49 is limited", bandForScore(49).band === "limited");
check("0 is limited", bandForScore(0).band === "limited");

// ---- unit checks: F1 and keyword matching ------------------------------------
console.log("\nunit");
{
  const q = {
    id: "u1",
    kind: "multi_select" as const,
    prompt: "",
    options: ["a", "b", "c", "d"],
    points: 20,
    answer: ["a", "b"],
    competencyKey: "x",
    expectedEvidence: "",
  };
  const exact = multiSelectF1(q, ["a", "b"]);
  check("F1 exact set = 1", exact.f1 === 1);
  const half = multiSelectF1(q, ["a"]);
  check("F1 one of two picks: precision 1", half.precision === 1);
  check("F1 one of two picks: recall 0.5", half.recall === 0.5);
  check("F1 one of two picks = 2/3", Math.abs(half.f1 - 2 / 3) < 1e-9);
  const none = multiSelectF1(q, ["c", "d"]);
  check("F1 all-wrong picks = 0", none.f1 === 0);
  const empty = multiSelectF1(q, []);
  check("F1 empty selection = 0", empty.f1 === 0);

  const tq = {
    id: "u2",
    kind: "text" as const,
    prompt: "",
    points: 20,
    concepts: [
      { id: "c1", label: "Full", keywords: ["normalize"], partialKeywords: ["format"] },
      { id: "c2", label: "Other", keywords: ["alert"] },
    ],
    competencyKey: "x",
    expectedEvidence: "",
  };
  const full = scoreTextByKeywords(tq, "Normalize the IDs and alert on failures.");
  check("keyword full credit", full.every((c) => c.quality === 1));
  check("full credit points", conceptPoints(tq, full) === 20);
  const partial = scoreTextByKeywords(tq, "Fix the format of the IDs.");
  check("partial keyword gives 0.5", partial[0].quality === 0.5 && partial[1].quality === 0);
  check("partial credit points", conceptPoints(tq, partial) === 5);
}

// ---- perfect / empty / deterministic runs per sim -----------------------------
function perfectSubmission(sim: MicroSimContent): MicroSubmissionInput {
  const answers: Record<string, unknown> = {};
  for (const q of sim.questions) {
    if (q.kind === "single_select") answers[q.id] = String(q.answer![0]);
    else if (q.kind === "number") answers[q.id] = q.answer![0];
    else if (q.kind === "multi_select") answers[q.id] = (q.answer as (string | number)[]).map(String);
    else {
      const concepts = (q.concepts || []).map((c) => c.keywords[0]).join(". ");
      answers[q.id] =
        `I recommend the following based on ${sim.resources[0].title}. ${concepts}. ` +
        "I would verify this assumption if anything in the data changes. " +
        "Next, we should follow up and monitor the fix.";
    }
  }
  answers["__aiDisclosure"] = { used: false };

  let t = 0;
  const at = () => new Date(1700000000000 + 1000 * t++).toISOString();
  const events: MicroSubmissionInput["events"] = [
    { event_type: "session_started", payload: {}, created_at: at() },
    ...sim.resources.map((r) => ({
      event_type: "resource_opened",
      resource_id: r.id,
      payload: {},
      created_at: at(),
    })),
    // The first question is answered, then revised (verification signal).
    { event_type: "deliverable_field_edited", payload: { field: sim.questions[0].id }, created_at: at() },
    { event_type: "deliverable_field_edited", payload: { field: sim.questions[0].id }, created_at: at() },
    { event_type: "message_sent", payload: {}, created_at: at() },
    {
      event_type: "message_received",
      payload: { ruleId: sim.stakeholders[0].responseRules.find((r) => r.id.startsWith("rel_"))!.id },
      created_at: at(),
    },
    { event_type: "submission_confirmed", payload: {}, created_at: at() },
  ];
  const messages = [
    { thread: "stakeholder", sender: "candidate", body: "Can you clarify the key ambiguity here?" },
    { thread: "stakeholder", sender: "stakeholder", body: "Sure, here is what I know." },
  ];
  return { answers, events, messages, completionSeconds: 280 };
}

for (const sim of ALL_SIMULATIONS) {
  console.log(`\n${sim.slug}`);
  const errors = validateMicroSim(sim);
  check("content valid", errors.length === 0, errors.join("; "));

  // Objective answer keys score full points; wrong answers score zero.
  for (const q of sim.questions) {
    if (q.kind === "text") continue;
    const key =
      q.kind === "number"
        ? (q.answer as number[])[0]
        : q.kind === "multi_select"
          ? (q.answer as string[])
          : (q.answer as string[])[0];
    const { earned, correct } = scoreObjective(q, key);
    check(`${q.id}: answer key scores full (${earned}/${q.points})`, correct && earned === q.points);
    const wrong =
      q.kind === "number"
        ? (q.answer as number[])[0] + 999
        : q.kind === "multi_select"
          ? (q.options || []).filter((o) => !(q.answer as string[]).includes(o))
          : (q.options || []).find((o) => o !== (q.answer as string[])[0])!;
    const w = scoreObjective(q, wrong);
    check(`${q.id}: wrong answer scores 0`, !w.correct && w.earned === 0, `earned ${w.earned}`);
  }

  // Perfect submission built from the answer key reaches Adjusted 100, Strong.
  const input = perfectSubmission(sim);
  const perfect = analyzeMicroSubmission(sim, input);
  const a = perfect.analysis!;
  check(`perfect: coverage = 1 (${a.coverage})`, a.coverage === 1);
  for (const [k, comp] of Object.entries(a.components)) {
    if (!comp.applicable) continue;
    check(`perfect: component ${k} = 1 (${comp.value.toFixed(2)})`, Math.abs(comp.value - 1) < 1e-9, comp.detail);
  }
  check(`perfect: adjusted >= 99 (${a.adjusted})`, a.adjusted >= 99);
  check("perfect: band strong", perfect.band === "strong", perfect.band);
  check(
    "perfect: all competencies strong",
    perfect.competencies.every((c) => c.band === "strong"),
    perfect.competencies.map((c) => `${c.key}:${c.band}`).join(", ")
  );
  check("perfect: disclosure carried, score unaffected", a.aiDisclosure?.used === false);

  // Empty submission: coverage below 0.45 forces the Insufficient band.
  const emptyRun = analyzeMicroSubmission(sim, { answers: {}, events: [], messages: [] });
  const e = emptyRun.analysis!;
  check(`empty: coverage < ${INSUFFICIENT_COVERAGE} (${e.coverage})`, e.coverage < INSUFFICIENT_COVERAGE);
  check("empty: band insufficient", emptyRun.band === "insufficient", emptyRun.band);
  check("empty: label Insufficient evidence", emptyRun.bandLabel === "Insufficient evidence");

  // Determinism: the same submission always produces the identical result.
  const again = analyzeMicroSubmission(sim, input);
  check("deterministic (deep equal)", JSON.stringify(perfect) === JSON.stringify(again));

  // Stakeholder rules still ship keywords, replies and a fallback.
  const s = sim.stakeholders[0];
  for (const rule of s.responseRules.filter((r) => r.id.startsWith("rel_"))) {
    check(`rule ${rule.id} has keywords + reply`, rule.anyKeywords.length > 0 && rule.reply.length > 0);
  }
  check("stakeholder has fallback reply", s.fallbackReply.length > 0);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll scoring checks passed.");
process.exit(failures ? 1 : 0);
