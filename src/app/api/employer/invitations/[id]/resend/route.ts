/**
 * POST /api/employer/invitations/[id]/resend — resend the same invitation (EMP-07).
 *
 * Re-emails the SAME invitation row (sendCount + 1). Never creates a second
 * invitation and never touches the bound attempt. Body: { token }.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { resendInvitation } from "@/lib/invitations/operations";
import { appUrl, getEmployerStores, outboxMailer } from "../../../_lib/employer-stores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "The invite token is required to resend." }, { status: 400 });
  }

  const { invites, audit } = getEmployerStores();
  const result = await resendInvitation(
    invites,
    audit,
    outboxMailer({ orgName: org.organizationName, roleTitle: "" }),
    {
      invitationId: id,
      actorUserId: user.id,
      token: body.token,
      inviteUrlForToken: (t) => `${appUrl()}/invite/${t}`,
    }
  );
  if (result.ok === false) {
    const status =
      result.code === "not_found" ? 404 : result.code === "not_permitted" ? 403 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({
    ok: true,
    state: result.value.invitation.state,
    deliveryStatus: result.value.invitation.deliveryStatus,
    sendCount: result.value.invitation.sendCount,
    attemptId: result.value.invitation.attemptId,
    inviteUrl: result.value.inviteUrl,
  });
}
