/**
 * Generative FDE simulation compiler — acceptance tests.
 *
 * Verifies, against the real generator modules (no mocks):
 *   1. same (intake, seed) -> byte-identical blueprint (createdAt excluded).
 *   2. different seeds -> different company/quirk surface, same structural shape.
 *   3. Coverage for data_integrity_vigilance + elicitation is always >= the
 *      critical floor, regardless of duration or employer skill weights.
 *   4. invalid durations (too short, too long, zero, negative, non-integer)
 *      are rejected with a thrown error, not silently clamped.
 *   5. two different-seed generations are not byte-identical, but their
 *      validation reports carry the same *shape* of flags/gates (measurement-
 *      equivalent), i.e. the compiler's guarantees hold across the seed space.
 *
 * Run: npx tsx scripts/test-fde-generator.ts
 */
import assert from "node:assert/strict";
import { TRAIT_IDS } from "../src/lib/fde/evidence/traits";
import {
  CRITICAL_TRAITS,
  MIN_CRITICAL_COVERAGE,
  affectedSections,
  compileBlueprint,
  coverageProduct,
  criticalPathMinutes,
  designQualityLogdet,
  describeEditImpact,
  durationEstimate,
  embedBlueprintInCustomerContext,
  extractBlueprintFromCustomerContext,
  idealEvidencePosterior,
  jensenShannonDivergence,
  moduleLoadingVector,
  planModules,
  publishGateFor,
  reconcileWeights,
  renderSystemsContextMarkdown,
  selectModulesDOptimal,
  validateAmbiguity,
  defaultScenarioHypotheses,
  applyBlueprintOverlay,
  buildRoleGraph,
  type EmployerIntake,
  type SelectableModule,
} from "../src/lib/fde/generator";
import { resolveScenarioForSession } from "../src/lib/relay/variants/resolve";

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

