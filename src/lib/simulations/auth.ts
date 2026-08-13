import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isPreviewMode, PREVIEW_ORG, PREVIEW_USER } from "@/lib/dev/preview";

export async function requireUser(): Promise<{ id: string; email: string } | null> {
  if (isPreviewMode()) return PREVIEW_USER;
  if (!isSupabaseConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email || "" };
}

export interface OrgContext {
  userId: string;
  organizationId: string;
  organizationName: string;
}

/** Resolve the caller's active organization membership (employers). */
export async function requireOrgMember(userId: string): Promise<OrgContext | null> {
  if (isPreviewMode()) return PREVIEW_ORG;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const org = data.organizations as { name?: string } | null;
  return {
    userId,
    organizationId: data.organization_id,
    organizationName: org?.name || "Your organization",
  };
}
