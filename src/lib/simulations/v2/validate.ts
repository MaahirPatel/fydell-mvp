/**
 * Structural validation for SimulationDefinitionV2.
 */
import type { SimulationDefinitionV2 } from "./types";

function nearOne(sum: number, tol = 0.02): boolean {
  return Math.abs(sum - 1) <= tol;
}

/** Returns a list of validation error strings (empty when valid). */
export function validateV2(def: SimulationDefinitionV2): string[] {
  const errors: string[] = [];

  if (def.format !== "v2") errors.push('format must be "v2"');
  if (def.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  if (!def.id) errors.push("Missing id");
  if (!def.slug) errors.push("Missing slug");
  if (!def.title) errors.push("Missing title");
  if (!def.mission) errors.push("Missing mission");
  if (!def.roleKey) errors.push("Missing roleKey");
  if (!(def.durationMinutes > 0)) errors.push("durationMinutes must be > 0");
  if (!def.version || def.version < 1) errors.push("version must be >= 1");

  if (!def.modules || def.modules.length === 0) {
    errors.push("modules required");
  } else {
    const kinds = new Set(def.modules.map((m) => m.kind));
    if (!kinds.has("briefing")) errors.push("modules must include a briefing");
    const hasResource =
      kinds.has("resource_table") ||
      kinds.has("resource_doc") ||
      kinds.has("data_workbench") ||
      kinds.has("requirements_board") ||
      kinds.has("ticket_queue") ||
      kinds.has("cutover_plan") ||
      kinds.has("rules_panel");
    if (!hasResource) errors.push("modules must include at least one resource or workbench");
  }

  if (!def.competencies || def.competencies.length === 0) {
    errors.push("competencies required");
  }

  if (!def.stakeholders || def.stakeholders.length === 0) {
    errors.push("at least one stakeholder required");
  } else {
    for (const s of def.stakeholders) {
      if (!s.fallbackReply) errors.push(`Stakeholder ${s.id} missing fallback reply`);
    }
  }

  const scoring = def.scoring;
  if (!scoring || !scoring.opportunities || scoring.opportunities.length === 0) {
    errors.push("scoring.opportunities required");
    return errors;
  }

  const oppWeightSum = scoring.opportunities.reduce((s, o) => s + o.weight, 0);
  if (!nearOne(oppWeightSum)) {
    errors.push(`opportunity weights must sum ≈ 1 (got ${oppWeightSum.toFixed(4)})`);
  }

  for (const o of scoring.opportunities) {
    if (!(o.weight > 0)) errors.push(`Opportunity ${o.id} weight must be > 0`);
    if (!o.requiredSignals || o.requiredSignals.length === 0) {
      errors.push(`Opportunity ${o.id} needs requiredSignals`);
    }
  }

  const cwEntries = Object.entries(scoring.competencyWeights || {});
  if (cwEntries.length === 0) {
    errors.push("competencyWeights required");
  } else {
    const cwSum = cwEntries.reduce((s, [, w]) => s + w, 0);
    if (!nearOne(cwSum)) {
      errors.push(`competencyWeights must sum ≈ 1 (got ${cwSum.toFixed(4)})`);
    }
  }

  if (!scoring.indicators || scoring.indicators.length === 0) {
    errors.push("scoring.indicators required");
  } else {
    const oppComps = new Set(scoring.opportunities.map((o) => o.competencyKey));
    for (const ind of scoring.indicators) {
      if (!oppComps.has(ind.competencyKey)) {
        errors.push(`Indicator ${ind.id} has no opportunity for competency ${ind.competencyKey}`);
      }
      if (!ind.anchors?.strong || !ind.anchors?.partial || !ind.anchors?.weak) {
        errors.push(`Indicator ${ind.id} missing anchors`);
      }
    }
  }

  const compKeys = new Set(def.competencies.map((c) => c.key));
  for (const o of scoring.opportunities) {
    if (!compKeys.has(o.competencyKey)) {
      errors.push(`Opportunity ${o.id} references unknown competency ${o.competencyKey}`);
    }
  }

  const moduleIds = new Set(def.modules.map((m) => m.id));
  if (moduleIds.size !== def.modules.length) errors.push("Duplicate module ids");

  return errors;
}
