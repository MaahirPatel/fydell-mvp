import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Append an audit log row. Best effort; callers do not depend on the result. */
export async function audit(
  actor: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminSupabaseClient();
  const actorIsUuid = actor ? UUID_RE.test(actor) : false;
  await admin.from("fde_audit_logs").insert({
    actor_user_id: actorIsUuid ? actor : null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: actorIsUuid || !actor ? metadata : { ...metadata, actor },
  });
}

/** Ensure the candidate profile row exists for a user. Returns the row. */
export async function ensureCandidateProfile(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("fde_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("fde_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error || !created) throw new Error(error?.message || "Could not create candidate profile.");
  return created;
}
