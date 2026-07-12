import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { CONSENT_VERSION } from "@/lib/pilot/lifecycle";

export const dynamic = "force-dynamic";

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const { token } = await ctx.params;
  const admin = createAdminSupabaseClient();
  const { data: invitation } = await admin
    .from("candidate_invitations")
    .select("*, hiring_roles(title), organizations(name)")
    .eq("token_hash", hash(token))
    .maybeSingle();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.status === "revoked") {
    return NextResponse.json({ error: "Invitation revoked" }, { status: 410 });
  }
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invitation.email,
    status: invitation.status,
    roleTitle: (invitation.hiring_roles as { title?: string } | null)?.title,
    organizationName: (invitation.organizations as { name?: string } | null)?.name,
    expiresAt: invitation.expires_at,
    consentVersion: CONSENT_VERSION,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    const { token } = await ctx.params;
    const body = await req.json();
    const supabase = await createServerSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const { data: invitation } = await admin
      .from("candidate_invitations")
      .select("*")
      .eq("token_hash", hash(token))
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }
    if (["revoked", "expired"].includes(invitation.status)) {
      return NextResponse.json({ error: "Invitation unavailable" }, { status: 410 });
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation expired" }, { status: 410 });
    }
    if (
      invitation.accepted_by &&
      invitation.accepted_by !== auth.user.id
    ) {
      return NextResponse.json(
        { error: "This invitation is already bound to another account." },
        { status: 403 }
      );
    }
    if (auth.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Sign in with ${invitation.email} to accept this invitation.`,
        },
        { status: 403 }
      );
    }
    if (!body.consentAccepted) {
      return NextResponse.json({ error: "Consent required" }, { status: 400 });
    }

    await admin
      .from("pilot_candidates")
      .update({
        auth_user_id: auth.user.id,
        status: "invitation_accepted",
        consent_status: "accepted",
        consent_version: CONSENT_VERSION,
        consent_at: new Date().toISOString(),
        full_name: body.fullName || undefined,
      })
      .eq("id", invitation.candidate_id);

    await admin
      .from("candidate_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: auth.user.id,
      })
      .eq("id", invitation.id);

    const { data: assignment } = await admin
      .from("simulation_assignments")
      .update({ status: "accepted" })
      .eq("invitation_id", invitation.id)
      .select("*")
      .maybeSingle();

    await admin.from("profiles").upsert({
      id: auth.user.id,
      email: auth.user.email,
      account_type: "candidate",
      role: "candidate",
    });

    await admin.from("audit_logs").insert({
      actor_user_id: auth.user.id,
      actor_email: auth.user.email,
      action: "candidate.invitation.accepted",
      entity_type: "candidate_invitation",
      entity_id: invitation.id,
      metadata: { assignmentId: assignment?.id, consentVersion: CONSENT_VERSION },
    });

    return NextResponse.json({
      ok: true,
      assignmentId: assignment?.id,
      redirectTo: assignment?.id
        ? `/candidate/assignments/${assignment.id}`
        : "/candidate",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Accept failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
