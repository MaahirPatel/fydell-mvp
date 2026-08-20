import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";
import { PROOF_ROLE_ID } from "@/lib/sim-engine/proof/types";

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
  const body = (await request.json()) as Record<string, string>;
  const admin = proofAdmin();
  const { error } = await admin.from("proof_role_calibrations").upsert(
    {
      role_id: PROOF_ROLE_ID,
      common_tasks: body.common_tasks ?? "",
      stakeholders: body.stakeholders ?? "",
      expensive_mistakes: body.expensive_mistakes ?? "",
      top_performer: body.top_performer ?? "",
      work_environment: body.work_environment ?? "",
      approved_by: user.email,
      approved_at: new Date().toISOString(),
    },
    { onConflict: "role_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await audit(user.email, "calibration_saved", "proof_role_calibrations", PROOF_ROLE_ID);
  return NextResponse.json({ ok: true });
}
