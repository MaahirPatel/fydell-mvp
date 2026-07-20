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
    .select(
      "id, mission_id, invitation_id, fde_user_id, status, started_at, submitted_at, created_at, attempt_kind"
    )
    .in("mission_id", missionIds)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Exclude preview/demonstration from the real candidate attempts list.
  const productionSessions = (sessions || []).filter(
    (s) => !("attempt_kind" in s) || !s.attempt_kind || s.attempt_kind === "scored"
  );

  const fdeUserIds = Array.from(
    new Set(productionSessions.map((s) => s.fde_user_id).filter(Boolean))
  );
  let fdeInfoById: Record<string, { name: string; email: string | null }> = {};
  if (fdeUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", fdeUserIds);
    fdeInfoById = Object.fromEntries(
      (profiles || []).map((p) => [p.id, { name: p.display_name || p.email || "FDE", email: p.email || null }])
    );
  }

  const invitationIds = Array.from(
    new Set(productionSessions.map((s) => s.invitation_id).filter(Boolean))
  ) as string[];
  let invitedEmailByInvitation: Record<string, string> = {};
  if (invitationIds.length > 0) {
    const { data: invites } = await admin
      .from("fde_invitations")
      .select("id, invited_email")
      .in("id", invitationIds);
    invitedEmailByInvitation = Object.fromEntries((invites || []).map((i) => [i.id, i.invited_email]));
  }

  const shaped = productionSessions.map((s) => {
    const fdeInfo = fdeInfoById[s.fde_user_id];
    const candidateEmail =
      fdeInfo?.email || (s.invitation_id ? invitedEmailByInvitation[s.invitation_id] : null) || null;
    return {
      id: s.id,
      missionId: s.mission_id,
      missionTitle: missionTitleById[s.mission_id] || "Mission",
      candidateName: fdeInfo?.name || "FDE",
      candidateEmail,
      status: s.status,
      startedAt: s.started_at,
      submittedAt: s.submitted_at,
      createdAt: s.created_at,
    };
  });

  return NextResponse.json({ sessions: shaped });
}
