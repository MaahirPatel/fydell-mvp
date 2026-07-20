/**
 * Deterministic materialization for Northbeam Logistics variants.
 *
 * Starts from `scenarios/project-relay` and applies exactly one named mutator
 * selected by `spec.defectFocus`. Same spec ⇒ byte-identical FileMap.
 */
import { resolve } from "path";
import type { FileMap } from "@/lib/relay/execution-provider";
import { loadScenarioSeedFiles } from "@/lib/relay/node-test-provider";
import type { DefectFocus, VariantSpec } from "./types";

const SCENARIO_ROOT = resolve(process.cwd(), "scenarios/project-relay");

export function getKnownGoodBaseline(): FileMap {
  return loadScenarioSeedFiles(SCENARIO_ROOT);
}

function seedToUint32(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function createSeededRandom(seed: string): () => number {
  let a = seedToUint32(seed);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeeded<T>(rand: () => number, options: readonly T[]): T {
  const idx = Math.floor(rand() * options.length) % options.length;
  return options[idx];
}

export function defectMarker(spec: VariantSpec, note: string): string {
  return `# INTENTIONAL_DEFECT: ${spec.defectFocus} (variant ${spec.id}) — ${note}`;
}

/**
 * Emphasizes the naive join trap with a variant-specific marker above
 * `naive_join`. Baseline already documents the defect; this makes the
 * variant auditable and distinct.
 */
function mutateNaiveJoinUnfixed(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "src/join.py";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) return;

  const phrasing = pickSeeded(rand, [
    "naive join matches shipment_id strings as-is; Excel-stripped leading zeros drop ~12% of delay rows",
    "string equality on shipment_id silently loses manual-tracking rows that lost a leading zero",
  ] as const);

  const anchor = "def naive_join(";
  if (!source.includes(anchor)) return;
  if (source.includes(`variant ${spec.id}`)) return;
  files[path] = source.replace(anchor, `${defectMarker(spec, phrasing)}\n${anchor}`);
}

/**
 * Marks metrics path that understates late rate when built on naive_join.
 */
function mutateWrongLateDefinition(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "src/metrics.py";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) {
    mutateNaiveJoinUnfixed(files, spec, rand);
    return;
  }

  const phrasing = pickSeeded(rand, [
    "naive_late_rate_stats understates true late rate because it uses naive_join before reconcile",
    "shipping a late-% from naive_late_rate_stats without checking rows_dropped is a defect",
  ] as const);

  const anchor = "def naive_late_rate_stats(";
  if (!source.includes(anchor)) {
    mutateNaiveJoinUnfixed(files, spec, rand);
    return;
  }
  if (source.includes(`variant ${spec.id}`)) return;
  files[path] = source.replace(anchor, `${defectMarker(spec, phrasing)}\n${anchor}`);
}

/**
 * Marks carrier OT claims as an unverified trap in the integrity doc.
 */
function mutateCarrierClaimTrusted(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "docs/data-integrity.md";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) {
    mutateNaiveJoinUnfixed(files, spec, rand);
    return;
  }

  const phrasing = pickSeeded(rand, [
    "carrier on-time claims conflict with shipment outcomes; trusting carriers without reconcile is a trap",
    "VP may cite carrier OT%; verify against reconciled shipment+delay truth before shipping a number",
  ] as const);

  const marker = `\n\n<!-- INTENTIONAL_DEFECT: ${spec.defectFocus} (variant ${spec.id}) — ${phrasing} -->\n`;
  if (source.includes(`variant ${spec.id}`)) return;
  files[path] = source.trimEnd() + marker;
}

const MUTATORS: Record<
  DefectFocus,
  (files: FileMap, spec: VariantSpec, rand: () => number) => void
> = {
  naive_join_unfixed: mutateNaiveJoinUnfixed,
  wrong_late_definition: mutateWrongLateDefinition,
  carrier_claim_trusted: mutateCarrierClaimTrusted,
};

export function materializeVariant(spec: VariantSpec): FileMap {
  const files = getKnownGoodBaseline();
  const rand = createSeededRandom(`${spec.id}:${spec.seed}:${spec.defectFocus}`);
  MUTATORS[spec.defectFocus](files, spec, rand);

  const hasMarker = Object.values(files).some((c) => /INTENTIONAL_DEFECT/.test(c));
  if (!hasMarker) {
    mutateNaiveJoinUnfixed(files, spec, rand);
  }

  return files;
}
