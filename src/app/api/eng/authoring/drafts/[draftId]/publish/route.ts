import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { publishDraft } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, validId } from "@/lib/eng/authoring/http";

/** Creates an immutable version from the approved, validated package. */
export async function POST(req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("publish_work_samples");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Send the package hash you reviewed.");
  try {
    return ok(await publishDraft(gate.value.db, gate.value.member, draftId, { packageSha256: body.packageSha256 }), 201);
  } catch (err) {
    return authoringError(err, "publish");
  }
}
