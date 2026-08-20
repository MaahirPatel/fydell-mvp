import {
  CONFIDENCES,
  DIRECTIONS,
  JOB_TYPES,
  RECOMMENDATIONS,
  type AnalysisResult,
  type EvidenceClaimDraft,
} from "./types";

export class AnalysisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new AnalysisValidationError(`${field} must be an array`);
  if (!value.every((item) => typeof item === "string")) {
    throw new AnalysisValidationError(`${field} must be strings`);
  }
  return value;
}

export function validateClaimDraft(value: unknown): EvidenceClaimDraft {
  if (!isRecord(value)) throw new AnalysisValidationError("claim must be an object");
  const direction = value.direction;
  const confidence = value.confidence;
  if (typeof value.claim !== "string" || value.claim.trim().length === 0) {
    throw new AnalysisValidationError("claim text required");
  }
  if (typeof value.competency !== "string") throw new AnalysisValidationError("competency required");
  if (typeof direction !== "string" || !DIRECTIONS.includes(direction as (typeof DIRECTIONS)[number])) {
    throw new AnalysisValidationError("invalid direction");
  }
  if (typeof confidence !== "string" || !CONFIDENCES.includes(confidence as (typeof CONFIDENCES)[number])) {
    throw new AnalysisValidationError("invalid confidence");
  }
  const supporting = asStringArray(value.supporting_event_ids, "supporting_event_ids");
  const counter = asStringArray(value.counterevidence_event_ids, "counterevidence_event_ids");
  if (direction !== "INSUFFICIENT_EVIDENCE" && supporting.length === 0) {
    throw new AnalysisValidationError("published-ready claims need supporting_event_ids");
  }
  if (direction === "INSUFFICIENT_EVIDENCE" && confidence === "HIGH") {
    throw new AnalysisValidationError("insufficient evidence cannot have high confidence");
  }
  for (const field of ["rubric_version", "prompt_version", "model_version"] as const) {
    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      throw new AnalysisValidationError(`${field} required`);
    }
  }
  return {
    claim: value.claim,
    competency: value.competency,
    direction: direction as EvidenceClaimDraft["direction"],
    confidence: confidence as EvidenceClaimDraft["confidence"],
    supporting_event_ids: supporting,
    counterevidence_event_ids: counter,
    rubric_version: value.rubric_version as string,
    prompt_version: value.prompt_version as string,
    model_version: value.model_version as string,
  };
}

export function validateAnalysisResult(value: unknown): AnalysisResult {
  if (!isRecord(value)) throw new AnalysisValidationError("analysis result must be an object");
  const jobType = value.job_type;
  if (typeof jobType !== "string" || !JOB_TYPES.includes(jobType as (typeof JOB_TYPES)[number])) {
    throw new AnalysisValidationError("invalid job_type");
  }
  const result: AnalysisResult = { job_type: jobType as AnalysisResult["job_type"] };
  if (value.claims) {
    if (!Array.isArray(value.claims)) throw new AnalysisValidationError("claims must be an array");
    result.claims = value.claims.map(validateClaimDraft);
  }
  if (value.observations) result.observations = asStringArray(value.observations, "observations");
  if (value.contradictions) result.contradictions = asStringArray(value.contradictions, "contradictions");
  if (value.uncertainties) result.uncertainties = asStringArray(value.uncertainties, "uncertainties");
  if (value.defense_questions) {
    if (!Array.isArray(value.defense_questions)) {
      throw new AnalysisValidationError("defense_questions must be an array");
    }
    result.defense_questions = value.defense_questions.map((q) => {
      if (!isRecord(q) || typeof q.prompt !== "string" || typeof q.target !== "string") {
        throw new AnalysisValidationError("defense question requires prompt and target");
      }
      if (/tell me about a time/i.test(q.prompt)) {
        throw new AnalysisValidationError("generic STAR defense questions are forbidden");
      }
      return { prompt: q.prompt, target: q.target };
    });
  }
  if (value.brief) {
    if (!isRecord(value.brief)) throw new AnalysisValidationError("brief must be an object");
    const rec = value.brief.recommendation;
    if (typeof rec !== "string" || !RECOMMENDATIONS.includes(rec as (typeof RECOMMENDATIONS)[number])) {
      throw new AnalysisValidationError("invalid recommendation");
    }
    result.brief = {
      recommendation: rec as (typeof RECOMMENDATIONS)[number],
      why: typeof value.brief.why === "string" ? value.brief.why : "",
      strengths: asStringArray(value.brief.strengths ?? [], "strengths").slice(0, 3),
      concerns: asStringArray(value.brief.concerns ?? [], "concerns").slice(0, 3),
      probes: asStringArray(value.brief.probes ?? [], "probes").slice(0, 3),
    };
  }
  return result;
}
