import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";
import { PROOF_ROLE_ID } from "@/lib/sim-engine/proof/types";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = proofAdmin();
  const { data } = await admin.from("proof_role_calibrations").select("*").eq("role_id", PROOF_ROLE_ID).maybeSingle();
  return NextResponse.json({ calibration: data });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!orgCan(org.role, "manage_candidates")) {
    return NextResponse.json({ error: capabilityDeniedMessage("manage_candidates") }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (key: string) => (typeof body?.[key] === "string" ? (body[key] as string).slice(0, 4000) : "");
  const admin = proofAdmin();
  const { error } = await admin.from("proof_role_calibrations").upsert(
    {
      role_id: PROOF_ROLE_ID,
      common_tasks: field("common_tasks"),
      stakeholders: field("stakeholders"),
      expensive_mistakes: field("expensive_mistakes"),
      top_performer: field("top_performer"),
      work_environment: field("work_environment"),
      approved_by: user.email,
      approved_at: new Date().toISOString(),
    },
    { onConflict: "role_id" },
  );
  if (error) {
    console.error("[proof:calibration]", error.message);
    return NextResponse.json({ error: "The calibration could not be saved. Try again." }, { status: 500 });
  }
  await audit(user.email, "calibration_saved", "proof_role_calibrations", PROOF_ROLE_ID);
  return NextResponse.json({ ok: true });
}
