/**
 * October pilot unit checks (no live database).
 * Run: npx tsx --conditions react-server scripts/test-october-pilot.ts
 */
import { MICRO_OPS_YIELD, PILOT_EVALUATION_SLUG } from "../src/lib/simulations/content/micro-ops-yield";
import { validateMicroSim } from "../src/lib/simulations/micro-types";
import { microToV2 } from "../src/lib/simulations/v2/from-micro";
import { scoreV2Attempt } from "../src/lib/simulations/v2/scoring";
import { buildDefenseQuestions } from "../src/lib/pilot/defense-questions";
import { evaluatePreflight } from "../src/lib/pilot/preflight-eval";
import {
  normalizeAllowedFields,
  RECEIPT_FIELD_CATALOG,
} from "../src/lib/pilot/receipt-fields";
import { invitationGate } from "../src/lib/simulations/invitation-gate";
import { ALL_SIMULATIONS } from "../src/lib/simulations/content/index";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    console.error(`  FAIL ${name}${detail ? ` - ${detail}` : ""}`);
    failures++;
  }
}

console.log("ops yield content");
check("slug pinned", MICRO_OPS_YIELD.slug === PILOT_EVALUATION_SLUG);
check("registered in catalog", ALL_SIMULATIONS.some((s) => s.slug === PILOT_EVALUATION_SLUG));
const contentErrors = validateMicroSim(MICRO_OPS_YIELD);
check("validates", contentErrors.length === 0, contentErrors.join("; "));
check("has curveball", Boolean(MICRO_OPS_YIELD.curveball));
check("duration 20", MICRO_OPS_YIELD.durationMinutes === 20);

console.log("\nv2 adapter + scoring");
const def = microToV2(MICRO_OPS_YIELD);
check("emits curveball module", def.modules.some((m) => m.kind === "curveball"));
check("adaptation opportunity", def.scoring.opportunities.some((o) => o.id === "opp_curveball"));

const strong = scoreV2Attempt(def, {
  events: [
    { event_type: "resource_opened", payload: {}, resource_id: "production_runs" },
    { event_type: "resource_opened", payload: {}, resource_id: "quality_events" },
    { event_type: "resource_opened", payload: {}, resource_id: "metric_reporting" },
    { event_type: "curveball_presented", payload: {} },
    { event_type: "curveball_acknowledged", payload: {} },
    { event_type: "message_received", payload: { ruleId: "rel_reclass" } },
  ],
  decisions: {
    primary_driver: "A mid-period classification/reporting change that treats holds like scrap",
    residual_segment: "Line L2 Day shift (elevated rework/scrap beyond reclass holds)",
    evidence_rows: [
      "HOLD_RECLASS events appearing only in the current period",
      "Reporting note: prior period not restated",
      "L2 Day elevated REWORK_FIT / SCRAP_MATERIAL alongside holds",
    ],
  },
  written: {
    recommendation:
      "Most of the plant-wide yield drop is a mid-period HOLD_RECLASS mapping treated like scrap without restating prior data. Residual risk remains on L2 Day rework/scrap. Caveat: mid-period timing makes exact attribution approximate. Next: validate open holds and audit L2 Day fit defects before the next shift huddle.",
  },
  evidenceIds: [
    "HOLD_RECLASS events appearing only in the current period",
    "Reporting note: prior period not restated",
    "L2 Day elevated REWORK_FIT / SCRAP_MATERIAL alongside holds",
  ],
  stakeholderRuleIds: ["rel_reclass"],
});
check("strong path scores", (strong.performance ?? 0) >= 70, `got ${strong.performance}`);
check("coverage separate", strong.coverage > 0 && strong.coverage <= 1);

const empty = scoreV2Attempt(def, {
  events: [],
  decisions: {},
  written: {},
  evidenceIds: [],
  stakeholderRuleIds: [],
});
check("empty path insufficient or low coverage", empty.coverage < 0.35 || empty.performance === null);

console.log("\ndefense + preflight + receipt");
const qs = buildDefenseQuestions({
  strengths: ["Named reclass"],
  improvements: ["Need L2 validation"],
  evidence: [{ id: "opp_primary_driver", claim: "Reclass drove the apparent decline" }],
});
check("3-5 defense questions", qs.length >= 3 && qs.length <= 5);

const pfOk = evaluatePreflight({
  viewportWidth: 1280,
  viewportHeight: 800,
  userAgent: "Mozilla/5.0",
  localStorageOk: true,
  networkOk: true,
});
check("desktop preflight passes", pfOk.browserOk && pfOk.desktopSuitable && pfOk.networkOk);

const pfMobile = evaluatePreflight({
  viewportWidth: 390,
  viewportHeight: 844,
  userAgent: "Mozilla/5.0",
  networkOk: true,
});
check("mobile preflight fails desktop", !pfMobile.desktopSuitable);

const fields = normalizeAllowedFields(["role_title", "bogus", "scenario_score"]);
check("receipt fields filtered", fields.includes("role_title") && !fields.includes("bogus" as never));
check("receipt catalog non-empty", RECEIPT_FIELD_CATALOG.length >= 8);

console.log("\ninvitation gates");
const base = {
  status: "sent",
  expires_at: new Date(Date.now() + 86400000).toISOString(),
};
check("valid invite ok", invitationGate(base).ok);
check("revoked blocked", !invitationGate({ ...base, status: "revoked" }).ok);
check("completed blocked", !invitationGate({ ...base, status: "completed" }).ok);
check(
  "expired blocked",
  !invitationGate({ ...base, expires_at: new Date(Date.now() - 1000).toISOString() }).ok
);

if (failures) {
  console.error(`\n${failures} october pilot check(s) failed`);
  process.exit(1);
}
console.log("\nAll october pilot checks passed.");
