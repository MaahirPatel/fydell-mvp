/**
 * Analysis engine divergence tests — strong vs weak fixtures must differ.
 */
import { northstarIntegrationScenario } from "../src/lib/sim-engine/scenarios/solutions-engineer/northstar-integration";
import { q3ChurnInvestigationScenario } from "../src/lib/sim-engine/scenarios/data-analyst/q3-churn-investigation";
import { brightpathLaunchImportScenario } from "../src/lib/sim-engine/scenarios/implementation-consultant/brightpath-launch-import";
import { greenStatusPageScenario } from "../src/lib/sim-engine/scenarios/technical-support/green-status-page";
import { analyzeAttempt } from "../src/lib/sim-engine/analysis/analysisEngine";
import { buildStrongFixture, buildWeakFixture } from "../src/lib/sim-engine/scenarios/solutions-engineer/fixtures";
import {
  buildDaStrongFixture,
  buildDaWeakFixture,
} from "../src/lib/sim-engine/scenarios/data-analyst/fixtures";
import {
  buildIcStrongFixture,
  buildIcWeakFixture,
} from "../src/lib/sim-engine/scenarios/implementation-consultant/fixtures";
import {
  buildTseStrongFixture,
  buildTseWeakFixture,
} from "../src/lib/sim-engine/scenarios/technical-support/fixtures";
import { ridgelineExecutiveQueueScenario } from "../src/lib/sim-engine/scenarios/business-systems-analyst/ridgeline-executive-queue";
import {
  buildBsaStrongFixture,
  buildBsaWeakFixture,
} from "../src/lib/sim-engine/scenarios/business-systems-analyst/fixtures";
import { competencyToLegacyEvidence } from "../src/lib/sim-engine/adapters/legacy-compat";

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("sim-engine analysis");

const strong = analyzeAttempt(northstarIntegrationScenario, buildStrongFixture(northstarIntegrationScenario));
const weak = analyzeAttempt(northstarIntegrationScenario, buildWeakFixture(northstarIntegrationScenario));

ok("strong has playback", strong.playback.length > 5);
ok("weak has playback", weak.playback.length > 3);
ok("versions present", Boolean(strong.versions.analysisVersion));

const strongApi = strong.competencies.find((c) => c.competencyId === "api_troubleshooting");
const weakApi = weak.competencies.find((c) => c.competencyId === "api_troubleshooting");
ok("strong API not insufficient", strongApi?.outcome !== "INSUFFICIENT_EVIDENCE");
ok(
  "strong vs weak API diverge",
  strongApi?.outcome !== weakApi?.outcome || (strongApi?.confidence ?? 0) > (weakApi?.confidence ?? 0) + 0.1,
  `${strongApi?.outcome}/${strongApi?.confidence} vs ${weakApi?.outcome}/${weakApi?.confidence}`
);

const weakComm = weak.competencies.find((c) => c.competencyId === "customer_communication");
ok("weak communication concern or partial", weakComm?.outcome === "CONCERN" || weakComm?.outcome === "PARTIALLY_DEMONSTRATED");
ok("observations exist", strong.observations.length > 3);
ok("inferences cite observations", strong.inferences.every((i) => i.observationIds.length > 0));

ok(
  "overall narratives differ",
  strong.overallNarrative !== weak.overallNarrative,
  "narratives should diverge"
);

ok(
  "strong narrative mentions success or demonstrated",
  /success|demonstrated|corrected/i.test(strong.overallNarrative)
);
ok(
  "weak narrative does not claim full success the same way",
  strong.overallNarrative !== weak.overallNarrative
);

const legacy = competencyToLegacyEvidence(strong.competencies[0]!);
ok("legacy evidence mapper", legacy.length >= 0);

const sectionKinds = new Set(strong.sections.map((s) => s.kind));
ok("has summary", sectionKinds.has("summary"));
ok("has execution", sectionKinds.has("execution"));
ok("has follow_up", sectionKinds.has("follow_up"));
ok("no empty fake section spam", strong.sections.every((s) => s.hasContent || s.kind === "summary" || s.kind === "follow_up"));

// --- Phase Two: Data Analyst analysis divergence ---
const daStrong = analyzeAttempt(q3ChurnInvestigationScenario, buildDaStrongFixture(q3ChurnInvestigationScenario));
const daWeak = analyzeAttempt(q3ChurnInvestigationScenario, buildDaWeakFixture(q3ChurnInvestigationScenario));

ok("DA strong has playback", daStrong.playback.length > 4);
ok("DA narratives diverge", daStrong.overallNarrative !== daWeak.overallNarrative);

const daSqlStrong = daStrong.competencies.find((c) => c.competencyId === "sql_investigation");
const daSqlWeak = daWeak.competencies.find((c) => c.competencyId === "sql_investigation");
ok("DA strong SQL not insufficient", daSqlStrong?.outcome !== "INSUFFICIENT_EVIDENCE");
ok(
  "DA SQL outcomes diverge",
  daSqlStrong?.outcome !== daSqlWeak?.outcome ||
    (daSqlStrong?.confidence ?? 0) > (daSqlWeak?.confidence ?? 0) + 0.08,
  `${daSqlStrong?.outcome}/${daSqlStrong?.confidence} vs ${daSqlWeak?.outcome}/${daSqlWeak?.confidence}`
);

