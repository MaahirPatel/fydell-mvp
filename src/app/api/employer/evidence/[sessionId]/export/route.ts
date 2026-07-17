import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { loadSessionAnalysis } from "@/lib/fde/relay-session";

export const dynamic = "force-dynamic";

/** Counsel-ready audit export: findings, scores, prediction, decisions, access. */
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
    .select("id, title, organization_id")
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

  const analysis = await loadSessionAnalysis(sessionId);
  const { data: findings } = await admin.from("fde_evidence_findings").select("*").eq("session_id", sessionId);
  const { data: decisions } = await admin
    .from("fde_employer_decisions")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  const { data: events } = await admin
    .from("relay_execution_events")
    .select("id, sequence_number, actor, event_type, source_surface, created_at")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const exportBody = {
    exportedAt: new Date().toISOString(),
    exportedBy: data.user.id,
    purpose: "hiring_audit_export",
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.started_at,
      submittedAt: session.submitted_at,
      endsAt: session.ends_at,
      technicalInterruptionSeconds: session.technical_interruption_seconds,
    },
    mission: { id: mission.id, title: mission.title, organizationId: mission.organization_id },
    analysis,
    findings: findings || [],
    decisions: decisions || [],
    eventIndex: events || [],
  };

  return new NextResponse(JSON.stringify(exportBody, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="fydell-audit-${sessionId}.json"`,
    },
  });
}
