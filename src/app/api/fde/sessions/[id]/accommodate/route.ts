import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { audit } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

/**
 * Disability / accommodation time extension.
 * Extends ends_at without starting a new timer; logs an audit event.
 * Employer org members or the candidate may request; minutes clamped 5–120.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    extraMinutes?: number;
    reason?: string;
  };
  const extraMinutes = Math.min(120, Math.max(5, Math.floor(Number(body.extraMinutes) || 0)));
  if (!Number.isFinite(extraMinutes) || extraMinutes < 5) {
    return NextResponse.json({ error: "extraMinutes must be between 5 and 120" }, { status: 400 });
  }
  const reason = String(body.reason || "accommodation").slice(0, 500);

  const admin = createAdminSupabaseClient();
  const { data: session } = await admin.from("relay_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: mission } = await admin
    .from("fde_missions")
    .select("organization_id")
    .eq("id", session.mission_id)
    .maybeSingle();

  const isCandidate = session.fde_user_id === data.user.id;
  let isEmployer = false;
  if (mission?.organization_id) {
    const { data: membership } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", data.user.id)
      .eq("organization_id", mission.organization_id)
      .eq("status", "active")
      .maybeSingle();
    isEmployer = Boolean(membership);
  }
  if (!isCandidate && !isEmployer) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!session.ends_at) {
    return NextResponse.json(
      { error: "Session timer has not started yet — arrange accommodation before Start." },
      { status: 400 }
    );
  }

  const nextEnds = new Date(new Date(session.ends_at).getTime() + extraMinutes * 60_000).toISOString();
  const { data: updated, error } = await admin
    .from("relay_sessions")
    .update({ ends_at: nextEnds })
    .eq("id", sessionId)
    .select("id, ends_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit(data.user.id, "relay_session.accommodation_extended", "relay_session", sessionId, {
    extraMinutes,
    reason,
    previousEndsAt: session.ends_at,
    nextEndsAt: nextEnds,
  });

  const { data: seqRow } = await admin
    .from("relay_execution_events")
    .select("sequence_number")
    .eq("session_id", sessionId)
    .order("sequence_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  await admin.from("relay_execution_events").insert({
    session_id: sessionId,
    sequence_number: (seqRow?.sequence_number || 0) + 1,
    actor: "operator",
    event_type: "accommodation_extended",
    source_surface: "api",
    payload: { extraMinutes, reason, nextEndsAt: nextEnds },
  });

  return NextResponse.json({ ok: true, session: updated, extraMinutes });
}
