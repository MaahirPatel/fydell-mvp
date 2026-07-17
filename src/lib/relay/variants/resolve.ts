/**
 * Resolves which Relay scenario files a session should be seeded with.
 *
 * Safe by construction: unless a caller explicitly asks for a specific
 * variant via `preferVariantId` AND that variant's *effective* status
 * (catalog status, overridable by ops via `store.ts`) is `"approved"` AND it
 * passes `validateVariant`, this always returns the known-good canonical
 * `scenarios/project-relay` files. Draft/rejected/retired/invalid variants
 * are never served to a real session.
 */
import { createHash } from "crypto";
import type { FileMap } from "@/lib/relay/execution-provider";
import { findCatalogSpec } from "./catalog";
import { getKnownGoodBaseline, materializeVariant } from "./materialize";
import { getEffectiveStatus } from "./store";
import type { VariantSpec } from "./types";
import { validateVariant, type ValidationResult } from "./validate";

export const KNOWN_GOOD_RELEASE_ID = "project-relay@known-good";

export type ResolvedScenario = {
  releaseId: string;
  source: "canonical" | "variant";
  variantId: string | null;
  files: FileMap;
  canonicalFacts: string[] | null;
  curveballText: string | null;
  validation: ValidationResult | null;
};

function contentHash(files: FileMap): string {
  return createHash("sha256").update(JSON.stringify(files)).digest("hex");
}

export function variantReleaseId(spec: VariantSpec, files: FileMap): string {
  return `variant:${spec.id}@${spec.seed}:${contentHash(files).slice(0, 12)}`;
}

function knownGoodFallback(): ResolvedScenario {
  return {
    releaseId: KNOWN_GOOD_RELEASE_ID,
    source: "canonical",
    variantId: null,
    files: getKnownGoodBaseline(),
    canonicalFacts: null,
    curveballText: null,
    validation: null,
  };
}

export function resolveScenarioForSession(opts: { preferVariantId?: string | null } = {}): ResolvedScenario {
  const preferVariantId = opts.preferVariantId;
  if (!preferVariantId) return knownGoodFallback();

  const spec = findCatalogSpec(preferVariantId);
  if (!spec) return knownGoodFallback();

  const effectiveStatus = getEffectiveStatus(spec);
  if (effectiveStatus !== "approved") return knownGoodFallback();

  const files = materializeVariant(spec);
  const validation = validateVariant(files);
  if (!validation.ok) return knownGoodFallback();

  return {
    releaseId: variantReleaseId(spec, files),
    source: "variant",
    variantId: spec.id,
    files,
    canonicalFacts: spec.canonicalFacts,
    curveballText: spec.curveballText,
    validation,
  };
}
