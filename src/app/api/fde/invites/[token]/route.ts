import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { acceptInvitation, getInvitationPreview } from "@/lib/fde/lifecycle";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const { token } = await ctx.params;

  try {
    const { invitation, mission, organizationName } = await getInvitationPreview(token);

    if (invitation.status === "revoked") {
      return NextResponse.json({ error: "Invitation revoked" }, { status: 410 });
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }

    return NextResponse.json({
      email: invitation.invited_email,
      status: invitation.status,
      missionTitle: mission?.title,
      missionObjective: mission?.objective,
      expectedOutcome: mission?.expected_outcome,
      organizationName,
      expiresAt: invitation.expires_at,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invitation not found";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { token } = await ctx.params;
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const result = await acceptInvitation(token, auth.user.id);

    return NextResponse.json({
      ok: true,
      sessionId: result.session.id,
      missionId: result.invitation.mission_id,
      redirectTo: `/s/${token}/consent`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Accept failed";
    const status = /sign in with/i.test(msg) ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
