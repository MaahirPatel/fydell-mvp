import { proofAdmin } from "@/lib/sim-engine/proof/db";
import { notFound } from "next/navigation";
import AdminReviewClient from "./AdminReviewClient";

export const dynamic = "force-dynamic";

export default async function AdminProofRun({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) notFound();
  const { data: claims } = await admin
    .from("proof_evidence_claims")
    .select("id, pass, claim, competency, direction, confidence, review_status, proof_claim_events(event_id, relation)")
    .eq("run_id", runId)
    .order("created_at");
  const { data: jobs } = await admin.from("proof_analysis_jobs").select("job_type, status, last_error").eq("run_id", runId);
  const { data: brief } = await admin.from("proof_decision_briefs").select("*").eq("run_id", runId).maybeSingle();
  return <AdminReviewClient runId={runId} status={run.status} claims={claims ?? []} jobs={jobs ?? []} brief={brief} />;
}
