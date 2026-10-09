import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { acceptInvitationById } from "@/lib/simulations/db";
import { publicErrorMessage } from "@/lib/security/public-error";
import { InboxVerificationRequiredError, inboxVerificationResponse } from "@/lib/security/email-verification";

export const runtime = "nodejs";

/**
 * POST: accept an invitation by id (candidate inbox flow).
 *
 * The inbox (`GET /api/sim/invitations/mine`) lists invitations scoped to
 * the session email and returns their ids; accepting POSTs the id here and
 * the server verifies email ownership - no token round-trips through the
 * client, and listing never invalidates previously emailed links.
 *
 * The token-based accept (`POST /api/sim/invitations/{token}`) remains for
 * emailed-link / paste-token flows.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // Malformed JSON → treated as missing body below.
  }
  const invitationId = (body as { invitationId?: unknown } | null)?.invitationId;
  if (typeof invitationId !== "string" || invitationId.trim() === "")
    return NextResponse.json({ error: "invitationId is required" }, { status: 400 });

  try {
    const { session } = await acceptInvitationById(invitationId.trim(), user.id, user.email);
    return NextResponse.json({ ok: true, sessionId: session.id });
  } catch (err) {
    if (err instanceof InboxVerificationRequiredError) return inboxVerificationResponse(err);
    const message = publicErrorMessage(err, "Could not accept invitation");
    const status = message === "Invitation not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
