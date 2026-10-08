import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { getRoleForOrg } from "@/lib/eng/roles";
import { startPreviewAttempt } from "@/lib/eng/authored/employer";
import { rateLimit } from "@/lib/security/rate-limit";

/** Starts or resumes the caller's own preview attempt of a work sample. Never emails anyone. */
export async function POST(req: Request, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const gate = await requireEngAction("invite_candidates");
  if (gate.ok === false) return gate.response;
  if (!isUuid(roleId)) return jsonError(404, "Role not found.");
  if (!rateLimit(`eng-preview:${gate.value.userId}`, 30, 60 * 60 * 1000).ok) return jsonError(429, "Too many previews this hour. Try again later.");
  const body = await readJson(req);
  const versionId = typeof body?.scenarioVersionId === "string" ? body.scenarioVersionId : "";
  if (!isUuid(versionId)) return jsonError(400, "Choose a work sample to preview.");
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, gate.value.organizationId);
  if (!role) return jsonError(404, "Role not found.");
  try {
    const attempt = await startPreviewAttempt(db, gate.value, role, versionId);
    return ok({ attemptId: attempt.id }, 201);
  } catch (err) {
    return errorResponse(err, "start-preview");
  }
}
