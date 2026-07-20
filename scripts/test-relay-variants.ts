/**
 * Northbeam Relay variant pipeline acceptance.
 *
 * Run: npx tsx scripts/test-relay-variants.ts
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { getAllCatalogSpecs } from "../src/lib/relay/variants/catalog";
import { getKnownGoodBaseline, materializeVariant } from "../src/lib/relay/variants/materialize";
import {
  KNOWN_GOOD_RELEASE_ID,
  resolveScenarioForSession,
} from "../src/lib/relay/variants/resolve";
import { readVariantState, setStatusOverride } from "../src/lib/relay/variants/store";
import type { VariantSpec } from "../src/lib/relay/variants/types";
import { validateVariant } from "../src/lib/relay/variants/validate";

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

const STORE_PATH = resolve(process.cwd(), ".data/relay-variants-state.json");

function snapshotStoreFile(): { existed: boolean; raw: string | null } {
  if (!existsSync(STORE_PATH)) return { existed: false, raw: null };
  return { existed: true, raw: readFileSync(STORE_PATH, "utf8") };
}

function restoreStoreFile(snapshot: { existed: boolean; raw: string | null }): void {
  if (snapshot.existed && snapshot.raw !== null) {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, snapshot.raw, "utf8");
  } else if (existsSync(STORE_PATH)) {
    rmSync(STORE_PATH, { force: true });
  }
}

const specs = getAllCatalogSpecs();

goldenCase("catalog has exactly three approved variant specs", () => {
  assert.equal(specs.length, 3);
  for (const spec of specs) {
    assert.equal(spec.status, "approved", `${spec.id} must ship approved`);
    assert.equal(spec.parentScenarioId, "project-relay");
  }
});

goldenCase("known-good baseline is deterministic and non-empty", () => {
  const a = getKnownGoodBaseline();
  const b = getKnownGoodBaseline();
  assert.deepEqual(a, b);
  assert.ok(Object.keys(a).length > 5, "baseline should contain the real scenario files");
  assert.ok("src/join.py" in a);
  assert.ok("data/shipments.csv" in a);
  assert.ok("data/delays_manual_tracking.csv" in a);
  assert.ok("evals/run_evals.py" in a);
});

goldenCase("materializeVariant is deterministic per spec (same seed -> same files)", () => {
  for (const spec of specs) {
    const run1 = materializeVariant(spec);
    const run2 = materializeVariant(spec);
    assert.deepEqual(run1, run2, `${spec.id}: two materializations of the same spec must be byte-identical`);
  }
});

goldenCase("different defect focuses produce genuinely different mutated files", () => {
  const materialized = specs.map((spec) => materializeVariant(spec));
  const joinVariants = new Set(materialized.map((f) => f["src/join.py"]));
  const metricsVariants = new Set(materialized.map((f) => f["src/metrics.py"]));
  const integrityVariants = new Set(materialized.map((f) => f["docs/data-integrity.md"]));
  assert.ok(
    joinVariants.size > 1 || metricsVariants.size > 1 || integrityVariants.size > 1,
    "at least one mutated file must differ across the three variants"
  );
});

goldenCase("each approved catalog variant validates ok", () => {
  for (const spec of specs) {
    const files = materializeVariant(spec);
    const result = validateVariant(files);
    assert.equal(
      result.ok,
      true,
      `${spec.id} should validate cleanly: ${result.errors.join("; ")}`
    );
    assert.equal(result.errors.length, 0);
  }
});

goldenCase("each approved catalog variant carries an intentional defect marker", () => {
  for (const spec of specs) {
    const files = materializeVariant(spec);
    const hasMarker = Object.values(files).some((content) => content.includes("INTENTIONAL_DEFECT"));
    assert.ok(hasMarker, `${spec.id} must contain an INTENTIONAL_DEFECT marker comment`);
  }
});

goldenCase("validateVariant rejects a fabricated email-looking PII string", () => {
  const files = { ...getKnownGoodBaseline() };
  files["docs/customer-brief.md"] += "\nContact: jane.doe@example.com\n";
  const result = validateVariant(files);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.toLowerCase().includes("pii")));
});

goldenCase("validateVariant rejects files with no intentional defect marker", () => {
  const files = { ...getKnownGoodBaseline() };
  for (const [path, content] of Object.entries(files)) {
    files[path] = content.replace(/INTENTIONAL_DEFECT[^\n]*/g, "KNOWN_ISSUE");
  }
  const result = validateVariant(files);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("INTENTIONAL_DEFECT")));
});

goldenCase("validateVariant rejects a FileMap missing required scenario files", () => {
  const files = { ...getKnownGoodBaseline() };
  delete files["evals/run_evals.py"];
  const result = validateVariant(files);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("evals/run_evals.py")));
});

goldenCase("resolveScenarioForSession defaults to known-good with no preference", () => {
  const resolved = resolveScenarioForSession();
  assert.equal(resolved.source, "canonical");
  assert.equal(resolved.releaseId, KNOWN_GOOD_RELEASE_ID);
  assert.equal(resolved.variantId, null);
});

goldenCase("resolveScenarioForSession falls back to known-good for an unknown variant id", () => {
  const resolved = resolveScenarioForSession({ preferVariantId: "does-not-exist" });
  assert.equal(resolved.source, "canonical");
  assert.equal(resolved.releaseId, KNOWN_GOOD_RELEASE_ID);
});

goldenCase("resolveScenarioForSession serves an approved, valid variant when explicitly preferred", () => {
  const spec = specs[0];
  const resolved = resolveScenarioForSession({ preferVariantId: spec.id });
  assert.equal(resolved.source, "variant");
  assert.equal(resolved.variantId, spec.id);
  assert.notEqual(resolved.releaseId, KNOWN_GOOD_RELEASE_ID);
  assert.ok(resolved.validation?.ok);
});

goldenCase("resolveScenarioForSession never serves a non-approved variant (status override)", () => {
  const snapshot = snapshotStoreFile();
  const targetSpec = specs[specs.length - 1];
  try {
    setStatusOverride(targetSpec.id, "rejected", "test-relay-variants");
    const state = readVariantState();
    assert.equal(state[targetSpec.id]?.statusOverride, "rejected");

    const resolved = resolveScenarioForSession({ preferVariantId: targetSpec.id });
    assert.equal(resolved.source, "canonical", "a rejected variant must never be served");
    assert.equal(resolved.releaseId, KNOWN_GOOD_RELEASE_ID);
  } finally {
    restoreStoreFile(snapshot);
  }
});

goldenCase("resolveScenarioForSession falls back for an approved-but-invalid variant", () => {
  const brokenSpec: VariantSpec = {
    ...specs[0],
    id: "relay-variant-test-broken",
  };
  const resolved = resolveScenarioForSession({ preferVariantId: brokenSpec.id });
  assert.equal(resolved.source, "canonical");
});

if (failures > 0) {
  console.error(`\n${failures} golden case(s) failed.`);
  process.exit(1);
}
console.log("\nAll Relay variant pipeline golden cases passed. RELAY_VARIANTS_OK");