function baseIntake(overrides: Partial<EmployerIntake> = {}): EmployerIntake {
  return {
    title: "Ops visibility FDE",
    objective: "Give the ops team better visibility into where things are getting stuck, using whatever data is on hand.",
    customerContext: "Mid-size company, two stakeholders who don't fully agree on what 'better visibility' means.",
    industry: "logistics",
    durationMinutes: 55,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Determinism
// ---------------------------------------------------------------------------

function withoutCreatedAt<T extends { blueprint: { createdAt: string } }>(result: T) {
  return { ...result, blueprint: { ...result.blueprint, createdAt: "" } };
}

goldenCase("same seed -> byte-identical blueprint (createdAt excluded)", () => {
  const intake = baseIntake();
  const a = compileBlueprint(intake, "seed-alpha-001");
  const b = compileBlueprint(intake, "seed-alpha-001");
  assert.deepEqual(withoutCreatedAt(a), withoutCreatedAt(b), "identical intake+seed must produce identical output");
  assert.equal(a.blueprint.blueprintId, b.blueprint.blueprintId, "blueprintId must be stable for the same intake+seed");
});

goldenCase("same seed, called twice for files preview -> byte-identical file contents", () => {
  const intake = baseIntake();
  const a = compileBlueprint(intake, "seed-files-001");
  const b = compileBlueprint(intake, "seed-files-001");
  assert.deepEqual(a.filesPreview, b.filesPreview);
});

// ---------------------------------------------------------------------------
// 2. Different seed -> different surface
// ---------------------------------------------------------------------------

goldenCase("different seeds -> different company name, ask, and data quirk", () => {
  const intake = baseIntake();
  const seeds = ["seed-001", "seed-002", "seed-003", "seed-004", "seed-005", "seed-006"];
  const results = seeds.map((seed) => compileBlueprint(intake, seed));

  const companyNames = new Set(results.map((r) => r.blueprint.world.companyName));
  const asks = new Set(results.map((r) => r.blueprint.world.ask));
  const quirks = new Set(results.map((r) => r.blueprint.world.dataQuirk));

  assert.ok(companyNames.size > 1, "at least two distinct company names across 6 seeds");
  assert.ok(asks.size > 1, "at least two distinct ask phrasings across 6 seeds");
  assert.ok(quirks.size >= 1 && quirks.size <= 3, "data quirk must always be one of the closed 3-value enum");
  for (const q of quirks) {
    assert.ok(["leading_zero", "excel_strip", "id_prefix"].includes(q), `unexpected data quirk: ${q}`);
  }
});

goldenCase("different seeds -> distinct stakeholder identities within each world", () => {
  const intake = baseIntake();
  for (const seed of ["seed-a", "seed-b", "seed-c"]) {
    const { blueprint } = compileBlueprint(intake, seed);
    assert.notEqual(blueprint.world.stakeholderA.id, blueprint.world.stakeholderB.id);
    assert.notEqual(blueprint.world.stakeholderA.name, blueprint.world.stakeholderB.name);
  }
});

// ---------------------------------------------------------------------------
// 3. Critical coverage always present
// ---------------------------------------------------------------------------

goldenCase("coverage for data_integrity_vigilance + elicitation always meets the critical floor", () => {
  assert.deepEqual(new Set(CRITICAL_TRAITS), new Set(["data_integrity_vigilance", "elicitation"]));
  const durations = [20, 30, 45, 55, 90, 120];
  for (const durationMinutes of durations) {
    const { blueprint, validation } = compileBlueprint(baseIntake({ durationMinutes }), `seed-dur-${durationMinutes}`);
    for (const traitId of CRITICAL_TRAITS) {
      assert.ok(
        blueprint.coverage[traitId] >= MIN_CRITICAL_COVERAGE,
        `duration=${durationMinutes}: ${traitId} coverage ${blueprint.coverage[traitId]} below floor ${MIN_CRITICAL_COVERAGE}`
      );
    }
    assert.equal(validation.coverageOk, true, `duration=${durationMinutes}: coverageOk must be true`);
  }
});

goldenCase("coverage floor holds even with adversarial employer skill weights (all weight on one unrelated trait)", () => {
  const { blueprint } = compileBlueprint(
    baseIntake({ skillWeights: { ai_tool_judgment: 100 } }),
    "seed-adversarial-weights"
  );
  for (const traitId of CRITICAL_TRAITS) {
    assert.ok(blueprint.coverage[traitId] >= MIN_CRITICAL_COVERAGE);
  }
});

// ---------------------------------------------------------------------------
// 4. Invalid duration rejected
// ---------------------------------------------------------------------------

goldenCase("invalid durations are rejected, not silently clamped", () => {
  const invalidDurations = [0, -10, 5, 19, 121, 500, NaN, Infinity, 30.5];
  for (const durationMinutes of invalidDurations) {
    assert.throws(
      () => compileBlueprint(baseIntake({ durationMinutes }), "seed-invalid-duration"),
      undefined,
      `duration ${durationMinutes} should have been rejected`
    );
  }
  // Bounds are inclusive -- exactly-at-the-edge durations must succeed.
  assert.doesNotThrow(() => compileBlueprint(baseIntake({ durationMinutes: 20 }), "seed-min-duration"));
  assert.doesNotThrow(() => compileBlueprint(baseIntake({ durationMinutes: 120 }), "seed-max-duration"));
});

goldenCase("empty seed is rejected", () => {
  assert.throws(() => compileBlueprint(baseIntake(), ""));
  assert.throws(() => compileBlueprint(baseIntake(), "   "));
});

// ---------------------------------------------------------------------------
// 5. Leak check -- distinct generations, measurement-equivalent guarantees
// ---------------------------------------------------------------------------

goldenCase("two different-seed generations are not byte-identical but carry measurement-equivalent validation shape", () => {
  const intake = baseIntake();
  const a = compileBlueprint(intake, "seed-leak-a");
  const b = compileBlueprint(intake, "seed-leak-b");

  assert.notDeepEqual(a.blueprint.world, b.blueprint.world, "two different seeds must not produce the same world");
  assert.notEqual(
    JSON.stringify(a.filesPreview),
    JSON.stringify(b.filesPreview),
    "two different seeds must not produce byte-identical generated files"
  );

  // Measurement-equivalent: same set of trait ids scored, same episode ids
  // planned (same intake+duration), same validation-flag *codes* even though
  // the underlying values differ.
  assert.deepEqual(Object.keys(a.blueprint.coverage).sort(), Object.keys(b.blueprint.coverage).sort());
  assert.deepEqual(
    a.blueprint.episodes.map((e) => e.id).sort(),
    b.blueprint.episodes.map((e) => e.id).sort(),
    "same intake+duration must plan the same episode set regardless of seed"
  );
  assert.equal(a.validation.consistencyOk, true);
  assert.equal(b.validation.consistencyOk, true);
  assert.equal(a.maturity, "auto_validated");
  assert.equal(b.maturity, "auto_validated");
});

goldenCase("leak similarity is low against the known-good Northbeam template for a generated logistics world", () => {
  const { validation } = compileBlueprint(baseIntake(), "seed-leak-similarity-check");
  assert.ok(
    validation.leakSimilarity < 0.6,
    `generated world should read as distinct from the known-good template, got similarity ${validation.leakSimilarity}`
  );
  assert.equal(validation.leakOk, true);
});

// ---------------------------------------------------------------------------
// Bonus coverage: role-compiler weight blending + mission-bridge round-trip
// ---------------------------------------------------------------------------

goldenCase("reconcileWeights always returns a distribution summing to ~1 across all 10 traits", () => {
  const cases: EmployerIntake[] = [
    baseIntake(),
    baseIntake({ skillWeights: {} }),
    baseIntake({ skillWeights: { data_integrity_vigilance: 80, elicitation: 20 } }),
    baseIntake({ objective: "", customerContext: "", title: "" }),
  ];
  for (const intake of cases) {
    const { preferenceVector } = reconcileWeights(intake);
    assert.equal(TRAIT_IDS.length, Object.keys(preferenceVector).length);
    const sum = TRAIT_IDS.reduce((s, id) => s + preferenceVector[id], 0);
    assert.ok(Math.abs(sum - 1) < 1e-6, `preference vector must sum to 1, got ${sum}`);
    for (const id of TRAIT_IDS) assert.ok(preferenceVector[id] >= 0, `${id} weight must be non-negative`);
  }
});

goldenCase("jensenShannonDivergence is 0 for identical distributions and bounded in [0,1]", () => {
  const { preferenceVector } = reconcileWeights(baseIntake());
  assert.equal(jensenShannonDivergence(preferenceVector, preferenceVector), 0);

  const skewed = reconcileWeights(baseIntake({ skillWeights: { ai_tool_judgment: 100 } })).preferenceVector;
  const d = jensenShannonDivergence(preferenceVector, skewed);
  assert.ok(d >= 0 && d <= 1, `divergence must be bounded [0,1], got ${d}`);
});

goldenCase("mission-bridge: blueprint JSON round-trips losslessly through the customer_context footer", () => {
  const { blueprint } = compileBlueprint(baseIntake(), "seed-mission-bridge");
  const embedded = embedBlueprintInCustomerContext("Original employer-written context.\n", blueprint);
  assert.ok(embedded.includes("Original employer-written context."));
  const recovered = extractBlueprintFromCustomerContext(embedded);
  assert.deepEqual(recovered, blueprint);

  // Re-embedding (e.g. regenerate + re-save) must replace, not append, the footer.
  const reEmbedded = embedBlueprintInCustomerContext(embedded, blueprint);
  assert.equal(reEmbedded.split("FDE_GENERATED_BLUEPRINT_JSON_START").length - 1, 1, "must not accumulate duplicate footers");
});

goldenCase("mission-bridge: systems-context markdown is non-empty and mentions the maturity label", () => {
  const { blueprint } = compileBlueprint(baseIntake(), "seed-systems-context");
  const md = renderSystemsContextMarkdown(blueprint);
  assert.ok(md.includes(blueprint.world.companyName));
  assert.ok(md.includes("not outcome-validated"));
});

// ---------------------------------------------------------------------------
// Generative math modules
// ---------------------------------------------------------------------------

goldenCase("coverageProduct uses 1 - prod(1 - B_km), not sum", () => {
  const coverage = coverageProduct([
    [{ traitId: "elicitation", loading: 0.7 }],
    [{ traitId: "elicitation", loading: 0.2 }],
  ]);
  assert.equal(coverage.elicitation, 0.76);
  assert.ok(MIN_CRITICAL_COVERAGE >= 0.7, "critical floor must be at least 0.70");
});

goldenCase("weight normalize returns a distribution summing to ~1 (reconcileWeights)", () => {
  const { preferenceVector } = reconcileWeights(baseIntake({ skillWeights: { elicitation: 3, data_integrity_vigilance: 1 } }));
  const sum = TRAIT_IDS.reduce((s, id) => s + preferenceVector[id], 0);
  assert.ok(Math.abs(sum - 1) < 1e-6);
  assert.ok(preferenceVector.elicitation > preferenceVector.technical_execution);
});

goldenCase("edit-graph propagates dependencies for duration and rootCause edits", () => {
  const durationSections = affectedSections({ section: "duration", field: "durationMinutes", nextValue: 90 });
  assert.ok(durationSections.includes("episodes"));
  assert.ok(durationSections.includes("coverage"));

  const rootCauseSections = affectedSections({ section: "rootCause", field: "dataQuirk" });
  assert.ok(rootCauseSections.includes("artifacts"));
  assert.ok(rootCauseSections.includes("evidence"));

  const impact = describeEditImpact({ section: "aiPolicy", field: "policy" });
  assert.ok(impact.includes("AI usage policy"));
  assert.ok(impact.toLowerCase().includes("ai enforcement rules"));
});

goldenCase("ambiguity entropy is bounded and ideal evidence reduces it", () => {
  const hypotheses = defaultScenarioHypotheses("leading_zero");
  const afterIdeal = idealEvidencePosterior(hypotheses);
  const result = validateAmbiguity(hypotheses, afterIdeal);
  assert.ok(result.entropy >= result.hMin);
  assert.ok(result.entropy <= result.hMax);
  assert.ok(result.entropyAfterIdeal < result.entropy);
  assert.equal(result.ok, true);
});

goldenCase("compiled blueprint includes difficulty, utility, and quality summaries", () => {
  const { blueprint, validation, preview } = compileBlueprint(baseIntake(), "seed-math-modules");
  assert.ok(blueprint.difficulty);
  assert.equal(blueprint.difficulty?.parameterSource, "expert_prior");
  assert.ok((blueprint.difficulty?.score ?? 0) >= 0 && (blueprint.difficulty?.score ?? 0) <= 1);
  assert.ok(blueprint.utility);
  assert.ok((blueprint.utility?.score ?? 0) >= 0 && (blueprint.utility?.score ?? 0) <= 1);
  assert.ok(blueprint.quality);
  assert.ok((blueprint.quality?.geometricQuality ?? 0) > 0);
  assert.ok(typeof validation.utilityScore === "number");
  assert.ok(validation.qualitySummary.geometricQuality > 0);
  assert.equal(validation.solvableOk, true);
  assert.equal(validation.traceableOk, true);
  assert.equal(validation.ambiguityOk, true);
  assert.ok(validation.publishGate);
  assert.equal(validation.publishGate.gate, "publishable");
  assert.ok(preview.publishGate?.gate === "publishable");
  assert.ok(typeof preview.designQualityLogdet === "number");
  assert.ok(preview.durationEstimate && Number.isFinite(preview.durationEstimate.criticalPathMinutes));
});

// ---------------------------------------------------------------------------
// Depth-P1: D-optimal selection, CPM duration, publish gate
// ---------------------------------------------------------------------------

goldenCase("logdet increases when adding an informative module", () => {
  const base: SelectableModule[] = [
    {
      id: "a",
      estimatedMinutes: 5,
      loadings: [{ traitId: "elicitation", loading: 0.7 }],
    },
  ];
  const informative: SelectableModule = {
    id: "b",
    estimatedMinutes: 10,
    loadings: [
      { traitId: "data_integrity_vigilance", loading: 0.85 },
      { traitId: "verification_discipline", loading: 0.4 },
    ],
  };
  const before = designQualityLogdet(base);
  const after = designQualityLogdet([...base, informative]);
  assert.ok(after > before, `expected logdet to rise: before=${before} after=${after}`);
  assert.equal(moduleLoadingVector(informative.loadings).length, 10);
});

goldenCase("two preference configs select different optional module sets when expected", () => {
  const catalog: SelectableModule[] = [
    {
      id: "intake_brief",
      mandatory: true,
      estimatedMinutes: 5,
      loadings: [{ traitId: "elicitation", loading: 0.7 }],
    },
    {
      id: "data_defect_trap",
      mandatory: true,
      estimatedMinutes: 15,
      loadings: [{ traitId: "data_integrity_vigilance", loading: 0.85 }],
    },
    {
      id: "verification_gate",
      mandatory: true,
      estimatedMinutes: 10,
      loadings: [{ traitId: "technical_execution", loading: 0.6 }],
    },
    {
      id: "handoff_submission",
      mandatory: true,
      estimatedMinutes: 8,
      loadings: [{ traitId: "limitation_honesty", loading: 0.7 }],
    },
    {
      id: "stakeholder_contradiction",
      mandatory: false,
      estimatedMinutes: 8,
      loadings: [{ traitId: "contradiction_handling", loading: 0.8 }],
    },
    {
      id: "curveball_event",
      mandatory: false,
      estimatedMinutes: 6,
      loadings: [
        { traitId: "scope_renegotiation", loading: 0.75 },
        { traitId: "prioritization_under_pressure", loading: 0.75 },
      ],
    },
  ];

  const uniform = Object.fromEntries(TRAIT_IDS.map((id) => [id, 0.05])) as Record<(typeof TRAIT_IDS)[number], number>;
  const contradictionHeavy = {
    ...uniform,
    contradiction_handling: 0.7,
    scope_renegotiation: 0.01,
    prioritization_under_pressure: 0.01,
  };
  const curveballHeavy = {
    ...uniform,
    scope_renegotiation: 0.4,
    prioritization_under_pressure: 0.4,
    contradiction_handling: 0.01,
  };

  // Budget = mandatory(38) + 8 → both optionals fit initially, but only one can be taken.
  const a = selectModulesDOptimal({
    catalog,
    durationMinutes: 46,
    preferenceVector: contradictionHeavy,
  });
  const b = selectModulesDOptimal({
    catalog,
    durationMinutes: 46,
    preferenceVector: curveballHeavy,
  });

  const aOptional = a.selected.filter((m) => !m.mandatory).map((m) => m.id);
  const bOptional = b.selected.filter((m) => !m.mandatory).map((m) => m.id);
  assert.ok(aOptional.includes("stakeholder_contradiction"), `expected contradiction pick, got ${aOptional}`);
  assert.ok(bOptional.includes("curveball_event"), `expected curveball pick, got ${bOptional}`);
  assert.notDeepEqual(aOptional.sort(), bOptional.sort());
  assert.ok(a.diagnostics.selected.length >= 4);
  assert.ok(a.diagnostics.rejected.length >= 0);
});

goldenCase("publishGate is publishable only when gates pass", () => {
  const { validation } = compileBlueprint(baseIntake(), "seed-publish-gate");
  assert.equal(validation.passesAllGates, true);
  assert.equal(validation.publishGate.gate, "publishable");
  assert.equal(publishGateFor(validation).gate, "publishable");

  const blocked = publishGateFor({
    ...validation,
    coverageOk: false,
    passesAllGates: false,
    flags: [
      ...validation.flags,
      { code: "coverage.critical_below_floor.elicitation", severity: "blocking", message: "forced fail" },
    ],
  });
  assert.equal(blocked.gate, "needs_revision");
  assert.ok(blocked.reasons.length > 0);
});

goldenCase("duration CPM estimate is finite and topo-valid", () => {
  const intake = baseIntake({ durationMinutes: 55 });
  const weights = reconcileWeights(intake);
  const roleGraph = buildRoleGraph(intake, weights.jobSignalHits);
  const planned = planModules(intake.durationMinutes, roleGraph, weights.preferenceVector);
  const cpm = criticalPathMinutes(planned.episodes);
  const est = durationEstimate({ episodes: planned.episodes, ambiguityEntropy: 1.8 });
  assert.ok(Number.isFinite(cpm) && cpm > 0, `CPM must be finite > 0, got ${cpm}`);
  assert.ok(Number.isFinite(est.estimatedMinutes) && est.estimatedMinutes >= cpm);
  assert.equal(est.topoOk, true);
  assert.equal(est.cycles.length, 0);
  assert.ok(est.rangeMinutes.max >= est.rangeMinutes.min);

  const { preview, validation } = compileBlueprint(intake, "seed-cpm");
  assert.ok(validation.durationEstimate);
  assert.ok(Number.isFinite(validation.durationEstimate!.criticalPathMinutes));
  assert.ok(preview.durationEstimate && preview.durationEstimate.criticalPathMinutes > 0);
});

// ---------------------------------------------------------------------------
// Material runtime overlay — two configs must change candidate files
// ---------------------------------------------------------------------------

goldenCase("two employer configs produce different candidate CSV + inbox overlays", () => {
  const release = resolveScenarioForSession({ preferVariantId: null });
  const a = compileBlueprint(
    baseIntake({
      title: "Enterprise Analytics Deployment Recovery",
      industry: "enterprise_analytics",
      customerContext: "Deployed analytics pipeline is failing overnight jobs.",
    }),
    "seed-overlay-a"
  ).blueprint;
  const b = compileBlueprint(
    baseIntake({
      title: "Logistics exception triage",
      industry: "logistics",
      customerContext: "Carriers disagree with the system-of-record on delay rates.",
    }),
    "seed-overlay-b"
  ).blueprint;

  const oa = applyBlueprintOverlay(release.files, a);
  const ob = applyBlueprintOverlay(release.files, b);

  assert.notEqual(oa.companyName, ob.companyName, "company names must differ across seeds");
  assert.notEqual(
    oa.materialDiffSignature,
    ob.materialDiffSignature,
    "material signatures must differ"
  );
  assert.notEqual(
    oa.files["data/shipments.csv"],
    ob.files["data/shipments.csv"],
    "shipments.csv must materially differ"
  );
  assert.notEqual(
    oa.files["data/inbox_thread.json"],
    ob.files["data/inbox_thread.json"],
    "inbox thread must materially differ"
  );
  assert.ok(
    oa.files["data/shipments.csv"]?.includes("shipment_id"),
    "overlay must remap to Relay column names"
  );
  assert.ok(
    oa.files["docs/customer-brief.md"]?.includes(oa.companyName),
    "brief must name the overlaid company"
  );
  // Hidden answer keys must never appear in candidate-visible paths.
  const joined = Object.entries(oa.files)
    .filter(([path]) => !path.includes("evals") && path !== "canonical.json")
    .map(([, body]) => body)
    .join("\n");
  assert.ok(!/reference_solution|hidden_root_cause|answer_key/i.test(joined));
});

// ---------------------------------------------------------------------------

if (failures > 0) {
  console.error(`\n${failures} golden case(s) failed.`);
  process.exit(1);
}
console.log("\nAll FDE generator golden cases passed. FDE_GENERATOR_OK");
