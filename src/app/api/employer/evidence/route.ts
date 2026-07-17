import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VISIBLE_STATUSES = ["receipt_ready", "processing", "submitted"];

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
    return NextResponse.json({ sessions: [] });
  }

  const { data: missions } = await admin
    .from("fde_missions")
    .select("id, title")
    .eq("organization_id", membership.organization_id);
  const missionIds = (missions || []).map((m) => m.id);
  const missionTitleById = Object.fromEntries((missions || []).map((m) => [m.id, m.title]));
  if (missionIds.length === 0) return NextResponse.json({ sessions: [] });

  const { data: sessions, error } = await admin
    .from("relay_sessions")
    .select("id, mission_id, fde_user_id, status, submitted_at, created_at")
    .in("mission_id", missionIds)
    .in("status", VISIBLE_STATUSES)
    .order("submitted_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fdeUserIds = Array.from(new Set((sessions || []).map((s) => s.fde_user_id)));
  let fdeNames: Record<string, string> = {};
  if (fdeUserIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, display_name, email").in("id", fdeUserIds);
    fdeNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.display_name || p.email || "FDE"]));
  }

  const shaped = (sessions || []).map((s) => ({
    id: s.id,
    missionId: s.mission_id,
    missionTitle: missionTitleById[s.mission_id] || "Mission",
    fdeName: fdeNames[s.fde_user_id] || "FDE",
    status: s.status,
    submittedAt: s.submitted_at,
    createdAt: s.created_at,
  }));

  return NextResponse.json({ sessions: shaped });
}
