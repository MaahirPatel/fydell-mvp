import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

const VALID_DECISIONS = ["advance", "hold", "decline", "hired", "withdrawn"];

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
    if (!sessionId || !VALID_DECISIONS.includes(decision)) {
      return NextResponse.json({ error: "A valid sessionId and decision are required." }, { status: 400 });
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
        structured_reason: body.structuredReason || null,
        evidence_gaps: body.evidenceGaps || null,
      })
      .select("*")
      .single();
    if (error || !created) return NextResponse.json({ error: error?.message || "Could not record decision." }, { status: 400 });

    await audit(data.user.id, "fde_employer_decision.created", "fde_employer_decision", created.id, {
      sessionId,
      decision,
    });

    return NextResponse.json({ ok: true, decision: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not record decision.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
