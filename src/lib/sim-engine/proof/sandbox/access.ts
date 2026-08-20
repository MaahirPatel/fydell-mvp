import "server-only";
import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import { proofAdmin } from "../db";
import { isSandboxWorldState } from "./world-state";
import { hashCapabilitySecret, readCapability } from "./capability";

export async function authorizeProofRunAccess(runId: string): Promise<{ ok: true } | { response: NextResponse }> {
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("id, organization_id, candidate_user_id, world_state").eq("id", runId).maybeSingle();
  if (!run) return { response: NextResponse.json({ error: "not found" }, { status: 404 }) };

  if (isSandboxWorldState(run.world_state)) {
    const cap = await readCapability();
    if (!cap || cap.runId !== runId || run.world_state.ownerCapabilityHash !== hashCapabilitySecret(cap.secret)) {
      return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true };
  }

  const user = await requireUser();
  if (user && run.candidate_user_id === user.id) return { ok: true };
  if (user) {
    const org = await requireOrgMember(user.id);
    if (org && org.organizationId === run.organization_id) return { ok: true };
  }
  const platform = await requirePlatformRoleApi(["super_admin", "admin", "operator", "reviewer"]);
  if (!("error" in platform)) return { ok: true };
  return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}
