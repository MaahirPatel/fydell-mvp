import "server-only";
import { CURRENT_SCENARIO, getScenario } from "./scenarios";
import type { ScenarioDefinition } from "./scenarios/types";
import { STARTER_SHA256 } from "./scenarios/backend-webhook-retry/starter.generated";
import { HARNESS_SHA256 } from "./scenarios/backend-webhook-retry/hidden.generated";
import type { Admin } from "./context";
import type { ScenarioVersionRow } from "./types";

/**
 * Content stored in the database is what a candidate may read before starting.
 * Teammate answers and the requirement update stay in server code so the update
 * cannot be read ahead of its release time.
 */
function publicContent(s: ScenarioDefinition): Record<string, unknown> {
  return {
    summary: s.summary,
    candidateBrief: s.candidateBrief,
    initialRequirements: s.initialRequirements,
    resources: s.resources,
    stack: s.stack,
    targetMinutes: s.targetMinutes,
    defaultAllowedMinutes: s.defaultAllowedMinutes,
    prerequisites: s.prerequisites,
    supportedEnvironments: s.supportedEnvironments,
    aiPolicy: s.aiPolicy,
    packaging: s.packaging,
    accommodations: s.accommodations,
    teammates: s.teammates,
    handoffPrompts: s.handoffPrompts,
    rubric: s.rubric,
    knownIssues: s.knownIssues,
  };
}

export async function ensureCurrentScenarioVersion(db: Admin): Promise<ScenarioVersionRow> {
  const s = CURRENT_SCENARIO;
  const { data: existing } = await db
    .from("eng_scenario_versions")
    .select("*")
    .eq("scenario_key", s.key)
    .eq("version", s.version)
    .maybeSingle();
  if (existing) {
    const row = existing as ScenarioVersionRow;
    if (row.starter_sha256 !== STARTER_SHA256 || row.harness_sha256 !== HARNESS_SHA256) {
      throw new Error(
        `Scenario ${s.key} v${s.version} changed after publication. Publish a new version instead of editing it.`
      );
    }
    return row;
  }
  const { data, error } = await db
    .from("eng_scenario_versions")
    .insert({
      scenario_key: s.key,
      version: s.version,
      title: s.title,
      role_family: s.roleFamily,
      content: publicContent(s),
      starter_sha256: STARTER_SHA256,
      harness_sha256: HARNESS_SHA256,
      suite_version: s.suiteVersion,
      rubric_version: s.rubricVersion,
      review_record: s.reviewRecord,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") return ensureCurrentScenarioVersion(db);
    throw new Error(`Could not publish scenario version: ${error.message}`);
  }
  return data as ScenarioVersionRow;
}

export async function scenarioForVersionId(
  db: Admin,
  versionId: string
): Promise<{ row: ScenarioVersionRow; definition: ScenarioDefinition }> {
  const { data } = await db.from("eng_scenario_versions").select("*").eq("id", versionId).single();
  if (!data) throw new Error("Scenario version not found");
  const row = data as ScenarioVersionRow;
  const definition = getScenario(row.scenario_key, row.version);
  if (!definition) throw new Error(`Scenario ${row.scenario_key} v${row.version} is not available on this server`);
  return { row, definition };
}
