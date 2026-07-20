import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { loadSessionAnalysis } from "@/lib/fde/relay-session";

export const dynamic = "force-dynamic";

type RelayEventPayload = Record<string, unknown>;

/** One-line, human-readable gloss of an event for the Evidence Aperture expand view. */
function summarizeEvent(eventType: string, payload: RelayEventPayload): string {
  switch (eventType) {
    case "customer_chat_message":
      return String(payload?.text || "Customer chat message");
    case "command_run": {
      const p = payload as { command?: string; ok?: boolean };
      return `Ran \`${p.command || "a command"}\` — ${p.ok ? "passed" : "did not pass"}`;
    }
    case "curveball_revealed":
      return `Curveball revealed${payload?.key ? `: ${payload.key}` : ""}`;
    case "session_started":
      return "Session started";
    case "session_submitted":
      return "Session submitted for evidence generation";
    case "preflight_started":
      return "Preflight started";
    case "file_saved":
      return "Workspace files saved";
    default:
      return eventType.replace(/_/g, " ");
  }
}

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

  const { data: findingRows } = await admin
    .from("fde_evidence_findings")
    .select("*")
    .eq("session_id", sessionId);

  // Findings only ever store ids — resolve them here so the Evidence Aperture
  // can expand a finding into its actual source events without a second round trip.
  const { data: eventRows } = await admin
    .from("relay_execution_events")
    .select("id, event_type, actor, source_surface, payload, created_at, sequence_number")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: true });

  const { data: artifactRows } = await admin
    .from("fde_artifacts")
    .select("id, type, created_at")
    .eq("session_id", sessionId);

  const eventsById: Record<
    string,
    { id: string; eventType: string; actor: string; sourceSurface: string | null; createdAt: string; summary: string }
  > = {};
  for (const e of eventRows || []) {
    eventsById[e.id] = {
      id: e.id,
      eventType: e.event_type,
      actor: e.actor,
      sourceSurface: e.source_surface,
      createdAt: e.created_at,
      summary: summarizeEvent(e.event_type, (e.payload as RelayEventPayload) || {}),
    };
  }

  const artifactsById: Record<string, { id: string; type: string; createdAt: string }> = {};
  for (const a of artifactRows || []) {
    artifactsById[a.id] = { id: a.id, type: a.type, createdAt: a.created_at };
  }

  const findings = (findingRows || []).map((f) => ({
    ...f,
    // Findings always carry these refs through to the payload, even when empty,
    // so the employer UI can always attempt to expand a finding's sources.
    eventRefs: (f.event_ids || []) as string[],
    artifactRefs: (f.artifact_ids || []) as string[],
  }));

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

  const analysis = await loadSessionAnalysis(sessionId);

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
    findings,
    eventsById,
    artifactsById,
    decisions: decisions || [],
    analysis: analysis
      ? {
          composite: analysis.composite,
          prediction: analysis.prediction,
          interviewFollowups: analysis.interviewFollowups,
          processQuality: analysis.processQuality,
          aiQuality: analysis.aiQuality,
          adaptability: analysis.adaptability,
          diagnosticEfficiency: analysis.diagnosticEfficiency,
          validationMaturity: analysis.validationMaturity,
          policyVersion: analysis.policyVersion,
          formulaVersion: analysis.formulaVersion,
        }
      : null,
  });
}
