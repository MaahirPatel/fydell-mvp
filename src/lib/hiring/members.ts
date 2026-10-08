import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type MemberOption = { userId: string; label: string; email: string; role: string };

/** Active members of the workspace, for choosing a hiring owner and reviewers. */
export async function listActiveMembers(organizationId: string): Promise<MemberOption[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("organization_members")
    .select("user_id,role")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("joined_at", { ascending: true, nullsFirst: false })
    .limit(200);
  const rows = (data ?? []) as Array<{ user_id: string; role: string }>;
  if (rows.length === 0) return [];
  const { data: profiles } = await db
    .from("profiles")
    .select("id,email,full_name,display_name")
    .in(
      "id",
      rows.map((r) => r.user_id),
    );
  const byId = new Map(((profiles ?? []) as Array<{ id: string; email: string; full_name: string | null; display_name: string | null }>).map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.user_id);
    const email = p?.email ?? "";
    const name = (p?.display_name || p?.full_name || "").trim();
    return { userId: r.user_id, email, role: r.role, label: name ? `${name} (${email})` : email || "Workspace member" };
  });
}

/** True when every id is an active member of the workspace. */
export async function allActiveMembers(organizationId: string, userIds: string[]): Promise<boolean> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return true;
  const db = createAdminSupabaseClient();
  const { data } = await db
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("user_id", unique);
  return ((data ?? []) as Array<{ user_id: string }>).length === unique.length;
}
