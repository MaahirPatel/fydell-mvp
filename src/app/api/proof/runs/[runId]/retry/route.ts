import { NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin, audit } from "@/lib/sim-engine/proof/db";
import { enqueueJob, processQueuedJobs } from "@/lib/sim-engine/proof/jobs";
import type { AnalysisJobType } from "@/lib/sim-engine/proof/types";
import { authorizeProofRunAccess } from "@/lib/sim-engine/proof/sandbox/access";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  const adminRole = !org;
  const { runId } = await context.params;
  const access = await authorizeProofRunAccess(runId);
  if ("response" in access) return access.response;
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("organization_id").eq("id", runId).maybeSingle();
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (org && run.organization_id !== org.organizationId && !adminRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: failed } = await admin.from("proof_analysis_jobs").select("job_type").eq("run_id", runId).eq("status", "failed");
  for (const job of failed ?? []) {
    await enqueueJob(runId, job.job_type as AnalysisJobType);
  }
  try {
    await processQueuedJobs(runId);
  } catch (err) {
    await audit(user.email, "job_retry_failed", "proof_runs", runId, null, { error: String(err) });
    return NextResponse.json({ error: err instanceof Error ? err.message : "retry failed" }, { status: 500 });
  }
  await audit(user.email, "job_retry", "proof_runs", runId);
  return NextResponse.json({ ok: true });
}
