import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin } from "@/lib/sim-engine/proof/db";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = proofAdmin();
  const { data: runs } = await admin
    .from("proof_runs")
    .select("id, status, shortlisted, created_at, proof_invitations(email), proof_decision_briefs(recommendation, why, published, strengths, concerns, probes)")
    .eq("organization_id", org.organizationId)
    .neq("world_state->>environment", "sandbox")
    .order("created_at", { ascending: false });
  return NextResponse.json({
    organizationId: org.organizationId,
    organizationName: org.organizationName,
    runs: runs ?? [],
  });
}
