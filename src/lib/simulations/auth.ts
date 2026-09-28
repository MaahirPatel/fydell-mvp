import "server-only";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseAuthConfigured } from "@/lib/supabase";
import { isPreviewMode, PREVIEW_ORG, PREVIEW_USER } from "@/lib/dev/preview";

export async function requireUser(): Promise<{ id: string; email: string } | null> {
  if (isPreviewMode()) return PREVIEW_USER;
  if (!isSupabaseAuthConfigured()) return null;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return { id: data.user.id, email: data.user.email || "" };

  // W2: non-browser clients (the desktop app) present the Supabase access
  // token directly as `Authorization: Bearer <jwt>`. This only runs when no
  // cookie session exists; cookie behavior above is unchanged. The token is
  // validated against the Supabase Auth server, never trusted blindly.
  const authHeader = (await headers()).get("authorization");
  const bearer = authHeader ? /^Bearer\s+(\S+)\s*$/.exec(authHeader)?.[1] : undefined;
  if (bearer) {
    const { data: bearerData } = await supabase.auth.getUser(bearer);
    if (bearerData.user) {
      return { id: bearerData.user.id, email: bearerData.user.email || "" };
    }
  }
  return null;
}

export interface OrgContext {
  userId: string;
  organizationId: string;
  organizationName: string;
  /** organization_members.role; routes check capabilities via orgCan(). */
  role: string;
}

/** Resolve the caller's active organization membership (employers). */
export async function requireOrgMember(userId: string): Promise<OrgContext | null> {
  if (isPreviewMode()) return PREVIEW_ORG;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
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
    role: (data.role as string) || "viewer",
  };
}

/** The caller's active role in a specific organization, or null. */
export async function orgMemberRole(userId: string, organizationId: string): Promise<string | null> {
  if (isPreviewMode()) return PREVIEW_ORG.role;
  const { data } = await createAdminSupabaseClient()
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as string | undefined) ?? null;
}
