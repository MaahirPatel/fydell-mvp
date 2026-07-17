/**
 * Deterministic materialization for Relay variants.
 *
 * `materializeVariant(spec)` always starts from the exact same known-good
 * baseline (the real `scenarios/project-relay` files, on disk) and applies
 * exactly one named, hand-written mutator selected by `spec.defectFocus`.
 * A tiny seeded PRNG only ever picks between a couple of equivalent, bounded
 * options within that mutator (e.g. which of two marker-comment phrasings to
 * use, or a threshold value within a safe range) — it never invents new
 * files, endpoints, or facts. Same spec in ⇒ byte-identical FileMap out.
 */
import { resolve } from "path";
import type { FileMap } from "@/lib/relay/execution-provider";
import { loadScenarioSeedFiles } from "@/lib/relay/node-test-provider";
import type { DefectFocus, VariantSpec } from "./types";

const SCENARIO_ROOT = resolve(process.cwd(), "scenarios/project-relay");

/** The real, shipped Project Relay files — the always-available fallback
 * every variant is derived from and every session can safely fall back to. */
export function getKnownGoodBaseline(): FileMap {
  return loadScenarioSeedFiles(SCENARIO_ROOT);
}

// ---------------------------------------------------------------------------
// Seeded PRNG — deterministic, no external dependency (mulberry32).
// ---------------------------------------------------------------------------

function seedToUint32(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Deterministic [0, 1) generator: same seed string ⇒ same sequence forever. */
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

// ---------------------------------------------------------------------------
// Defect mutators — one per DefectFocus, each bounded to a single file edit.
// ---------------------------------------------------------------------------

/**
 * The canonical scenario already ships with this exact defect (the
 * model-assisted branch in `router.py` never re-checks
 * `policy.requires_human_approval`). This mutator makes that defect
 * explicit and auditable by inserting a marker comment above it — it does
 * not change runtime behavior relative to the shipped baseline.
 */
function mutateMissingApprovalCheck(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "src/router.py";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) return;

  const phrasing = pickSeeded(rand, [
    "model-assisted branch trusts model_response.category/action without re-checking policy.requires_human_approval",
    "human_approval_required is hardcoded False on the model-assisted path, bypassing policy.requires_human_approval",
  ] as const);

  const anchor = "        human_approval_required=False,";
  if (!source.includes(anchor)) return;
  files[path] = source.replace(
    anchor,
    `        # ${defectMarker(spec, phrasing)}\n${anchor}`
  );
}

/**
 * Reorders `triage.classify`'s keyword checks so the billing check runs
 * before the security / P0 checks, so a ticket that happens to contain both
 * a billing keyword (e.g. "charge") and a severity keyword (e.g. "outage")
 * is silently misclassified as billing instead of the higher-severity
 * category — the severity filter is effectively skipped for those tickets.
 */
function mutateMissingSeverityFilter(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "src/triage.py";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) return;

  const phrasing = pickSeeded(rand, [
    "billing keyword check runs before the security/P0 checks, so overlap-keyword tickets lose severity",
    "classify() checks BILLING_KEYWORDS ahead of SECURITY_KEYWORDS/P0_KEYWORDS, dropping severity precedence",
  ] as const);

  const fixedBlock = `def classify(text: str) -> str:
    t = text.lower()
    if any(k in t for k in SECURITY_KEYWORDS):
        return "security"
    if any(k in t for k in P0_KEYWORDS):
        return "incident_p0"
    if any(k in t for k in BILLING_KEYWORDS):
        return "billing"
    return "general"`;

  const defectiveBlock = `def classify(text: str) -> str:
    t = text.lower()
    # ${defectMarker(spec, phrasing)}
    if any(k in t for k in BILLING_KEYWORDS):
        return "billing"
    if any(k in t for k in SECURITY_KEYWORDS):
        return "security"
    if any(k in t for k in P0_KEYWORDS):
        return "incident_p0"
    return "general"`;

  if (!source.includes(fixedBlock)) return;
  files[path] = source.replace(fixedBlock, defectiveBlock);
}

/**
 * Sets router.py's CONFIDENCE_ESCALATION_THRESHOLD to a stale, too-low value
 * (deterministically chosen from the seed within a bounded, safe range), so
 * heuristic decisions that should have escalated to the model-assisted path
 * for a second opinion no longer do.
 */
function mutateStaleConfidenceThreshold(files: FileMap, spec: VariantSpec, rand: () => number): void {
  const path = "src/router.py";
  const source = files[path]?.replace(/\r\n/g, "\n");
  if (!source) return;

  // Bounded, deterministic: one of a fixed set of stale-but-plausible values.
  const staleValue = pickSeeded(rand, [0.2, 0.25, 0.3, 0.35] as const);
  const phrasing = `escalation threshold lowered to ${staleValue} (was 0.6), stale — under-escalates to model-assisted review`;

  const anchor = "CONFIDENCE_ESCALATION_THRESHOLD = 0.6";
  if (!source.includes(anchor)) return;
  files[path] = source.replace(
    anchor,
    `# ${defectMarker(spec, phrasing)}\nCONFIDENCE_ESCALATION_THRESHOLD = ${staleValue}`
  );
}

const DEFECT_MUTATORS: Record<
  DefectFocus,
  (files: FileMap, spec: VariantSpec, rand: () => number) => void
> = {
  missing_approval_check: mutateMissingApprovalCheck,
  missing_severity_filter: mutateMissingSeverityFilter,
  stale_confidence_threshold: mutateStaleConfidenceThreshold,
};

/**
 * Deterministically materialize a variant's FileMap overlay from the
 * known-good baseline. Same `spec` (same id/seed/defectFocus) always
 * produces byte-identical output — verified in `scripts/test-relay-variants.ts`.
 */
export function materializeVariant(spec: VariantSpec): FileMap {
  const files: FileMap = { ...getKnownGoodBaseline() };
  const rand = createSeededRandom(`${spec.id}:${spec.seed}:${spec.defectFocus}`);
  const mutate = DEFECT_MUTATORS[spec.defectFocus];
  mutate(files, spec, rand);

  const manifestPhrasing = pickSeeded(rand, [
    "materialized for operator review before any candidate session uses it",
    "generated for ops validation; not served to candidates until approved",
  ] as const);
  files["docs/variant-manifest.md"] = [
    `# Variant manifest (generated)`,
    ``,
    `- id: ${spec.id}`,
    `- parentScenarioId: ${spec.parentScenarioId}`,
    `- seed: ${spec.seed}`,
    `- title: ${spec.title}`,
    `- difficulty: ${spec.difficulty}`,
    `- defectFocus: ${spec.defectFocus}`,
    `- ${manifestPhrasing}`,
    ``,
  ].join("\n");

  return files;
}
