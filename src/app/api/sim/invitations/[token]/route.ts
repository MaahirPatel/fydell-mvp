import { NextRequest, NextResponse } from "next/server";
import {
  acceptInvitation,
  getInvitationByToken,
  getVersionContent,
  invitationGate,
  markInvitationOpened,
} from "@/lib/simulations/db";
import { requireUser } from "@/lib/simulations/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";

export const runtime = "nodejs";

/** GET: public invitation preview (no auth). Marks the invitation opened. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  if (!invitation)
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  const gate = invitationGate(invitation);
  const admin = createAdminSupabaseClient();
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invitation.organization_id)
    .maybeSingle();
  const content = await getVersionContent(invitation.template_version_id);
  const role = ROLE_BY_KEY[content.roleKey as RoleKey];

  if (gate.ok) await markInvitationOpened(invitation.id);

  return NextResponse.json({
    ok: gate.ok,
    reason: gate.reason || null,
    invitation: {
      status: invitation.status,
      candidateEmail: invitation.candidate_email,
      candidateName: invitation.candidate_name,
      expiresAt: invitation.expires_at,
      organizationName: org?.name || "An employer",
      simulation: {
        title: content.title,
        roleTitle: role?.title || content.roleKey,
        scenarioSummary: content.scenarioSummary,
        durationMinutes: content.durationMinutes,
        toolsAvailable: content.toolsAvailable,
        skillsEvaluated: role?.skillsEvaluated || [],
      },
    },
  });
}

/** POST: accept the invitation (requires a signed-in candidate). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { session } = await acceptInvitation(token, user.id, user.email);
    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not accept invitation" },
      { status: 400 }
    );
  }
}
