import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { recordApproval } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, validId } from "@/lib/eng/authoring/http";

export async function POST(req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("approve_work_samples");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Send the review as JSON.");
  try {
    return ok(await recordApproval(gate.value.db, gate.value.member, draftId, { decision: body.decision, notes: body.notes, packageSha256: body.packageSha256 }), 201);
  } catch (err) {
    return authoringError(err, "review");
  }
}
