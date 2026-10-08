import { jsonError, readJson } from "@/lib/eng/context";
import { ok } from "@/lib/eng/http";
import { roleCan } from "@/lib/eng/permissions";
import { archiveDraft, getDraft, saveSection } from "@/lib/eng/authoring/drafts";
import { authoringError, authoringGate, kickJob, validId } from "@/lib/eng/authoring/http";
import { isClaimable, liveJob } from "@/lib/eng/authoring/jobs";

export const maxDuration = 300;

type Ctx = { params: Promise<{ draftId: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("view_roles");
  if (gate.ok === false) return gate.response;
  const { db, member } = gate.value;
  try {
    const canSeeProtected = roleCan(member.role, "author_work_samples") || roleCan(member.role, "approve_work_samples");
    const state = await getDraft(db, member, draftId, canSeeProtected);
    const job = await liveJob(db, draftId);
    if (job && isClaimable(job)) kickJob(db, job.id);
    return ok(state);
  } catch (err) {
    return authoringError(err, "get");
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("author_work_samples");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Send the change as JSON.");
  try {
    return ok(await saveSection(gate.value.db, gate.value.member, draftId, { revision: body.revision, section: body.section, changes: body.changes }));
  } catch (err) {
    return authoringError(err, "save");
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { draftId } = await params;
  const bad = validId(draftId);
  if (bad) return bad;
  const gate = await authoringGate("publish_work_samples");
  if (gate.ok === false) return gate.response;
  try {
    await archiveDraft(gate.value.db, gate.value.member, draftId);
    return ok({ archived: true });
  } catch (err) {
    return authoringError(err, "archive");
  }
}
