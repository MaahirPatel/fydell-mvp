/**
 * POST /api/employer/invitations/[id]/extend — extend the invite deadline (EMP-07).
 *
 * Logged with actor + previous/new deadline. Body: { extraDays } (1-90).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { extendInvitation } from "@/lib/invitations/operations";
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

  let body: { extraDays?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { invites, audit } = getEmployerStores();
  const result = extendInvitation(invites, audit, id, user.id, Number(body.extraDays));
  if (result.ok === false) {
    const status = result.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }
  return NextResponse.json({
    ok: true,
    state: result.value.state,
    expiresAt: result.value.expiresAt,
  });
}
