import type { SimulationAttempt, SimulationScenarioDefinition } from "../types";

export type EvidenceDirection = "STRENGTH" | "CONCERN" | "INSUFFICIENT_EVIDENCE";
export type EvidenceConfidence = "HIGH" | "MODERATE" | "LOW";

export interface NorthlineEvidenceClaim {
  id: string;
  competencyId: string;
  direction: EvidenceDirection;
  confidence: EvidenceConfidence;
  statement: string;
  evidenceKind: "OBSERVATION" | "INFERENCE";
  supportingEventIds: string[];
  counterEventIds: string[];
  rubricVersion: string;
  promptVersion: string;
  modelVersion: string;
}

export interface NorthlinePassAResult {
  claims: NorthlineEvidenceClaim[];
  defenseQuestions: string[];
}

export interface NorthlinePassBResult {
  claims: NorthlineEvidenceClaim[];
  defenseEventIds: string[];
}

export interface NorthlineDefenseResponse {
  eventId: string;
  response: string;
}

const PROMPT_VERSION = "northline-pass-a-1.0.0";
const MODEL_VERSION = "deterministic-fixture-evaluator-1.0.0";

function idsFor(attempt: SimulationAttempt, type: string): string[] {
  return attempt.telemetry.filter((event) => event.type === type).map((event) => event.id);
}

function memo(attempt: SimulationAttempt): string {
  return (
    Object.values(attempt.artifacts)
      .find((artifact) => artifact.kind === "analysis_memo")
      ?.content.toLowerCase() ?? ""
  );
}

function changedFactEventIds(attempt: SimulationAttempt): string[] {
  return attempt.world.scenarioEvents
    .filter((event) => event.payload?.factId === "HOLD_RECLASS_DAY_9")
    .map((event) => event.id);
}

function claim(args: {
  scenario: SimulationScenarioDefinition;
  id: string;
  competencyId: string;
  direction: EvidenceDirection;
  confidence: EvidenceConfidence;
  statement: string;
  evidenceKind?: "OBSERVATION" | "INFERENCE";
  supportingEventIds: string[];
  counterEventIds?: string[];
}): NorthlineEvidenceClaim {
  return {
    id: args.id,
    competencyId: args.competencyId,
    direction: args.direction,
    confidence: args.confidence,
    statement: args.statement,
    evidenceKind: args.evidenceKind ?? "INFERENCE",
    supportingEventIds: args.supportingEventIds,
    counterEventIds: args.counterEventIds ?? [],
    rubricVersion: args.scenario.versions.competencyModelVersion,
    promptVersion: PROMPT_VERSION,
    modelVersion: MODEL_VERSION,
  };
}

