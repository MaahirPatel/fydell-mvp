import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { memberIdentity, type AuthIdentityMetadata, type MemberIdentity } from "./identity";

/**
 * The signed-in member's name, initials and avatar, as the sidebar and
 * Settings both show them. Reads every profile column so an optional column
 * missing from one environment cannot fail the read and drop the name.
 */
export async function loadMemberIdentity(user: { id: string; email?: string | null; user_metadata?: AuthIdentityMetadata | null }): Promise<MemberIdentity> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return memberIdentity(user.email || "", profile, user.user_metadata ?? null);
}
