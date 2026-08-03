/**
 * Tests for SimulationDefinitionV2 adapter + scorer.
 * Run with: npm run test:v2
 */
import { MICRO_DATA_ANALYST } from "../src/lib/simulations/content/micro-data-analytics";
import {
  microToV2,
  toV2CandidateView,
  validateV2,
  scoreV2Attempt,
  type V2AttemptInput,
} from "../src/lib/simulations/v2";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

console.log("microToV2 + validate");
const def = microToV2(MICRO_DATA_ANALYST);
const errors = validateV2(def);
check("validateV2 passes", errors.length === 0, errors.join("; "));
check("format v2", def.format === "v2" && def.schemaVersion === 2);
check("slug preserved", def.slug === "missing-delays");
check("legacyMicro present", Boolean(def.legacyMicro));
check(
  "has data_workbench",
  def.modules.some((m) => m.kind === "data_workbench")
);
check(
  "has structured_decision modules",
  def.modules.filter((m) => m.kind === "structured_decision").length >= 3
);
check(
  "has written_deliverable",
  def.modules.some((m) => m.kind === "written_deliverable")
);

function perfectInput(d: typeof def): V2AttemptInput {
  const decisions: Record<string, string | number | string[]> = {};
  const written: Record<string, string> = {};
  for (const m of d.modules) {
    if (m.kind === "structured_decision" && m.answer) {
      if (m.decisionKind === "single_select") decisions[m.id] = String(m.answer[0]);
      else if (m.decisionKind === "number") decisions[m.id] = m.answer[0] as number;
      else if (m.decisionKind === "multi_select") decisions[m.id] = m.answer.map(String);
    }
    if (m.kind === "written_deliverable" && m.concepts) {
      written[m.id] =
        "I recommend we normalize order IDs and strip hyphens before joining. " +
        "Validate the match rate and alert on unmatched delay records so this cannot silently recur.";
    }
  }
  const events = [
    ...MICRO_DATA_ANALYST.resources.map((r) => ({
      type: "resource_opened" as const,
      resourceId: r.id,
    })),
    ...Object.keys(decisions).map((id) => ({
      type: (Array.isArray(decisions[id]) ? "evidence_selected" : "decision_selected") as
        | "evidence_selected"
        | "decision_selected",
      moduleId: id,
    })),
    ...Object.keys(written).map((id) => ({
      type: "deliverable_revised" as const,
      moduleId: id,
    })),
    { type: "stakeholder_message_sent" as const },
    {
      type: "stakeholder_reply_received" as const,
      ruleId: "rel_hyphens",
    },
    { type: "submitted" as const },
  ];
  return {
    events,
    decisions,
    written,
    stakeholderRuleIds: ["rel_hyphens"],
  };
}

console.log("\nperfect path");
const perfect = scoreV2Attempt(def, perfectInput(def));
check("engineVersion v2", perfect.engineVersion === "v2");
check(
  "high performance",
  perfect.performance !== null && perfect.performance >= 85,
  `got ${perfect.performance}`
);
check("high coverage", perfect.coverage >= 0.85, `got ${perfect.coverage}`);
check(
  "band strong or established",
  perfect.band === "strong" || perfect.band === "established",
  `got ${perfect.band}`
);

console.log("\nempty path");
const empty = scoreV2Attempt(def, { events: [], decisions: {}, written: {} });
check("low coverage", empty.coverage < 0.45, `got ${empty.coverage}`);
check("insufficient band", empty.band === "insufficient", `got ${empty.band}`);

console.log("\ndeterminism");
const a = scoreV2Attempt(def, perfectInput(def));
const b = scoreV2Attempt(def, perfectInput(def));
check("two runs equal", JSON.stringify(a) === JSON.stringify(b));

console.log("\ncandidate view");
const view = toV2CandidateView(def);
const viewJson = JSON.stringify(view);
check("no answer fields", !/"answer"\s*:/.test(viewJson));
check(
  "no opportunity weights",
  !view.opportunities.some((o) => "weight" in o),
  view.opportunities.map((o) => Object.keys(o).join(",")).join(" | ")
);
check("no scoring.indicators", !("scoring" in view));
check("no legacyMicro", !("legacyMicro" in view));
check(
  "modules keep prompts/options",
  view.modules.some(
    (m) => m.kind === "structured_decision" && Array.isArray(m.options) && m.options.length > 0
  )
);
check(
  "no concepts on written modules",
  view.modules
    .filter((m) => m.kind === "written_deliverable")
    .every((m) => !("concepts" in m))
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall tests passed");
