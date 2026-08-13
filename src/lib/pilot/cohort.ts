import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { PILOT_EVALUATION_SLUG } from "@/lib/simulations/content/micro-ops-yield";
import { getPublishedTemplates } from "@/lib/simulations/db";

export const CONSENT_POLICY_VERSION = "october_pilot_consent_v1";
export const CAPTURE_POLICY_VERSION = "capture_v1";
export const AI_POLICY_VERSION = "ai_observe_v1";

export type CohortStatus = "draft" | "open" | "paused" | "closed";

export interface PilotCohortRow {
  id: string;
  organization_id: string;
  name: string;
  status: CohortStatus;
  template_id: string;
  template_version_id: string;
  invitation_expires_days: number;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Resolve the published flagship evaluation template and version. */
export async function resolvePilotEvaluationTemplate(): Promise<{
  templateId: string;
  templateVersionId: string;
  title: string;
  slug: string;
}> {
  const published = await getPublishedTemplates();
  const hit = published.find((p) => p.template.slug === PILOT_EVALUATION_SLUG);
  if (!hit?.version) {
    throw new Error(
      `Evaluation "${PILOT_EVALUATION_SLUG}" is not published. Seed templates first.`
    );
  }
  return {
    templateId: hit.template.id,
    templateVersionId: hit.version.id,
    title: hit.template.title,
    slug: hit.template.slug,
  };
}

/** Get or create the org's active (open/paused/draft) DA pilot cohort. */
export async function ensureOrgPilotCohort(
  organizationId: string,
  createdBy: string | null
): Promise<PilotCohortRow> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db
    .from("pilot_cohorts")
    .select("*")
    .eq("organization_id", organizationId)
    .in("status", ["draft", "open", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as PilotCohortRow;

  const evalTpl = await resolvePilotEvaluationTemplate();
  const { data, error } = await db
    .from("pilot_cohorts")
    .insert({
      organization_id: organizationId,
      name: `${evalTpl.title} cohort`,
      status: "draft",
      template_id: evalTpl.templateId,
      template_version_id: evalTpl.templateVersionId,
      invitation_expires_days: 14,
      created_by: createdBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not create pilot cohort: ${error.message}`);
  return data as PilotCohortRow;
}

export async function getOrgPilotCohort(
  organizationId: string
): Promise<PilotCohortRow | null> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("pilot_cohorts")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as PilotCohortRow) || null;
}

export async function setCohortStatus(
  organizationId: string,
  cohortId: string,
  status: CohortStatus
): Promise<PilotCohortRow> {
  const db = createAdminSupabaseClient();
  const patch: Record<string, unknown> = { status };
  if (status === "open") patch.opens_at = new Date().toISOString();
  if (status === "closed") patch.closes_at = new Date().toISOString();

  const { data, error } = await db
    .from("pilot_cohorts")
    .update(patch)
    .eq("id", cohortId)
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error) throw new Error(`Could not update cohort: ${error.message}`);

  await db.from("pilot_audit_events").insert({
    organization_id: organizationId,
    action: `cohort_${status}`,
    entity_type: "pilot_cohort",
    entity_id: cohortId,
    payload: { status },
  });

  return data as PilotCohortRow;
}

export async function recordPilotAudit(input: {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from("pilot_audit_events").insert({
    organization_id: input.organizationId || null,
    actor_user_id: input.actorUserId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    payload: input.payload || {},
  });
}
