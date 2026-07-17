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
    return NextResponse.json({ candidates: [] });
  }

  const { data: missions } = await admin
    .from("fde_missions")
    .select("id, title")
    .eq("organization_id", membership.organization_id);
  const missionIds = (missions || []).map((m) => m.id);
  const missionTitleById = Object.fromEntries((missions || []).map((m) => [m.id, m.title]));
  if (missionIds.length === 0) return NextResponse.json({ candidates: [] });

  const { data: invites, error } = await admin
    .from("fde_invitations")
    .select("id, mission_id, invited_email, status, expires_at, accepted_at, created_at")
    .in("mission_id", missionIds)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const invitationIds = (invites || []).map((i) => i.id);
  let sessionByInvitation: Record<string, { id: string; status: string }> = {};
  if (invitationIds.length > 0) {
    const { data: sessions } = await admin
      .from("relay_sessions")
      .select("id, invitation_id, status")
      .in("invitation_id", invitationIds);
    sessionByInvitation = Object.fromEntries(
      (sessions || []).map((s) => [s.invitation_id as string, { id: s.id, status: s.status }])
    );
  }

  const candidates = (invites || []).map((invite) => {
    const session = sessionByInvitation[invite.id] || null;
    return {
      id: invite.id,
      email: invite.invited_email,
      status: invite.status,
      missionId: invite.mission_id,
      missionTitle: missionTitleById[invite.mission_id] || "Mission",
      createdAt: invite.created_at,
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      sessionId: session?.id || null,
      sessionStatus: session?.status || null,
    };
  });

  return NextResponse.json({ candidates });
}
