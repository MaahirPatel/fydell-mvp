import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { createDraft, listWorkSamples } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, kickJob } from "@/lib/eng/authoring/http";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";

export const maxDuration = 300;

export async function GET() {
  const gate = await authoringGate("view_roles");
  if (gate.ok === false) return gate.response;
  try {
    return ok(await listWorkSamples(gate.value.db, gate.value.member));
  } catch (err) {
    return authoringError(err, "list");
  }
}

export async function POST(req: Request) {
  const gate = await authoringGate("author_work_samples");
  if (gate.ok === false) return gate.response;
  const limited = limitByUser(gate.value.member.userId, ROUTE_LIMITS.analysis);
  if (limited) return limited;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Send the form as JSON.");
  try {
    const result = await createDraft(gate.value.db, gate.value.member, body.input);
    if (result.jobId) kickJob(gate.value.db, result.jobId);
    return ok(result, 201);
  } catch (err) {
    return authoringError(err, "create");
  }
}
