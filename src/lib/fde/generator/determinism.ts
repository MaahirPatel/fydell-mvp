/**
 * Canonical serialization + hashing for Compile(X,s,vc,vm) determinism proofs.
 */
import { createHash } from "crypto";
import type { SimulationBlueprint } from "./types";

export const DETERMINISM_VERSION = "determinism-canonical-v1";

/** Stable JSON: sorted keys, no createdAt (wall-clock), fixed float rounding. */
export function canonicalizeBlueprint(bp: SimulationBlueprint): string {
  const clone = structuredClone(bp) as SimulationBlueprint & { createdAt?: string };
  clone.createdAt = "";
  return stableStringify(clone);
}

export function blueprintOutputHash(bp: SimulationBlueprint): string {
  const canonical = canonicalizeBlueprint(bp);
  return createHash("sha256").update(canonical).digest("hex");
}

export function inputConfigHash(parts: {
  title: string;
  objective: string;
  industry: string;
  durationMinutes: number;
  seed: string;
  skillWeights?: Record<string, number>;
  aiPolicy?: string;
  criticalTraits?: string[];
}): string {
  return createHash("sha256").update(stableStringify(parts)).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), numberReplacer);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortKeys(obj[key]);
    }
    return out;
  }
  return value;
}

function numberReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "number" && Number.isFinite(value)) {
    // Round to 1e-9 to absorb float noise across runs.
    return Math.round(value * 1e9) / 1e9;
  }
  return value;
}
