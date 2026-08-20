import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json()) as { logo_url?: string };
  if (!body.logo_url) return NextResponse.json({ error: "logo_url required" }, { status: 400 });
  const admin = proofAdmin();
  const { error } = await admin.from("organizations").update({ logo_url: body.logo_url }).eq("id", org.organizationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(user.email, "logo_updated", "organizations", org.organizationId);
  return NextResponse.json({ ok: true });
}
