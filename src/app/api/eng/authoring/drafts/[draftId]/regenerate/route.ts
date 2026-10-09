import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { requestRegeneration } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, kickJob, validId } from "@/lib/eng/authoring/http";
import { publicJob, type RegenerateScope } from "@/lib/eng/authoring/jobs";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";

export const maxDuration = 300;

const SCOPES: RegenerateScope[] = ["all", "starter", "tests"];

export async function POST(req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("author_work_samples");
  if (gate.ok === false) return gate.response;
  const limited = limitByUser(gate.value.member.userId, ROUTE_LIMITS.analysis);
  if (limited) return limited;
  const body = await readJson(req);
  const scope = SCOPES.find((s) => s === body?.scope);
  if (!scope) return jsonError(400, "Choose what to regenerate: all, starter or tests.");
  try {
    const job = await requestRegeneration(gate.value.db, gate.value.member, draftId, scope);
    kickJob(gate.value.db, job.id);
    return ok({ job: publicJob(job) }, 202);
  } catch (err) {
    return authoringError(err, "regenerate");
  }
}
