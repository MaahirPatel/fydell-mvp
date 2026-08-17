/**
 * The evidence pack a candidate builds while working.
 *
 * Claims live in the attempt's `extras` rather than in component state so they
 * are captured by the durable snapshot and survive a refresh. Because that JSON
 * outlives the code that wrote it, reads are validated field by field and
 * anything malformed is dropped instead of being coerced into a claim the
 * candidate never made.
 */
import type { JsonValue } from "../types";

export const EVIDENCE_CLAIMS_KEY = "evidenceClaims";

export type EvidenceConfidence = "low" | "medium" | "high";

export type EvidenceClaim = {
  id: string;
  text: string;
  /** Sources the claim rests on. Empty means an unsupported claim. */
  citations: string[];
  assumption?: string;
  limitation?: string;
  confidence: EvidenceConfidence;
};

const CONFIDENCES: readonly EvidenceConfidence[] = ["low", "medium", "high"];

export function readEvidenceClaims(
  extras: Record<string, JsonValue> | undefined
): EvidenceClaim[] {
  const raw = extras?.[EVIDENCE_CLAIMS_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.map(parseClaim).filter((c): c is EvidenceClaim => c !== null);
}

/** `extras` is JSON-typed, so claims are widened deliberately on the way out. */
export function claimsToJson(claims: EvidenceClaim[]): JsonValue {
  return claims.map((c) => ({
    id: c.id,
    text: c.text,
    citations: [...c.citations],
    ...(c.assumption ? { assumption: c.assumption } : {}),
    ...(c.limitation ? { limitation: c.limitation } : {}),
    confidence: c.confidence,
  }));
}

function parseClaim(value: JsonValue): EvidenceClaim | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, JsonValue>;

  const { id, text } = record;
  if (typeof id !== "string" || typeof text !== "string") return null;

  const citations = Array.isArray(record.citations)
    ? record.citations.filter((c): c is string => typeof c === "string")
    : [];
  const confidence = CONFIDENCES.find((c) => c === record.confidence) ?? "medium";

  return {
    id,
    text,
    citations,
    assumption: typeof record.assumption === "string" ? record.assumption : undefined,
    limitation: typeof record.limitation === "string" ? record.limitation : undefined,
    confidence,
  };
}
