/**
 * Validation for the second Solutions Delivery micro sim set.
 * Run with: npx tsx --conditions react-server scripts/check-se-ic-2.ts
 */
import {
  MICRO_SE_SSO_PROVISIONING,
  MICRO_SE_RATE_LIMIT,
  MICRO_SE_SECURITY_REVIEW,
  MICRO_SE_DATA_RESIDENCY,
  MICRO_IC_DUPLICATE_ACCOUNTS,
  MICRO_IC_APPROVAL_RULES,
  MICRO_IC_MIGRATION_CUTOVER,
  MICRO_IC_SCOPE_TRADEOFF,
} from "../src/lib/simulations/content/micro-solutions-delivery-2";
import { validateMicroSim, type MicroSimContent } from "../src/lib/simulations/micro-types";
import {
  scoreObjective,
  scoreTextByKeywords,
  conceptPoints,
} from "../src/lib/simulations/micro-scoring";

const SIMS: MicroSimContent[] = [
  MICRO_SE_SSO_PROVISIONING,
  MICRO_SE_RATE_LIMIT,
  MICRO_SE_SECURITY_REVIEW,
  MICRO_SE_DATA_RESIDENCY,
  MICRO_IC_DUPLICATE_ACCOUNTS,
  MICRO_IC_APPROVAL_RULES,
  MICRO_IC_MIGRATION_CUTOVER,
  MICRO_IC_SCOPE_TRADEOFF,
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
  console.log(`\n${sim.slug} [${sim.roleKey}]`);

  const errors = validateMicroSim(sim);
  check("validateMicroSim passes", errors.length === 0, errors.join("; "));

  let perfectTotal = 0;
  for (const q of sim.questions) {
    if (q.kind === "text") {
      // Perfect answer: one keyword per concept.
      const perfect = (q.concepts || []).map((c) => c.keywords[0]).join(". ");
      const concepts = scoreTextByKeywords(q, perfect);
      const pts = conceptPoints(q, concepts);
      check(`${q.id}: perfect text scores full (${pts}/${q.points})`, pts === q.points);
      const zero = conceptPoints(q, scoreTextByKeywords(q, "zzz qqq nothing here"));
      check(`${q.id}: unrelated text scores 0`, zero === 0, `earned ${zero}`);
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

      const wrong =
        q.kind === "number"
          ? (q.answer as number[])[0] + 999
          : q.kind === "multi_select"
            ? (q.options || []).filter((o) => !(q.answer as string[]).includes(o))
            : (q.options || []).find((o) => o !== (q.answer as string[])[0])!;
      const w = scoreObjective(q, wrong);
      check(`${q.id}: wrong answer scores 0`, !w.correct && w.earned === 0, `earned ${w.earned}`);
      perfectTotal += earned;
    }
  }

  const total = perfectTotal + sim.stakeholderPoints;
  check(`perfect run totals 100 (${total})`, total === 100);

  const declared =
    sim.questions.reduce((s, q) => s + q.points, 0) + sim.stakeholderPoints;
  check(`declared points total 100 (${declared})`, declared === 100);

  const s = sim.stakeholders[0];
  const relRules = s.responseRules.filter((r) => r.id.startsWith("rel_"));
  check(`has 2-3 rel_ rules (${relRules.length})`, relRules.length >= 2 && relRules.length <= 3);
  for (const rule of relRules) {
    check(
      `rule ${rule.id} has keywords + reply`,
      rule.anyKeywords.length > 0 && rule.reply.length > 0
    );
  }
  check("stakeholder has fallback reply", s.fallbackReply.length > 0);

  const emDash = JSON.stringify(sim).includes("\u2014");
  check("no em dash in content", !emDash);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
