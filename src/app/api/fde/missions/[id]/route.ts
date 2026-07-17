import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { submitMissionForReview, updateMissionDraft } from "@/lib/fde/lifecycle";

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

  return NextResponse.json({ mission });
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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update mission.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
