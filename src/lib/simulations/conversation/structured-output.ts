/**
 * Structured LLM output for coworker response generation.
 *
 * The model returns JSON with:
 * - interpretation: what the candidate's message means
 * - response: the composed reply + which facts it used
 * - memory_updates: proposed changes to conversation memory
 *
 * All output is validated before publishing. Model-provided fact references
 * are checked against the permitted set - a reference alone does not prove
 * the claim is supported.
 */
import type { HelpLevel } from "./types";

export interface ModelInterpretation {
  /** Whether the message is a question needing an answer. */
  is_question: boolean;
  /** Whether it's an acknowledgment needing no response. */
  is_acknowledgment: boolean;
  /** Whether the candidate is sharing a plan/diagnosis/progress. */
  is_sharing_work: boolean;
  /** Whether they're explicitly asking for help. */
  is_help_request: boolean;
  /** Topics discussed (free text, matched to known topics by code). */
  topics: string[];
  /** Whether the message is ambiguous and needs clarification. */
  needs_clarification: boolean;
  /** What clarification is needed (if any). */
  clarification_needed?: string;
  /** Brief summary of what the candidate said/means. */
  summary: string;
}

export interface ModelResponse {
  /** The composed reply text. */
  text: string;
  /** Fact IDs from permitted set that support this response. */
  fact_ids: string[];
  /** Assistance category of this response. */
  assistance_category: HelpLevel;
  /** Whether the model believes no response is needed. */
  no_response_needed: boolean;
  /** Reason for silence (if no_response_needed). */
  silence_reason?: string;
}

export interface ModelMemoryUpdates {
  /** Topic IDs to mark as addressed. */
  topics_addressed: string[];
  /** Whether the candidate stated a plan. */
  plan_stated?: string;
  /** Whether the candidate shared a diagnosis/finding. */
  diagnosis_shared?: string;
  /** Question IDs from open questions that this answers. */
  questions_resolved: string[];
}

export interface StructuredGeneration {
  interpretation: ModelInterpretation;
  response: ModelResponse;
  memory_updates: ModelMemoryUpdates;
}

/**
 * JSON schema for the model's structured output.
 */
export const GENERATION_SCHEMA = {
  type: "object",
  required: ["interpretation", "response", "memory_updates"],
  properties: {
    interpretation: {
      type: "object",
      required: ["is_question", "is_acknowledgment", "is_sharing_work", "is_help_request", "topics", "needs_clarification", "summary"],
      properties: {
        is_question: { type: "boolean" },
        is_acknowledgment: { type: "boolean" },
        is_sharing_work: { type: "boolean" },
        is_help_request: { type: "boolean" },
        topics: { type: "array", items: { type: "string" } },
        needs_clarification: { type: "boolean" },
        clarification_needed: { type: "string" },
        summary: { type: "string" },
      },
    },
    response: {
      type: "object",
      required: ["text", "fact_ids", "assistance_category", "no_response_needed"],
      properties: {
        text: { type: "string" },
        fact_ids: { type: "array", items: { type: "string" } },
        assistance_category: { type: "string", enum: ["none", "clarification", "direction", "hint", "solution"] },
        no_response_needed: { type: "boolean" },
        silence_reason: { type: "string" },
      },
    },
    memory_updates: {
      type: "object",
      required: ["topics_addressed", "questions_resolved"],
      properties: {
        topics_addressed: { type: "array", items: { type: "string" } },
        plan_stated: { type: "string" },
        diagnosis_shared: { type: "string" },
        questions_resolved: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

/**
 * Validate structured generation output.
 * Returns the parsed output if valid, null if invalid.
 */
export function validateGeneration(
  raw: unknown,
  permittedFactIds: Set<string>
): StructuredGeneration | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<StructuredGeneration>;

  // Required top-level keys
  if (!g.interpretation || !g.response || !g.memory_updates) return null;

  const interp = g.interpretation as Partial<ModelInterpretation>;
  const resp = g.response as Partial<ModelResponse>;
  const mem = g.memory_updates as Partial<ModelMemoryUpdates>;

  // Validate interpretation
  if (typeof interp.is_question !== "boolean") return null;
  if (typeof interp.is_acknowledgment !== "boolean") return null;
  if (typeof interp.is_sharing_work !== "boolean") return null;
  if (typeof interp.is_help_request !== "boolean") return null;
  if (!Array.isArray(interp.topics)) return null;
  if (typeof interp.needs_clarification !== "boolean") return null;
  if (typeof interp.summary !== "string" || interp.summary.length === 0) return null;

  // Validate response
  if (typeof resp.text !== "string") return null;
  if (!Array.isArray(resp.fact_ids)) return null;
  // CRITICAL: every referenced fact must be in the permitted set
  for (const fid of resp.fact_ids) {
    if (!permittedFactIds.has(fid)) return null;
  }
  const validCategories = ["none", "clarification", "direction", "hint", "solution"];
  if (!validCategories.includes(resp.assistance_category || "")) return null;
  if (typeof resp.no_response_needed !== "boolean") return null;
  if (resp.text.length > 2000) return null; // Sanity bound

  // Validate memory updates
  if (!Array.isArray(mem.topics_addressed)) return null;
  if (!Array.isArray(mem.questions_resolved)) return null;

  return g as StructuredGeneration;
}
