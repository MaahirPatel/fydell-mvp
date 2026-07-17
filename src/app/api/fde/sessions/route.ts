import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();
  const { data: sessions, error } = await admin
    .from("relay_sessions")
    .select("id, mission_id, status, started_at, submitted_at, created_at, fde_missions(title)")
    .eq("fde_user_id", data.user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const shaped = (sessions || []).map((s) => ({
    id: s.id,
    missionTitle: (s.fde_missions as { title?: string } | null)?.title || "Mission",
    status: s.status,
    startedAt: s.started_at,
    submittedAt: s.submitted_at,
    createdAt: s.created_at,
  }));

  return NextResponse.json({ sessions: shaped });
}
