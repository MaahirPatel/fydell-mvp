import { notFound } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { proofAdmin } from "@/lib/sim-engine/proof/db";
import EmployerBriefClient from "./EmployerBriefClient";

export const dynamic = "force-dynamic";

export default async function EmployerBriefPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const user = await requireUser();
  if (!user) notFound();
  const org = await requireOrgMember(user.id);
  if (!org) notFound();
  const admin = proofAdmin();
  const { data: run } = await admin.from("proof_runs").select("*").eq("id", runId).maybeSingle();
  if (!run || run.organization_id !== org.organizationId) notFound();
  const { data: brief } = await admin.from("proof_decision_briefs").select("*").eq("run_id", runId).maybeSingle();
  if (!brief?.published) {
    return (
      <main className="px-6 py-10 text-[var(--text-secondary)]">
        This brief is not published yet.
      </main>
    );
  }
  const { data: claims } = await admin
    .from("proof_evidence_claims")
    .select("id, claim, competency, direction, confidence, proof_claim_events(event_id, relation)")
    .eq("run_id", runId)
    .eq("review_status", "PUBLISHED");
  const { data: plan } = await admin.from("proof_interview_plans").select("*").eq("run_id", runId).maybeSingle();
  const { data: invite } = await admin.from("proof_invitations").select("email").eq("id", run.invitation_id).maybeSingle();
  return (
    <EmployerBriefClient
      runId={runId}
      email={invite?.email || "Candidate"}
      brief={brief}
      claims={claims ?? []}
      plan={plan}
    />
  );
}
