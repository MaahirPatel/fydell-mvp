import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  archiveMission,
  duplicateMission,
  publishMission,
  restoreMission,
  submitMissionForReview,
  updateMissionDraft,
} from "@/lib/fde/lifecycle";
import { toPublicMissionStatus } from "@/lib/fde/lifecycle-status";

export const dynamic = "force-dynamic";

async function loadMissionForOrgMember(missionId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) return { mission: null, authorized: false };

  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", mission.organization_id)
    .eq("status", "active")
    .maybeSingle();

  return { mission, authorized: Boolean(membership) };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const { mission, authorized } = await loadMissionForOrgMember(id, data.user.id);
  if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminSupabaseClient();
  // Preview/demonstration attempts must not lock editing or inflate "has sessions".
  const { count } = await admin
    .from("relay_sessions")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", id)
    .or("attempt_kind.is.null,attempt_kind.eq.scored");

  return NextResponse.json({
    mission: {
      ...mission,
      lifecycleStatus: toPublicMissionStatus(String(mission.status)),
    },
    hasSessions: (count || 0) > 0,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const { mission, authorized } = await loadMissionForOrgMember(id, data.user.id);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const updated = await updateMissionDraft(id, data.user.id, body);
    return NextResponse.json({ ok: true, mission: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update mission.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const { mission, authorized } = await loadMissionForOrgMember(id, data.user.id);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "submit_review") {
      const updated = await submitMissionForReview(id, data.user.id);
      return NextResponse.json({ ok: true, mission: updated });
    }

    if (action === "publish" || action === "activate") {
      const updated = await publishMission(id, data.user.id);
      return NextResponse.json({ ok: true, mission: updated });
    }

    if (action === "archive") {
      const updated = await archiveMission(id, data.user.id);
      return NextResponse.json({ ok: true, mission: updated });
    }

    if (action === "restore") {
      const updated = await restoreMission(id, data.user.id);
      return NextResponse.json({ ok: true, mission: updated });
    }

    if (action === "duplicate") {
      const created = await duplicateMission(id, data.user.id);
      return NextResponse.json({ ok: true, mission: created });
    }

    if (action === "set_mode") {
      const mode = String(body.mode || "");
      // live_assist stays disabled until explicitly authorized.
      if (!["demo", "shadow_pilot"].includes(mode)) {
        return NextResponse.json(
          { error: "Mode must be demo or shadow_pilot." },
          { status: 400 }
        );
      }
      const admin = createAdminSupabaseClient();
      const { data: updated, error } = await admin
        .from("fde_missions")
        .update({ mode })
        .eq("id", id)
        .select("*")
        .single();
      if (error || !updated) {
        return NextResponse.json({ error: error?.message || "Could not set mode." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, mission: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update mission.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
