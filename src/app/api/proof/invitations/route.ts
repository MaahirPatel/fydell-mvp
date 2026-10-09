import { NextResponse } from "next/server";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createInvitation } from "@/lib/sim-engine/proof/db";
import { limitCost, ROUTE_LIMITS } from "@/lib/security/route-limits";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!orgCan(org.role, "manage_candidates"))
    return NextResponse.json({ error: capabilityDeniedMessage("manage_candidates") }, { status: 403 });
  const raw: unknown = await request.json().catch(() => null);
  const rawEmail = raw && typeof raw === "object" ? (raw as Record<string, unknown>).email : undefined;
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const limited = limitCost(ROUTE_LIMITS.invite, `user:${user.id}`, 1);
  if (limited) return limited;
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
