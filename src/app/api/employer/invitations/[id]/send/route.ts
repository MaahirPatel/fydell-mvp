/**
 * POST /api/employer/invitations/[id]/send — deliberate send (EMP-05/07).
 *
 * The ONLY path that emails the candidate. Body: { token } — the one-time
 * token issued at creation. Moves the invitation draft -> invited and
 * records delivery status. If email is not configured, deliveryStatus is
 * "link_only" and the copyable secure invite link is returned instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { sendInvitation } from "@/lib/invitations/candidate-invites";
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
    return NextResponse.json(
      { error: "The invite token issued at creation is required to send." },
      { status: 400 }
    );
  }

  const { invites, audit } = getEmployerStores();
  const result = await sendInvitation(invites, audit, outboxMailer({ orgName: org.organizationName, roleTitle: "" }), {
    invitationId: id,
    actorUserId: user.id,
    token: body.token,
    inviteUrlForToken: (t) => `${appUrl()}/invite/${t}`,
  });
  if (result.ok === false) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "not_permitted"
          ? 403
          : result.code === "bad_state"
            ? 409
            : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({
    ok: true,
    state: result.value.invitation.state,
    deliveryStatus: result.value.invitation.deliveryStatus,
    sendCount: result.value.invitation.sendCount,
    inviteUrl: result.value.inviteUrl,
  });
}
