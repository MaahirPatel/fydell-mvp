/**
 * Server wiring shared by the run, analysis and report routes.
 */

import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getTemplateById } from "@/lib/simulations/db";
import { scenarioIdForTemplateSlug } from "@/lib/simulations/scenario-package";
import { hasEngineeringEvaluation, loadTrustedMaterial } from "./descriptor";
import { selectExecutionProvider } from "./providers";
import type { RunDeps } from "./run";
import { createSupabaseTestRunStore } from "./supabase-store";

/** The engineering scenario behind a session's template, or null for non-engineering sims. */
export async function engineeringScenarioForTemplate(templateId: string): Promise<string | null> {
  const template = await getTemplateById(templateId);
  const scenarioId = scenarioIdForTemplateSlug(template.slug);
  return scenarioId && hasEngineeringEvaluation(scenarioId) ? scenarioId : null;
}

export async function engineeringRunDeps(scenarioId: string): Promise<RunDeps> {
  return {
    store: createSupabaseTestRunStore(createAdminSupabaseClient()),
    provider: await selectExecutionProvider(),
    material: loadTrustedMaterial(scenarioId),
  };
}