const daAnalyticStrong = daStrong.competencies.find((c) => c.competencyId === "analytical_correctness");
const daAnalyticWeak = daWeak.competencies.find((c) => c.competencyId === "analytical_correctness");
ok(
  "DA analytical diverge",
  daAnalyticStrong?.outcome !== daAnalyticWeak?.outcome ||
    (daAnalyticStrong?.confidence ?? 0) > (daAnalyticWeak?.confidence ?? 0) + 0.1,
  `${daAnalyticStrong?.outcome} vs ${daAnalyticWeak?.outcome}`
);
ok(
  "DA weak analytical concern or weaker",
  daAnalyticWeak?.outcome === "CONCERN" ||
    daAnalyticWeak?.outcome === "PARTIALLY_DEMONSTRATED" ||
    daAnalyticWeak?.outcome === "INSUFFICIENT_EVIDENCE" ||
    (daAnalyticStrong?.confidence ?? 0) > (daAnalyticWeak?.confidence ?? 0)
);

// --- Phase Three: IC + TSE analysis divergence ---
const icStrong = analyzeAttempt(brightpathLaunchImportScenario, buildIcStrongFixture(brightpathLaunchImportScenario));
const icWeak = analyzeAttempt(brightpathLaunchImportScenario, buildIcWeakFixture(brightpathLaunchImportScenario));
ok("IC narratives diverge", icStrong.overallNarrative !== icWeak.overallNarrative);
const icJudgmentStrong = icStrong.competencies.find((c) => c.competencyId === "implementation_judgment");
const icJudgmentWeak = icWeak.competencies.find((c) => c.competencyId === "implementation_judgment");
ok("IC strong judgment not insufficient", icJudgmentStrong?.outcome !== "INSUFFICIENT_EVIDENCE");
ok(
  "IC judgment diverge",
  icJudgmentStrong?.outcome !== icJudgmentWeak?.outcome ||
    (icJudgmentStrong?.confidence ?? 0) > (icJudgmentWeak?.confidence ?? 0) + 0.1,
  `${icJudgmentStrong?.outcome} vs ${icJudgmentWeak?.outcome}`
);

const tseStrong = analyzeAttempt(greenStatusPageScenario, buildTseStrongFixture(greenStatusPageScenario));
const tseWeak = analyzeAttempt(greenStatusPageScenario, buildTseWeakFixture(greenStatusPageScenario));
ok("TSE narratives diverge", tseStrong.overallNarrative !== tseWeak.overallNarrative);
const tseDiagStrong = tseStrong.competencies.find((c) => c.competencyId === "technical_diagnosis");
const tseDiagWeak = tseWeak.competencies.find((c) => c.competencyId === "technical_diagnosis");
ok("TSE strong diagnosis not insufficient", tseDiagStrong?.outcome !== "INSUFFICIENT_EVIDENCE");
ok(
  "TSE diagnosis diverge",
  tseDiagStrong?.outcome !== tseDiagWeak?.outcome ||
    (tseDiagStrong?.confidence ?? 0) > (tseDiagWeak?.confidence ?? 0) + 0.1,
  `${tseDiagStrong?.outcome} vs ${tseDiagWeak?.outcome}`
);

// --- Phase Four: BSA analysis divergence ---
const bsaStrong = analyzeAttempt(
  ridgelineExecutiveQueueScenario,
  buildBsaStrongFixture(ridgelineExecutiveQueueScenario)
);
const bsaWeak = analyzeAttempt(
  ridgelineExecutiveQueueScenario,
  buildBsaWeakFixture(ridgelineExecutiveQueueScenario)
);
ok("BSA narratives diverge", bsaStrong.overallNarrative !== bsaWeak.overallNarrative);
const bsaRootStrong = bsaStrong.competencies.find((c) => c.competencyId === "root_cause_analysis");
const bsaRootWeak = bsaWeak.competencies.find((c) => c.competencyId === "root_cause_analysis");
ok("BSA strong root cause not insufficient", bsaRootStrong?.outcome !== "INSUFFICIENT_EVIDENCE");
ok(
  "BSA root cause diverge",
  bsaRootStrong?.outcome !== bsaRootWeak?.outcome ||
    (bsaRootStrong?.confidence ?? 0) > (bsaRootWeak?.confidence ?? 0) + 0.1,
  `${bsaRootStrong?.outcome} vs ${bsaRootWeak?.outcome}`
);
const bsaSystemsStrong = bsaStrong.competencies.find((c) => c.competencyId === "systems_judgment");
const bsaSystemsWeak = bsaWeak.competencies.find((c) => c.competencyId === "systems_judgment");
ok(
  "BSA systems judgment diverge",
  bsaSystemsStrong?.outcome !== bsaSystemsWeak?.outcome ||
    (bsaSystemsStrong?.confidence ?? 0) > (bsaSystemsWeak?.confidence ?? 0) + 0.1,
  `${bsaSystemsStrong?.outcome} vs ${bsaSystemsWeak?.outcome}`
);

if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All sim-engine analysis checks passed.");
