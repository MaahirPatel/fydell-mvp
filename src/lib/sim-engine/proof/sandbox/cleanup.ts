import "server-only";
import { sandboxAdmin } from "./client";
import { nextWorldState, parseWorldState } from "./world-state";

const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function deleteSandboxGraph(runId: string, organizationId: string): Promise<void> {
  const admin = sandboxAdmin();
  const { data: claims } = await admin.from("proof_evidence_claims").select("id").eq("run_id", runId);
  const claimIds = (claims ?? []).map((row) => row.id as string);
  if (claimIds.length > 0) {
    await admin.from("proof_claim_reviews").delete().in("claim_id", claimIds);
    await admin.from("proof_claim_events").delete().in("claim_id", claimIds);
  }
  const { data: session } = await admin.from("proof_defense_sessions").select("id").eq("run_id", runId).maybeSingle();
  if (session) {
    const { data: questions } = await admin.from("proof_defense_questions").select("id").eq("session_id", session.id);
    const questionIds = (questions ?? []).map((row) => row.id as string);
    if (questionIds.length > 0) {
      await admin.from("proof_defense_responses").delete().in("question_id", questionIds);
      await admin.from("proof_defense_questions").delete().in("id", questionIds);
    }
    await admin.from("proof_defense_sessions").delete().eq("id", session.id);
  }
  await admin.from("proof_interview_plans").delete().eq("run_id", runId);
  await admin.from("proof_decision_briefs").delete().eq("run_id", runId);
  await admin.from("proof_analysis_jobs").delete().eq("run_id", runId);
  await admin.from("proof_evidence_claims").delete().eq("run_id", runId);
  await admin.from("proof_artifact_versions").delete().eq("run_id", runId);
  await admin.from("proof_artifacts").delete().eq("run_id", runId);
  await admin.from("proof_messages").delete().eq("run_id", runId);
  await admin.from("proof_events").delete().eq("run_id", runId);
  await admin.from("proof_product_events").delete().eq("run_id", runId);
  const { data: run } = await admin.from("proof_runs").select("invitation_id").eq("id", runId).maybeSingle();
  const { error: runError } = await admin.from("proof_runs").delete().eq("id", runId);
  if (runError) throw new Error(runError.message);
  if (run?.invitation_id) {
    await admin.from("proof_invitations").delete().eq("id", run.invitation_id);
  }
  await admin.from("organizations").delete().eq("id", organizationId);
}

export async function markCleanupFailed(runId: string): Promise<void> {
  const admin = sandboxAdmin();
  const { data } = await admin.from("proof_runs").select("world_state").eq("id", runId).maybeSingle();
  if (!data) return;
  try {
    const current = parseWorldState(data.world_state);
    const next = nextWorldState(current, { cleanupStatus: "cleanup_failed" });
    await admin.from("proof_runs").update({ world_state: next }).eq("id", runId).eq("world_state->>revision", String(current.revision));
  } catch {
    await admin.from("proof_runs").update({ status: "abandoned" }).eq("id", runId);
  }
}

export async function cleanupExpiredSandboxes(limit = 20): Promise<{ deleted: number; failed: number }> {
  const admin = sandboxAdmin();
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
  const { data: rows } = await admin
    .from("proof_runs")
    .select("id, organization_id, world_state, expires_at")
    .contains("world_state", { environment: "sandbox" })
    .order("created_at", { ascending: true })
    .limit(limit);
  let deleted = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const expired = typeof row.expires_at === "string" && row.expires_at < new Date().toISOString();
    const stale = typeof row.expires_at === "string" && row.expires_at < cutoff;
    let sandbox = false;
    try {
      sandbox = parseWorldState(row.world_state).environment === "sandbox";
    } catch {
      sandbox = true;
    }
    if (!sandbox || (!expired && !stale)) continue;
    try {
      await deleteSandboxGraph(row.id as string, row.organization_id as string);
      deleted += 1;
    } catch {
      await markCleanupFailed(row.id as string);
      failed += 1;
    }
  }
  return { deleted, failed };
}
