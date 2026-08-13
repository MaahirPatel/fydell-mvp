/**
 * Northline V3 fixture validation.
 *
 * Recomputes every expected metric from the resource rows and compares the
 * result against the declared ground truth and the declared checksums. The
 * point is that a row cannot be edited without this failing: a scenario whose
 * data and answer key have drifted apart is worse than no scenario, because it
 * grades candidates against arithmetic that no longer holds.
 */

import { validateResourceBundle, resolveRef, type EvidenceSourceRef } from "../src/lib/simulations/v3/resources";
import { computeChecksums, verifyChecksums } from "../src/lib/simulations/v3/checksum";
import { NORTHLINE_BUNDLE } from "../src/lib/simulations/v3/content/northline/data";
import {
  checkBundleArithmetic,
  computeYieldFacts,
  NORTHLINE_EXPECTED as E,
} from "../src/lib/simulations/v3/content/northline/truth";

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

function close(name: string, actual: number, expected: number, tolerance = 1e-9) {
  ok(
    name,
    Math.abs(actual - expected) <= tolerance,
    `expected ${expected}, got ${actual}`
  );
}

function section(title: string) {
  console.log(`\n${title}`);
}

/* Structure ----------------------------------------------------------------- */

section("bundle structure");

const structureErrors = validateResourceBundle({
  ...NORTHLINE_BUNDLE,
  // Checksums are validated separately; a missing one should not mask a
  // structural problem here.
  checksums: computeChecksums(NORTHLINE_BUNDLE.files),
});
ok("bundle is structurally valid", structureErrors.length === 0, structureErrors.join("; "));
ok("bundle has all six files", NORTHLINE_BUNDLE.files.length === 6);

/* Checksums ------------------------------------------------------------------ */

section("checksums");

const actualChecksums = computeChecksums(NORTHLINE_BUNDLE.files);
const declaredAreEmpty = Object.values(NORTHLINE_BUNDLE.checksums).every((v) => v === "");

if (declaredAreEmpty) {
  console.log("  ---- checksums not yet declared. Paste this into data.ts:\n");
  console.log("export const NORTHLINE_CHECKSUMS: Record<string, string> = {");
  for (const [fileId, sum] of Object.entries(actualChecksums)) {
    console.log(`  ${fileId}: "${sum}",`);
  }
  console.log("};\n");
  ok("checksums are declared", false, "run this script and paste the block above");
} else {
  const mismatches = verifyChecksums(NORTHLINE_BUNDLE);
  ok(
    "declared checksums match content",
    mismatches.length === 0,
    mismatches.map((m) => `${m.fileId}: declared ${m.declared?.slice(0, 12)}, actual ${m.actual.slice(0, 12)}`).join("; ")
  );
}

/* Internal arithmetic --------------------------------------------------------- */

section("internal arithmetic");

const arithmeticErrors = checkBundleArithmetic(NORTHLINE_BUNDLE);
ok(
  "losses and events reconcile to every run",
  arithmeticErrors.length === 0,
  arithmeticErrors.join("; ")
);

/* Scenario -------------------------------------------------------------------- */

section("scenario ground truth");

const facts = computeYieldFacts(NORTHLINE_BUNDLE);

close("prior yield", facts.priorYield, E.priorYield);
close("current reported yield", facts.currentReportedYield, E.currentReportedYield);
close("current normalized yield", facts.currentNormalizedYield, E.currentNormalizedYield);
close("reclassified units", facts.reclassUnits, E.reclassUnits);

close("total decline", facts.totalDeclinePp, E.totalDeclinePp, 1e-9);
close("measurement portion", facts.measurementDeclinePp, E.measurementDeclinePp, 1e-9);
close("residual portion", facts.residualDeclinePp, E.residualDeclinePp, 1e-9);

