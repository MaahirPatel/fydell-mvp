import { NextResponse } from "next/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requirePlatformRoleApi(["super_admin", "admin", "operator", "reviewer"]);
  if ("error" in ctx) return ctx.error;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const admin = createAdminSupabaseClient();
  const { data: missions, error } = await admin
    .from("fde_missions")
    .select("id, title, status, organization_id, created_at, organizations(name)")
    .eq("status", "under_review")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const shaped = (missions || []).map((m) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    organizationName: (m.organizations as { name?: string } | null)?.name || "Unknown org",
    createdAt: m.created_at,
  }));

  return NextResponse.json({ missions: shaped });
}
