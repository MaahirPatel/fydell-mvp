/**
 * Blueprint input/output contract — field-level diagnostics without Zod dependency.
 * Schema version is required on compiled blueprints.
 */
import { TRAIT_IDS, type TraitId } from "../evidence/traits";
import type { EmployerIntake, SimulationBlueprint } from "./types";

export const BLUEPRINT_SCHEMA_VERSION = "blueprint-schema-v1";

export type FieldDiagnostic = {
  field: string;
  code: string;
  message: string;
  severity: "blocking" | "warning";
};

export type SchemaValidationResult = {
  ok: boolean;
  schemaVersion: string;
  diagnostics: FieldDiagnostic[];
};

const INDUSTRIES = new Set([
  "saas",
  "logistics",
  "fintech",
  "healthcare",
  "enterprise_analytics",
  "other",
]);

function diag(
  field: string,
  code: string,
  message: string,
  severity: "blocking" | "warning" = "blocking"
): FieldDiagnostic {
  return { field, code, message, severity };
}

/** Validate employer intake before compile. */
export function validateEmployerIntake(intake: Partial<EmployerIntake>): SchemaValidationResult {
  const diagnostics: FieldDiagnostic[] = [];

  if (!intake.title?.trim()) {
    diagnostics.push(diag("title", "required", "Title is required."));
  }
  if (!intake.objective?.trim()) {
    diagnostics.push(diag("objective", "required", "Objective is required."));
  }
  if (!intake.industry?.trim()) {
    diagnostics.push(diag("industry", "required", "Industry is required."));
  } else if (!INDUSTRIES.has(intake.industry) && intake.industry.length < 2) {
    diagnostics.push(diag("industry", "enum", "Industry value is not recognized.", "warning"));
  }

  const d = Number(intake.durationMinutes);
  if (!Number.isFinite(d) || !Number.isInteger(d)) {
    diagnostics.push(diag("durationMinutes", "type", "Duration must be an integer (minutes)."));
  } else if (d < 20 || d > 180) {
    diagnostics.push(
      diag("durationMinutes", "range", "Duration must be between 20 and 180 minutes.")
    );
  }

  if (intake.skillWeights) {
    for (const [k, v] of Object.entries(intake.skillWeights)) {
      if (!(TRAIT_IDS as readonly string[]).includes(k)) {
        diagnostics.push(diag(`skillWeights.${k}`, "enum", `Unknown trait id "${k}".`));
      } else if (typeof v === "number" && (v < 0 || !Number.isFinite(v))) {
        diagnostics.push(
          diag(`skillWeights.${k}`, "range", "Skill weights must be finite and non-negative.")
        );
      }
    }
  }

  if (intake.criticalTraits) {
    for (const id of intake.criticalTraits) {
      if (!(TRAIT_IDS as readonly string[]).includes(id)) {
        diagnostics.push(diag("criticalTraits", "enum", `Unknown critical trait "${id}".`));
      }
    }
  }

  return {
    ok: diagnostics.every((d) => d.severity !== "blocking"),
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    diagnostics,
  };
}

/** Validate a compiled blueprint structure for persistence / publish. */
export function validateCompiledBlueprint(bp: SimulationBlueprint | null): SchemaValidationResult {
  const diagnostics: FieldDiagnostic[] = [];
  if (!bp) {
    return {
      ok: false,
      schemaVersion: BLUEPRINT_SCHEMA_VERSION,
      diagnostics: [diag("blueprint", "required", "Blueprint is missing.")],
    };
  }

  if (!bp.blueprintId?.trim()) {
    diagnostics.push(diag("blueprintId", "required", "blueprintId is required."));
  }
  if (!bp.version?.trim()) {
    diagnostics.push(diag("version", "required", "Compiler version is required."));
  }
  if (!bp.seed?.trim()) {
    diagnostics.push(diag("seed", "required", "Seed is required for determinism."));
  }
  if (!bp.world?.companyName?.trim()) {
    diagnostics.push(diag("world.companyName", "required", "World company name is required."));
  }
  if (!Array.isArray(bp.episodes) || bp.episodes.length === 0) {
    diagnostics.push(diag("episodes", "required", "At least one episode is required."));
  }

  for (const id of TRAIT_IDS) {
    const c = bp.coverage?.[id as TraitId];
    if (typeof c !== "number" || c < 0 || c > 1 || !Number.isFinite(c)) {
      diagnostics.push(diag(`coverage.${id}`, "range", "Coverage must be finite in [0,1]."));
    }
  }

  // Hidden answer keys must never sit on candidate-visible world fields.
  const worldBlob = JSON.stringify({
    ask: bp.world?.ask,
    tables: bp.world?.tables,
    inboxThread: bp.world?.inboxThread,
    canonicalFacts: bp.world?.canonicalFacts,
  });
  if (/FYDELL_HIDDEN_CANARY|reference_solution|hidden_root_cause_key/i.test(worldBlob)) {
    diagnostics.push(
      diag("world", "leakage", "Candidate-visible world contains forbidden evaluator canary/keys.")
    );
  }

  return {
    ok: diagnostics.every((d) => d.severity !== "blocking"),
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    diagnostics,
  };
}
