import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";
import { enqueueAction } from "@/lib/fde/action-inbox";

export const dynamic = "force-dynamic";

const VALID_DECISIONS = ["advance", "hold", "decline", "hired", "withdrawn"];
const MIN_RATIONALE_LENGTH = 15;

const DECISION_LABEL: Record<string, string> = {
  advance: "Advance",
  hold: "Hold",
  decline: "Decline",
  hired: "Hired",
  withdrawn: "Withdrawn",
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.json({ decisions: [] });
  }

  const { data: decisions, error } = await admin
    .from("fde_employer_decisions")
    .select("id, mission_id, session_id, fde_user_id, decision, structured_reason, evidence_gaps, created_at, fde_missions(title)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fdeUserIds = Array.from(new Set((decisions || []).map((d) => d.fde_user_id)));
  let fdeNames: Record<string, string> = {};
  if (fdeUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", fdeUserIds);
    fdeNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.display_name || p.email || "FDE"]));
  }

  const shaped = (decisions || []).map((d) => ({
    id: d.id,
    missionId: d.mission_id,
    missionTitle: (d.fde_missions as { title?: string } | null)?.title || "Mission",
    sessionId: d.session_id,
    fdeName: fdeNames[d.fde_user_id] || "FDE",
    decision: d.decision,
    structuredReason: d.structured_reason,
    evidenceGaps: d.evidence_gaps,
    createdAt: d.created_at,
  }));

  return NextResponse.json({ decisions: shaped });
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const sessionId = String(body.sessionId || "");
    const decision = String(body.decision || "");
    const structuredReason = String(body.structuredReason || "").trim();
    if (!sessionId || !VALID_DECISIONS.includes(decision)) {
      return NextResponse.json({ error: "A valid sessionId and decision are required." }, { status: 400 });
    }
    if (structuredReason.length < MIN_RATIONALE_LENGTH) {
      return NextResponse.json(
        { error: `A rationale of at least ${MIN_RATIONALE_LENGTH} characters is required to record a decision.` },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: session } = await admin.from("relay_sessions").select("mission_id, fde_user_id").eq("id", sessionId).maybeSingle();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { data: mission } = await admin
      .from("fde_missions")
      .select("organization_id")
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

    const { data: created, error } = await admin
      .from("fde_employer_decisions")
      .insert({
        mission_id: session.mission_id,
        fde_user_id: session.fde_user_id,
        session_id: sessionId,
        organization_id: mission.organization_id,
        decision,
        structured_reason: structuredReason,
        evidence_gaps: body.evidenceGaps || null,
      })
      .select("*")
      .single();
    if (error || !created) return NextResponse.json({ error: error?.message || "Could not record decision." }, { status: 400 });

    await audit(data.user.id, "fde_employer_decision.created", "fde_employer_decision", created.id, {
      sessionId,
      decision,
    });

    const { data: missionForNotice } = await admin
      .from("fde_missions")
      .select("title")
      .eq("id", session.mission_id)
      .maybeSingle();

    await enqueueAction({
      userId: session.fde_user_id,
      type: "decision_recorded",
      title: `Decision recorded: ${DECISION_LABEL[decision] || decision}`,
      body: missionForNotice?.title
        ? `A hiring decision was recorded for "${missionForNotice.title}".`
        : "A hiring decision was recorded for one of your missions.",
      actionUrl: "/app/fde/receipts",
      organizationId: mission.organization_id,
      missionId: session.mission_id,
      sessionId,
    });

    return NextResponse.json({ ok: true, decision: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not record decision.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
