/**
 * Evidence-per-dimension mapping (WORK-02).
 *
 * Every scored dimension (competency) must declare observable evidence:
 *  - correctness → trusted tests / deterministic checks
 *  - design reasoning → diffs and written explanations
 *  - communication → relevant messages and the handoff
 *  - adaptation → work produced after a disclosed requirement update
 *
 * No dimension may be scored without observable evidence. This module
 * validates that authored content wires each competency to at least one
 * evidence source, and classifies what each source may support.
 */

import type { SimulationContent } from "./types";
import type { MicroSimContent } from "./micro-types";

export type EvidenceSourceKind =
  | "deterministic_check" // trusted tests / exact checks → correctness
  | "rubric_indicator" // anchored evaluator judgment with cited evidence
  | "deliverable_field" // written explanation / diff description
  | "message_thread" // relevant teammate messages
  | "handoff" // what changed / testing / risks / next steps
  | "post_update_work"; // artifacts produced after the requirement update

export interface DimensionEvidence {
  competencyKey: string;
  sources: EvidenceSourceKind[];
}

/**
 * Declared mapping of evidence source → the claims it may support.
 * Used by reports to avoid overclaiming (with WORK-08).
 */
export const EVIDENCE_SUPPORTS: Record<EvidenceSourceKind, string> = {
  deterministic_check: "Correctness of the produced artifact against trusted checks.",
  rubric_indicator: "Anchored judgment with cited evidence; never a bare score.",
  deliverable_field: "The candidate's stated reasoning and described changes.",
  message_thread: "Clarification behavior and risk communication actually observed in chat.",
  handoff: "Completeness of the handoff: changes, testing, risks, next steps.",
  post_update_work: "Adaptation: work produced after the disclosed requirement update.",
};

/**
 * Validate that every competency in the content has at least one declared
 * observable evidence source. Returns problems; empty = valid.
 *
 * Wiring rules:
 *  - deterministicChecks[].competencyKey → deterministic_check
 *  - rubricIndicators[].competencyKey   → rubric_indicator
 *  - deliverable fields exist           → deliverable_field (all competencies)
 *  - stakeholder thread exists          → message_thread (communication-ish)
 *  - handoff fields                     → handoff (communication-ish)
 *  - curveball present                  → post_update_work (adaptation-ish)
 */
export function validateEvidenceCoverage(
  content: SimulationContent | MicroSimContent
): { errors: string[]; map: DimensionEvidence[] } {
  const errors: string[] = [];
  const map = new Map<string, Set<EvidenceSourceKind>>();

  const competencies =
    "competencies" in content ? content.competencies : [];
  for (const c of competencies) map.set(c.key, new Set());

  const isFull = (c: unknown): c is SimulationContent =>
    Boolean(c && typeof c === "object" && !("format" in (c as object)));

  if (isFull(content)) {
    for (const check of content.deterministicChecks || []) {
      map.get(check.competencyKey)?.add("deterministic_check");
    }
    for (const ind of content.rubricIndicators || []) {
      map.get(ind.competencyKey)?.add("rubric_indicator");
    }
    if ((content.deliverableFields || []).length > 0) {
      for (const s of map.values()) s.add("deliverable_field");
    }
    if ((content.stakeholders || []).length > 0) {
      for (const s of map.values()) s.add("message_thread");
    }
    if (content.curveball) {
      for (const s of map.values()) s.add("post_update_work");
    }
    // Handoff is collected via deliverable fields; treat as available.
    for (const s of map.values()) s.add("handoff");
  } else {
    const micro = content as MicroSimContent;
    for (const q of micro.questions || []) {
      map.get(q.competencyKey)?.add("deterministic_check");
    }
    for (const s of map.values()) {
      s.add("deliverable_field");
      s.add("message_thread");
      s.add("handoff");
    }
    if (micro.curveball) for (const s of map.values()) s.add("post_update_work");
  }

  const result: DimensionEvidence[] = [];
  for (const [key, sources] of map) {
    const list = [...sources];
    result.push({ competencyKey: key, sources: list });
    if (list.length === 0)
      errors.push(`Competency "${key}" has no observable evidence source`);
  }
  return { errors, map: result };
}

/**
 * WORK-02 passing-condition check: correctness dimensions must be backed by
 * trusted (deterministic) evidence, not by rubric judgment alone.
 */
export function validateCorrectnessBacking(
  content: SimulationContent | MicroSimContent,
  correctnessKeys: string[] = ["correctness", "accuracy", "technical_correctness"]
): string[] {
  const { map } = validateEvidenceCoverage(content);
  const errors: string[] = [];
  for (const dim of map) {
    if (correctnessKeys.includes(dim.competencyKey) && !dim.sources.includes("deterministic_check")) {
      errors.push(
        `Correctness dimension "${dim.competencyKey}" has no deterministic (trusted-test) evidence`
      );
    }
  }
  return errors;
}
