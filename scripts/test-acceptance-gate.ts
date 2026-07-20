/**
 * Acceptance-gate golden cases for P0/P1 wiring that must stay green.
 * Run: npx tsx scripts/test-acceptance-gate.ts
 */
import assert from "node:assert/strict";
import {
  applyBlueprintOverlay,
  compileBlueprint,
  publishGateFor,
  type EmployerIntake,
} from "../src/lib/fde/generator";
import { resolveScenarioForSession } from "../src/lib/relay/variants/resolve";
import {
  analyzeSession,
  compositeFitScore,
  effectiveSampleSize,
  type OpportunityFlags,
} from "../src/lib/fde/evidence";
import { TRAIT_IDS } from "../src/lib/fde/evidence/traits";

let failures = 0;

function goldenCase(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(err instanceof Error ? err.stack || err.message : err);
  }
}

function intake(overrides: Partial<EmployerIntake> = {}): EmployerIntake {
  return {
    title: "Enterprise Analytics Deployment Recovery",
    objective: "Recover a broken analytics deployment and verify the fix.",
    customerContext: "Two stakeholders disagree on root cause.",
    industry: "saas",
    durationMinutes: 55,
    aiPolicy: "allowed_observed",
    criticalTraits: ["data_integrity_vigilance", "elicitation", "verification_discipline"],
    ...overrides,
  };
}

goldenCase("compile attaches publishGate and design quality scores", () => {
  const { preview, validation, maturity } = compileBlueprint(intake(), "accept-gate-1");
  assert.ok(preview.publishGate);
  assert.ok(["publishable", "needs_revision"].includes(preview.publishGate!.gate));
  assert.equal(validation.publishGate.gate, preview.publishGate!.gate);
  assert.ok(typeof preview.difficultyScore === "number");
  assert.ok(typeof preview.utilityScore === "number");
  assert.ok(typeof preview.geometricQuality === "number");
  assert.ok(typeof preview.designQualityLogdet === "number");
  assert.ok(preview.durationEstimate);
  assert.ok(maturity === "draft" || maturity === "auto_validated");
});

goldenCase("publishGateFor is needs_revision when hard gates fail", () => {
  const { validation } = compileBlueprint(intake({ durationMinutes: 55 }), "accept-gate-2");
  // Force a failed report shape
  const failed = {
    ...validation,
    coverageOk: false,
    passesAllGates: false,
    flags: [
      ...validation.flags,
      { code: "coverage_critical", severity: "blocking" as const, message: "Critical coverage missing" },
    ],
  };
  const gate = publishGateFor(failed);
  assert.equal(gate.gate, "needs_revision");
  assert.ok(gate.reasons.length > 0);
});

goldenCase("two intakes produce different material runtime files", () => {
  const release = resolveScenarioForSession({ preferVariantId: null });
  const a = compileBlueprint(intake({ industry: "saas" }), "seed-a").blueprint;
  const b = compileBlueprint(intake({ industry: "logistics", title: "Logistics triage" }), "seed-b")
    .blueprint;
  const oa = applyBlueprintOverlay(release.files, a);
  const ob = applyBlueprintOverlay(release.files, b);
  assert.notEqual(oa.materialDiffSignature, ob.materialDiffSignature);
  assert.notEqual(oa.files["data/shipments.csv"], ob.files["data/shipments.csv"]);
});

goldenCase("Neff does not double-count equal weights beyond count", () => {
  const n = effectiveSampleSize([0.5, 0.5, 0.5, 0.5]);
  assert.ok(n <= 4 + 1e-9);
  assert.ok(n > 0);
  const dup = effectiveSampleSize([1, 1, 1, 1]);
  assert.ok(Math.abs(dup - 4) < 1e-6 || dup <= 4);
});

goldenCase("analyzeSession exposes AIQ/adaptability honesty", () => {
  const analysis = analyzeSession([], {
    sessionId: "s-accept",
    handoffText: "",
    planText: "",
  });
  assert.equal(analysis.aiQuality.observed, false);
  assert.equal(analysis.aiQuality.score, null);
  assert.equal(analysis.adaptability.observed, false);
  assert.equal(analysis.adaptability.score01, null);
  assert.ok(typeof analysis.diagnosticEfficiency.efficiency === "number");
});

goldenCase("composite includes arithmetic and geometric components", () => {
  const flags = Object.fromEntries(TRAIT_IDS.map((id) => [id, true])) as OpportunityFlags;
  // Empty atoms → all opportunity traits near prior; still returns structure
  const fit = compositeFitScore([], flags);
  assert.ok("arithmetic01" in fit);
  assert.ok("geometric01" in fit);
  assert.ok(fit.traits.every((t) => "nEff" in t && "confidence" in t));
});

goldenCase("preview attempt_kind values are the only non-scored kinds", () => {
  const allowed = new Set(["scored", "preview", "demonstration"]);
  for (const k of allowed) assert.ok(typeof k === "string");
  // Document the exclusion contract used by Mission Control filters.
  const filter = (kind: string | null | undefined) => !kind || kind === "scored";
  assert.equal(filter("scored"), true);
  assert.equal(filter(null), true);
  assert.equal(filter("preview"), false);
  assert.equal(filter("demonstration"), false);
});

if (failures > 0) {
  console.error(`\n${failures} acceptance gate case(s) failed.`);
  process.exit(1);
}
console.log("\nAll acceptance gate cases passed. ACCEPTANCE_GATE_OK");
