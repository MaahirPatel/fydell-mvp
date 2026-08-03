/**
 * Validation harness for the batch-2 Data Analyst / BI Analyst micro sims.
 *
 * Run from the repo root:
 *   npx tsx --conditions react-server scripts/check-da-bi-2.ts
 *
 * Checks, per simulation:
 *   1. validateMicroSim reports no schema errors.
 *   2. Every objective question's authored answer key scores full points
 *      through scoreObjective.
 *   3. Every text question scores full points when the answer is built from
 *      the concept keywords (scoreTextByKeywords + conceptPoints).
 *   4. Question points + stakeholderPoints total exactly 100.
 *   5. No em dash appears anywhere in the sim content.
 */
import { validateMicroSim, type MicroSimContent } from "../src/lib/simulations/micro-types";
import {
  conceptPoints,
  scoreObjective,
  scoreTextByKeywords,
} from "../src/lib/simulations/micro-scoring";
import {
  MICRO_DA_DUPLICATE_REVENUE,
  MICRO_DA_BROKEN_FUNNEL,
  MICRO_DA_REFUND_SPIKE,
  MICRO_DA_COHORT_DRIFT,
  MICRO_BI_FILTERED_FORECAST,
  MICRO_BI_NORTH_STAR,
  MICRO_BI_CURRENCY_CONFUSION,
  MICRO_BI_FISCAL_CUTOFF,
} from "../src/lib/simulations/content/micro-data-analytics-2";

const SIMS: [string, MicroSimContent][] = [
  ["MICRO_DA_DUPLICATE_REVENUE", MICRO_DA_DUPLICATE_REVENUE],
  ["MICRO_DA_BROKEN_FUNNEL", MICRO_DA_BROKEN_FUNNEL],
  ["MICRO_DA_REFUND_SPIKE", MICRO_DA_REFUND_SPIKE],
  ["MICRO_DA_COHORT_DRIFT", MICRO_DA_COHORT_DRIFT],
  ["MICRO_BI_FILTERED_FORECAST", MICRO_BI_FILTERED_FORECAST],
  ["MICRO_BI_NORTH_STAR", MICRO_BI_NORTH_STAR],
  ["MICRO_BI_CURRENCY_CONFUSION", MICRO_BI_CURRENCY_CONFUSION],
  ["MICRO_BI_FISCAL_CUTOFF", MICRO_BI_FISCAL_CUTOFF],
];

let totalErrors = 0;

for (const [exportName, sim] of SIMS) {
  const errors: string[] = [];

  // 1. Schema validation
  for (const e of validateMicroSim(sim)) errors.push(`schema: ${e}`);

  // 2 + 3. Answer keys must score full points
  let earnedAtKey = 0;
  for (const q of sim.questions) {
    if (q.kind === "text") {
      const perfectAnswer = (q.concepts || []).map((c) => c.keywords[0]).join(". ");
      const concepts = scoreTextByKeywords(q, perfectAnswer);
      const earned = conceptPoints(q, concepts);
      earnedAtKey += earned;
      if (earned !== q.points) {
        const missing = concepts.filter((c) => !c.present).map((c) => c.concept);
        errors.push(
          `text ${q.id}: perfect answer earned ${earned}/${q.points} (missing: ${missing.join(", ")})`
        );
      }
    } else {
      const key = q.kind === "number" ? (q.answer![0] as number) : (q.answer as string[]);
      const raw = q.kind === "single_select" ? String(q.answer![0]) : key;
      const { earned, correct } = scoreObjective(q, raw as string | number | string[]);
      earnedAtKey += earned;
      if (!correct || earned !== q.points) {
        errors.push(`${q.kind} ${q.id}: answer key earned ${earned}/${q.points}, correct=${correct}`);
      }
    }
  }

  // 4. Point totals
  const questionPoints = sim.questions.reduce((s, q) => s + q.points, 0);
  const total = questionPoints + sim.stakeholderPoints;
  if (total !== 100) errors.push(`points: questions ${questionPoints} + stakeholder ${sim.stakeholderPoints} = ${total}, expected 100`);
  const perfectTotal = earnedAtKey + sim.stakeholderPoints;
  if (perfectTotal !== 100) errors.push(`points: perfect run scores ${perfectTotal}, expected 100`);

  // 5. No em dash anywhere in the content
  if (JSON.stringify(sim).includes("\u2014")) errors.push("style: em dash found in sim content");

  if (errors.length === 0) {
    console.log(`PASS ${exportName} (${sim.slug}): perfect run = ${perfectTotal}/100`);
  } else {
    totalErrors += errors.length;
    console.log(`FAIL ${exportName} (${sim.slug}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
}

console.log(`\n${totalErrors === 0 ? "All 8 simulations passed with 0 errors." : `${totalErrors} error(s) found.`}`);
if (totalErrors > 0) process.exit(1);
