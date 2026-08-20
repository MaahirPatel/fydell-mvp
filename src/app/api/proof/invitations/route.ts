import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createInvitation } from "@/lib/sim-engine/proof/db";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const invite = await createInvitation({
    organizationId: org.organizationId,
    email,
    createdBy: user.id,
  });
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    url: `${origin}/work/${invite.token}`,
  });
}
