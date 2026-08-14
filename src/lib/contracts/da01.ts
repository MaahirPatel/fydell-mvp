import { WAVE1_EVALUATION_SLUG } from "./roles";

/**
 * Typed frontend contract for the Wave 1 vertical slice.
 * Temporary fixtures and live data must share this shape.
 */

export const DA01_SLUG = WAVE1_EVALUATION_SLUG;
export const DA01_ANALYSIS_ENGINE = "v2" as const;
export const DA01_CONTENT_VERSION = "northline-ops-yield@3.0.0";

/** Keyword micro-scoring must never be presented as equivalent DA-01 analysis. */
export function mayUseKeywordFallback(slug: string): boolean {
  return slug !== DA01_SLUG;
}

export interface Da01InvitationView {
  id: string;
  email: string;
  name: string | null;
  status: string;
  emailDelivery: string;
  inviteUrl?: string;
  expiresAt: string;
}

export interface Da01AttemptView {
  sessionId: string;
  status: string;
  savedAt: string | null;
  autosave: "saving" | "saved" | "offline" | "failed";
}

export interface Da01ReportView {
  sessionId: string;
  simulationVersion: string;
  analysisVersion: string;
  engine: typeof DA01_ANALYSIS_ENGINE;
  conclusion: string;
  initialClaims: string[];
  revisedClaims: string[];
  citations: { claim: string; eventOrArtifactId: string; detail: string }[];
  supportingEvidence: string[];
  contradictingEvidence: string[];
  limitations: string[];
  reviewState: "processing" | "review_required" | "ready" | "failed";
  interviewQuestions: string[];
  analysisIsNotDecision: true;
}

export interface Da01ReceiptView {
  tokenHashPrefix: string;
  fields: string[];
  revoked: boolean;
}
