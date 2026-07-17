import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await ctx.params;
  const admin = createAdminSupabaseClient();

  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: mission } = await admin
    .from("fde_missions")
    .select("id, title, objective, organization_id")
    .eq("id", session.mission_id)
    .maybeSingle();
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .eq("organization_id", mission.organization_id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: findings } = await admin
    .from("fde_evidence_findings")
    .select("*")
    .eq("session_id", sessionId);

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", session.fde_user_id)
    .maybeSingle();

  const { data: decisions } = await admin
    .from("fde_employer_decisions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      submittedAt: session.submitted_at,
      curveballKey: session.curveball_key,
      technicalInterruptionSeconds: session.technical_interruption_seconds,
    },
    mission: { id: mission.id, title: mission.title, objective: mission.objective },
    fde: { name: profile?.display_name || profile?.email || "FDE" },
    findings: findings || [],
    decisions: decisions || [],
  });
}
