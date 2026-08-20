import Link from "next/link";
import { proofAdmin } from "@/lib/sim-engine/proof/db";

export const dynamic = "force-dynamic";

export default async function AdminProofList() {
  const admin = proofAdmin();
  const { data: runs } = await admin
    .from("proof_runs")
    .select("id, status, created_at, proof_invitations(email), proof_analysis_jobs(job_type, status, last_error)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (!runs?.length) {
    return <p className="p-8 text-[var(--text-secondary)]">No proof runs yet.</p>;
  }
  return (
    <div className="px-6 py-8">
      <h1 className="text-[20px] font-medium">Proof graph review</h1>
      <ul className="mt-6 space-y-3">
        {runs.map((run) => {
          const invite = Array.isArray(run.proof_invitations) ? run.proof_invitations[0] : run.proof_invitations;
          return (
            <li key={run.id}>
              <Link href={`/admin/proof/${run.id}`} className="text-[14px] text-[var(--action-ink)]">
                {invite?.email || run.id} · {run.status}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
