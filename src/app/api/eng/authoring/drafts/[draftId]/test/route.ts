import { ok } from "@/lib/eng/http";
import { requestTestRun } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, kickJob, validId } from "@/lib/eng/authoring/http";
import { publicJob } from "@/lib/eng/authoring/jobs";

export const maxDuration = 300;

/** Runs the starter, reference and incorrect solutions against the tests on the configured runner. */
export async function POST(_req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("author_work_samples");
  if (gate.ok === false) return gate.response;
  try {
    const job = await requestTestRun(gate.value.db, gate.value.member, draftId);
    kickJob(gate.value.db, job.id);
    return ok({ job: publicJob(job) }, 202);
  } catch (err) {
    return authoringError(err, "test");
  }
}