export function evaluateNorthlinePassA(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt
): NorthlinePassAResult {
  const content = memo(attempt);
  const sqlIds = idsFor(attempt, "SQL_EXECUTE");
  const artifactCreates = idsFor(attempt, "ARTIFACT_CREATED");
  const artifactUpdates = idsFor(attempt, "ARTIFACT_UPDATED");
  const messageIds = idsFor(attempt, "MESSAGE_SENT");
  const worldIds = changedFactEventIds(attempt);
  const mentionsReclass =
    /hold_reclass|hold reclass|reclass/.test(content) && /\b144\b|day 9|day-9/.test(content);
  const mentionsResidual =
    /l2 day/.test(content) && /\b40\b|residual|more scrap/.test(content);
  const overreacts =
    /invalidates the entire|discard all|stop both lines|no conclusion is possible/.test(content);
  const changedAt = attempt.world.scenarioEvents.find(
    (event) => event.payload?.factId === "HOLD_RECLASS_DAY_9"
  )?.createdAtMs;
  const revisedAfterChange =
    changedAt !== undefined &&
    attempt.telemetry.some(
      (event) => event.type === "ARTIFACT_UPDATED" && event.elapsedMs > changedAt
    );

  const claims: NorthlineEvidenceClaim[] = [];
  claims.push(
    claim({
      scenario,
      id: "northline-analytical-correctness",
      competencyId: "analytical_correctness",
      direction:
        mentionsReclass && mentionsResidual
          ? "STRENGTH"
          : sqlIds.length === 0
            ? "INSUFFICIENT_EVIDENCE"
            : "CONCERN",
      confidence: mentionsReclass && mentionsResidual ? "HIGH" : sqlIds.length ? "MODERATE" : "LOW",
      statement:
        mentionsReclass && mentionsResidual
          ? "The recommendation separates the deterministic reporting reclassification from the L2 Day residual loss."
          : sqlIds.length === 0
            ? "No query evidence was captured to support an analytical conclusion."
            : "The query trail exists, but the final recommendation does not preserve both the reporting explanation and residual exception.",
      supportingEventIds: mentionsReclass && mentionsResidual ? [...sqlIds, ...artifactUpdates] : sqlIds,
      counterEventIds: mentionsReclass && mentionsResidual ? [] : artifactCreates,
    })
  );

  claims.push(
    claim({
      scenario,
      id: "northline-change-response",
      competencyId: "changed_information_response",
      direction: !worldIds.length
        ? "INSUFFICIENT_EVIDENCE"
        : revisedAfterChange && !overreacts
          ? "STRENGTH"
          : "CONCERN",
      confidence: !worldIds.length ? "LOW" : "HIGH",
      statement: !worldIds.length
        ? "The changed fact was not present, so adaptation cannot be evaluated."
        : revisedAfterChange && !overreacts
          ? "The candidate revised after the day-9 correction while preserving the unaffected residual finding."
          : revisedAfterChange
            ? "The candidate revised after the correction but discarded valid work and overreacted."
            : "The candidate received the day-9 correction and submitted without revising the artifact.",
      supportingEventIds: revisedAfterChange ? [...worldIds, ...artifactUpdates] : worldIds,
      counterEventIds: revisedAfterChange && !overreacts ? [] : artifactCreates,
    })
  );

  const plainLanguage =
    /recommendation|do not treat|check|before the next shift|limitation/.test(content) &&
    content.length >= 180;
  claims.push(
    claim({
      scenario,
      id: "northline-business-communication",
      competencyId: "business_judgment",
      direction: plainLanguage
        ? "STRENGTH"
        : content
          ? "CONCERN"
          : "INSUFFICIENT_EVIDENCE",
      confidence: content ? "MODERATE" : "LOW",
      statement: plainLanguage
        ? "The memo gives Operations a scoped action, a limitation, and avoids claiming an unsupported cause."
        : content
          ? "The memo is too compressed, technical, or operationally unclear for the stated audience."
          : "No stakeholder-facing recommendation was saved.",
      supportingEventIds: plainLanguage ? [...artifactCreates, ...artifactUpdates, ...messageIds] : [],
      counterEventIds: plainLanguage ? [] : [...artifactCreates, ...artifactUpdates],
    })
  );

  return {
    claims,
    defenseQuestions: [
      "Walk me through how the day-9 correction changed your estimate and what it did not change.",
      "Why is L2 Day actionable without being enough evidence to name a cause?",
      ...(messageIds.length
        ? []
        : ["How would you explain this recommendation verbally to the Operations Manager?"]),
    ],
  };
}

export function evaluateNorthlinePassB(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  defenseResponses: NorthlineDefenseResponse[]
): NorthlinePassBResult {
  const passA = evaluateNorthlinePassA(scenario, attempt);
  const defenseEventIds = defenseResponses.map((response) => response.eventId);
  const combined = defenseResponses
    .map((response) => response.response.trim().toLowerCase())
    .join(" ");
  const substantive =
    combined.length >= 120 &&
    /day 9|day-9|timing|affected window/.test(combined) &&
    /l2 day|residual|preserv|still holds/.test(combined) &&
    /limit|not establish|cannot claim|verify|next shift/.test(combined);
  const hollow =
    defenseResponses.length === 0 ||
    combined.length < 40 ||
    /^(i don't know|not sure|same as memo|no comment|nothing to add)[.! ]*$/.test(combined);

  return {
    claims: passA.claims.map((item) => {
      const evidenceIds = Array.from(new Set([...item.supportingEventIds, ...defenseEventIds]));
      if (hollow) {
        return {
          ...item,
          direction:
            item.competencyId === "changed_information_response" ||
            item.competencyId === "business_judgment"
              ? "CONCERN"
              : item.direction,
          confidence: "MODERATE",
          statement:
            item.competencyId === "changed_information_response"
              ? "The written revision was present, but the defense did not explain what changed or what valid finding was preserved."
              : item.competencyId === "business_judgment"
                ? "The defense did not add a usable operational explanation or acknowledge the evidence limit."
                : item.statement,
          supportingEventIds: evidenceIds,
          counterEventIds: Array.from(new Set([...item.counterEventIds, ...defenseEventIds])),
          promptVersion: "northline-pass-b-1.0.0",
        };
      }
      if (!substantive) {
        return {
          ...item,
          confidence: item.confidence === "HIGH" ? "MODERATE" : item.confidence,
          statement:
            item.competencyId === "changed_information_response"
              ? "The defense addressed the correction but did not fully connect the affected window, preserved residual finding, and evidence limit."
              : item.statement,
          supportingEventIds: evidenceIds,
          promptVersion: "northline-pass-b-1.0.0",
        };
      }
      return {
        ...item,
        supportingEventIds: evidenceIds,
        confidence: item.direction === "INSUFFICIENT_EVIDENCE" ? "LOW" : "HIGH",
        promptVersion: "northline-pass-b-1.0.0",
      };
    }),
    defenseEventIds,
  };
}
