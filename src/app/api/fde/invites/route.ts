import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { inviteFdeToMission, revokeInvitation } from "@/lib/fde/lifecycle";
import { isResendConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { searchParams } = new URL(req.url);
  const missionId = searchParams.get("missionId");

  if (missionId) {
    // Mission-scoped view for the hiring org.
    const { data: mission } = await admin
      .from("fde_missions")
      .select("organization_id")
      .eq("id", missionId)
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

    const { data: invites, error } = await admin
      .from("fde_invitations")
      .select("id, invited_email, status, expires_at, accepted_at, created_at")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ invites: invites || [] });
  }

  // FDE-facing view: invitations addressed to this person.
  const email = (data.user.email || "").toLowerCase();
  const { data: invites, error } = await admin
    .from("fde_invitations")
    .select("id, invited_email, status, expires_at, accepted_at, created_at, mission_id, fde_missions(title, organization_id)")
    .or(`fde_user_id.eq.${data.user.id},invited_email.ilike.${email}`)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const orgIds = Array.from(
    new Set(
      (invites || [])
        .map((row) => (row.fde_missions as { organization_id?: string } | null)?.organization_id)
        .filter((v): v is string => Boolean(v))
    )
  );
  let orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    const { data: orgs } = await admin.from("organizations").select("id, name").in("id", orgIds);
    orgNames = Object.fromEntries((orgs || []).map((o) => [o.id, o.name]));
  }

  const shaped = (invites || []).map((row) => {
    const mission = row.fde_missions as { title?: string; organization_id?: string } | null;
    return {
      id: row.id,
      status: row.status,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      createdAt: row.created_at,
      missionId: row.mission_id,
      missionTitle: mission?.title || "Untitled mission",
      organizationName: mission?.organization_id ? orgNames[mission.organization_id] || null : null,
    };
  });

  return NextResponse.json({ invites: shaped });
}

export async function POST(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const missionId = String(body.missionId || "");
    const email = String(body.email || "").trim();
    if (!missionId || !email) {
      return NextResponse.json({ error: "Mission and email are required." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: mission } = await admin
      .from("fde_missions")
      .select("organization_id")
      .eq("id", missionId)
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

    const result = await inviteFdeToMission({
      missionId,
      invitedBy: data.user.id,
      email,
      name: body.name,
    });

    return NextResponse.json({
      ok: true,
      acceptUrl: result.acceptUrl,
      invitationId: result.invitation.id,
      // Truthful delivery status — never claim "Sent" without a provider.
      emailDelivery: isResendConfigured() ? "queued" : "not_configured",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invite failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** Revoke an invitation: PATCH { invitationId, action: "revoke" } */
export async function PATCH(req: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const invitationId = String(body.invitationId || "");
    const action = String(body.action || "");
    if (!invitationId || action !== "revoke") {
      return NextResponse.json({ error: "invitationId and action=revoke required." }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: invitation } = await admin
      .from("fde_invitations")
      .select("id, mission_id")
      .eq("id", invitationId)
      .maybeSingle();
    if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

    const { data: mission } = await admin
      .from("fde_missions")
      .select("organization_id")
      .eq("id", invitation.mission_id)
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

    const updated = await revokeInvitation({ invitationId, revokedBy: data.user.id });
    return NextResponse.json({ ok: true, invitation: { id: updated.id, status: updated.status } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Revoke failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
