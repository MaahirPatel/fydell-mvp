import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!orgCan(org.role, "manage_members")) {
    return NextResponse.json({ error: capabilityDeniedMessage("manage_members") }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { logo_url?: unknown } | null;
  const logoUrl = httpsUrl(body?.logo_url);
  if (!logoUrl) return NextResponse.json({ error: "Enter the logo's https:// address." }, { status: 400 });
  const admin = proofAdmin();
  const { error } = await admin.from("organizations").update({ logo_url: logoUrl }).eq("id", org.organizationId);
  if (error) {
    console.error("[proof:logo]", error.message);
    return NextResponse.json({ error: "The logo could not be saved. Try again." }, { status: 500 });
  }
  await audit(user.email, "logo_updated", "organizations", org.organizationId);
  return NextResponse.json({ ok: true });
}