ok(
  "decomposition sums to the total decline",
  Math.abs(facts.measurementDeclinePp + facts.residualDeclinePp - facts.totalDeclinePp) < 1e-9,
  `${facts.measurementDeclinePp} + ${facts.residualDeclinePp} != ${facts.totalDeclinePp}`
);

ok(
  "measurement share is in the intended range",
  facts.measurementShare >= E.measurementShareRange[0] &&
    facts.measurementShare <= E.measurementShareRange[1],
  `got ${facts.measurementShare.toFixed(4)}`
);

/* The residual has to be findable, and unambiguous ---------------------------- */

section("residual segment");

ok(
  "residual segment is the intended one",
  facts.residualSegment.segment === E.residualSegment,
  `got ${facts.residualSegment.segment}`
);
close("residual segment drop", facts.residualSegment.residualDropPp, E.residualSegmentDropPp, 1e-9);

const others = facts.segments
  .filter((s) => s.segment !== facts.residualSegment.segment)
  .map((s) => s.residualDropPp);
const margin = facts.residualSegment.residualDropPp - Math.max(...others);
ok(
  "residual segment is unambiguous",
  margin >= E.minimumResidualMarginPp,
  `margin over the next segment is ${margin.toFixed(2)}pp, need ${E.minimumResidualMarginPp}pp`
);

ok(
  "the reported decline alone points at the wrong conclusion",
  facts.residualSegment.reportedYield < facts.residualSegment.normalizedYield,
  "the measurement correction must actually move the residual segment's number"
);

/* Published figures ----------------------------------------------------------- */

section("published figures");

close(
  "published prior matches the data",
  E.publishedPriorYield,
  facts.priorYield,
  E.publishedTolerance
);
close(
  "published current matches the data",
  E.publishedCurrentYield,
  facts.currentReportedYield,
  E.publishedTolerance
);

/* Every source reference must resolve ------------------------------------------ */

section("evidence references");

const refs: Array<[string, EvidenceSourceRef]> = [
  ["reclass timing", facts.sources.reclassTiming],
  ["no restatement", facts.sources.noRestatement],
  ["definition v1", facts.sources.definitionV1],
  ["definition v2", facts.sources.definitionV2],
  ["published prior", facts.sources.publishedPrior],
  ["published current", facts.sources.publishedCurrent],
  ...facts.sources.reclassEvents.map(
    (r, i) => [`reclass event ${i + 1}`, r] as [string, EvidenceSourceRef]
  ),
  ...facts.sources.residualEvents.map(
    (r, i) => [`residual event ${i + 1}`, r] as [string, EvidenceSourceRef]
  ),
  ...facts.segments.flatMap((s) =>
    s.sourceRefs.map((r, i) => [`${s.segment} source ${i + 1}`, r] as [string, EvidenceSourceRef])
  ),
];

let unresolved = 0;
let stale = 0;
for (const [, ref] of refs) {
  const resolved = resolveRef(NORTHLINE_BUNDLE, ref);
  if (!resolved) unresolved += 1;
  else if (resolved.stale && !declaredAreEmpty) stale += 1;
}

ok(`all ${refs.length} references resolve to a real row or section`, unresolved === 0, `${unresolved} unresolved`);
if (!declaredAreEmpty) {
  ok("no reference is stale against the current bundle", stale === 0, `${stale} stale`);
}

ok(
  "the residual conclusion is supported by more than one event",
  facts.sources.residualEvents.length >= 2,
  `only ${facts.sources.residualEvents.length}`
);
ok(
  "the measurement conclusion is supported by both held-unit events",
  facts.sources.reclassEvents.length === 2,
  `got ${facts.sources.reclassEvents.length}`
);

/* Summary ---------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("Northline V3 fixture is coherent.");
console.log(
  `  reported decline ${facts.totalDeclinePp.toFixed(2)}pp = ` +
    `${facts.measurementDeclinePp.toFixed(2)}pp measurement + ` +
    `${facts.residualDeclinePp.toFixed(2)}pp real, residual in ${facts.residualSegment.segment}.`
);
