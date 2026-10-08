import { ok } from "@/lib/eng/http";
import { authoringError, authoringGate, kickJob, validId } from "@/lib/eng/authoring/http";
import { isClaimable, publicJob, type JobRow } from "@/lib/eng/authoring/jobs";

export const maxDuration = 300;

/** Polls a job. If nobody is working on it (refresh, crash, back-off elapsed), processing resumes from its checkpoint. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const bad = validId(jobId);
  if (bad) return bad;
  const gate = await authoringGate("view_roles");
  if (gate.ok === false) return gate.response;
  const { db, member } = gate.value;
  try {
    const { data } = await db.from("eng_authoring_jobs").select("*").eq("id", jobId).eq("organization_id", member.organizationId).maybeSingle();
    if (!data) return ok({ job: null }, 404);
    const job = data as JobRow;
    if (isClaimable(job)) kickJob(db, job.id);
    return ok({ job: publicJob(job) });
  } catch (err) {
    return authoringError(err, "job");
  }
}
