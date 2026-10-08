import { ok } from "@/lib/eng/http";
import { openPreview } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, validId } from "@/lib/eng/authoring/http";

/**
 * The candidate-facing package exactly as a candidate would receive it.
 * Evaluation tests, reference solutions and coworker facts are never included.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("view_roles");
  if (gate.ok === false) return gate.response;
  try {
    return ok(await openPreview(gate.value.db, gate.value.member, draftId));
  } catch (err) {
    return authoringError(err, "preview");
  }
}
