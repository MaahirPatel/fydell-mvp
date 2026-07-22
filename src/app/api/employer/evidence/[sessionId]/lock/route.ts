import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

/**
 * Shadow-pilot decision lock. Records the employer's ORIGINAL decision —
 * timestamped, immutable (DB trigger rejects update/delete) — BEFORE any
 * Fydell evidence for the session is revealed.
 */
export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const decision = String(body.decision || "");
    const confidence = String(body.confidence || "medium");
    const reasons = String(body.reasons || "").trim();

    if (!["advance", "hold", "decline"].includes(decision)) {
      return NextResponse.json({ error: "Decision must be advance, hold, or decline." }, { status: 400 });
    }
    if (!["low", "medium", "high"].includes(confidence)) {
      return NextResponse.json({ error: "Confidence must be low, medium, or high." }, { status: 400 });
    }
    if (reasons.length < 10) {
      return NextResponse.json(
        { error: "Add at least 10 characters explaining your original decision." },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: session } = await admin
      .from("relay_sessions")
      .select("id, mission_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const { data: mission } = await admin
      .from("fde_missions")
      .select("id, organization_id, mode")
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

    // Idempotent: an existing lock is returned unchanged, never overwritten.
    const { data: existing } = await admin
      .from("employer_decision_locks")
      .select("id, decision, confidence, reasons, locked_by, locked_at")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, lock: existing, alreadyLocked: true });
    }

    const { data: lock, error } = await admin
      .from("employer_decision_locks")
      .insert({
        session_id: sessionId,
        mission_id: mission.id,
        organization_id: mission.organization_id,
        decision,
        confidence,
        reasons,
        locked_by: data.user.id,
      })
      .select("id, decision, confidence, reasons, locked_by, locked_at")
      .single();
    if (error || !lock) {
      return NextResponse.json({ error: error?.message || "Could not lock decision." }, { status: 400 });
    }

    await audit(data.user.id, "shadow.decision_locked", "employer_decision_lock", lock.id, {
      sessionId,
      missionId: mission.id,
      decision,
      confidence,
    });

    return NextResponse.json({ ok: true, lock, alreadyLocked: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not lock decision.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
