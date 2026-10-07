import "server-only";
import { NextResponse } from "next/server";
import { requireOrgMember, requireUser, type OrgContext } from "@/lib/simulations/auth";
import { capabilityDeniedMessage, orgCan, type OrgCapability } from "@/lib/orgs/capabilities";

/** Resolves the signed-in employer and checks one capability. */
export async function employerFor(capability: OrgCapability): Promise<{ org: OrgContext } | { response: NextResponse }> {
  const user = await requireUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const org = await requireOrgMember(user.id);
  if (!org) return { response: NextResponse.json({ error: "Your account isn't part of a hiring workspace." }, { status: 403 }) };
  if (!orgCan(org.role, capability)) return { response: NextResponse.json({ error: capabilityDeniedMessage(capability) }, { status: 403 }) };
  return { org };
}

export const noStore = { "Cache-Control": "no-store" };
