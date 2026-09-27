/**
 * POST /api/employer/invitations/[id]/revoke — revoke an invitation (EMP-07).
 *
 * The candidate's link stops working (state -> withdrawn). Logged with
 * actor + time + reason. Body: { reason? }.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { revokeInvitation } from "@/lib/invitations/operations";
import { getEmployerStores } from "../../../_lib/employer-stores";

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

  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { invites, audit } = getEmployerStores();
  const result = revokeInvitation(invites, audit, id, user.id, body.reason);
  if (!result.ok) {
    const status = result.code === "not_found" ? 404 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({
    ok: true,
    state: result.value.state,
    revokedAt: result.value.withdrawnAt,
  });
}
