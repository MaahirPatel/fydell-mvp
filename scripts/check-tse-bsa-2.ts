/**
 * Validation for the batch-2 TSE/BSA micro simulations.
 * Run with: npx tsx --conditions react-server scripts/check-tse-bsa-2.ts
 */
import {
  MICRO_TSE_API_TIMEOUT,
  MICRO_TSE_PERMISSION_FAILURE,
  MICRO_TSE_DUPLICATE_WEBHOOKS,
  MICRO_TSE_ONE_CUSTOMER,
  MICRO_BSA_INVOICE_ROUTING,
  MICRO_BSA_ACCESS_PROVISIONING,
  MICRO_BSA_CRM_HANDOFF,
  MICRO_BSA_CHANGE_REQUEST,
} from "../src/lib/simulations/content/micro-operations-2";
import { validateMicroSim, type MicroSimContent } from "../src/lib/simulations/micro-types";
import {
  scoreObjective,
  scoreTextByKeywords,
  conceptPoints,
} from "../src/lib/simulations/micro-scoring";

const SIMS: MicroSimContent[] = [
  MICRO_TSE_API_TIMEOUT,
  MICRO_TSE_PERMISSION_FAILURE,
  MICRO_TSE_DUPLICATE_WEBHOOKS,
  MICRO_TSE_ONE_CUSTOMER,
  MICRO_BSA_INVOICE_ROUTING,
  MICRO_BSA_ACCESS_PROVISIONING,
  MICRO_BSA_CRM_HANDOFF,
  MICRO_BSA_CHANGE_REQUEST,
];

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` (${detail})` : ""}`);
    failures++;
  }
}

for (const sim of SIMS) {
  console.log(`\n${sim.slug} (${sim.roleKey})`);

  const errors = validateMicroSim(sim);
  check("validateMicroSim passes", errors.length === 0, errors.join("; "));

  let perfectTotal = 0;
  for (const q of sim.questions) {
    if (q.kind === "text") {
      // Perfect answer built from the concept keywords.
      const perfect = (q.concepts || []).map((c) => c.keywords[0]).join(". ");
      const concepts = scoreTextByKeywords(q, perfect);
      const pts = conceptPoints(q, concepts);
      check(`${q.id}: perfect text scores full (${pts}/${q.points})`, pts === q.points);
      perfectTotal += pts;
    } else {
      const key =
        q.kind === "number"
          ? (q.answer as number[])[0]
          : q.kind === "multi_select"
            ? (q.answer as string[])
            : (q.answer as string[])[0];
      const { earned, correct } = scoreObjective(q, key);
      check(
        `${q.id}: answer key scores full (${earned}/${q.points})`,
        correct && earned === q.points
      );
      perfectTotal += earned;
    }
  }

  const total = perfectTotal + sim.stakeholderPoints;
  check(`perfect run totals 100 (got ${total})`, total === 100);

  const declared =
    sim.questions.reduce((s, q) => s + q.points, 0) + sim.stakeholderPoints;
  check(`declared points total 100 (got ${declared})`, declared === 100);

  const emDash = JSON.stringify(sim).includes("\u2014");
  check("no em dash in any string", !emDash);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
