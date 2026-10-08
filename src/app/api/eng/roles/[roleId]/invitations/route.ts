import { engAdmin, jsonError, readJson, requireEngAction } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { createInvitation, normalizeCandidate, resolveHandleCandidate, type InviteCandidate } from "@/lib/eng/invitations";
import { getRoleForOrg } from "@/lib/eng/roles";
import { rateLimit } from "@/lib/security/rate-limit";

/** Accepts either `{ email, name }` or `{ handle }` for an engineer already on Fydell. */
export async function POST(req: Request, { params }: { params: Promise<{ roleId: string }> }) {
  const { roleId } = await params;
  const gate = await requireEngAction("invite_candidates");
  if (gate.ok === false) return gate.response;
  if (!isUuid(roleId)) return jsonError(404, "Role not found.");
  if (!rateLimit(`eng-invite:${gate.value.userId}`, 60, 60 * 60 * 1000).ok) {
    return jsonError(429, "You have sent a lot of invitations this hour. Try again later.");
  }
  const db = engAdmin();
  const role = await getRoleForOrg(db, roleId, gate.value.organizationId);
  if (!role) return jsonError(404, "Role not found.");
  const body = await readJson(req);
  const byHandle = typeof body?.handle === "string" && body.handle.trim() !== "";
  const resolved: InviteCandidate | { error: string } = byHandle
    ? await resolveHandleCandidate(db, body?.handle as string)
    : normalizeCandidate(body?.email, body?.name);
  if ("error" in resolved) return jsonError(400, resolved.error);
  const candidate = resolved;
  const versionRaw = body?.scenarioVersionId;
  if (versionRaw !== undefined && versionRaw !== null && versionRaw !== "" && (typeof versionRaw !== "string" || !isUuid(versionRaw))) {
    return jsonError(400, "Choose a valid work sample.");
  }
  const scenarioVersionId = typeof versionRaw === "string" && versionRaw ? versionRaw : undefined;
  try {
    const { invitation, url } = await createInvitation(db, gate.value, role, candidate, { scenarioVersionId });
    return ok(
      {
        invitationId: invitation.id,
        emailDelivery: invitation.email_delivery,
        url,
        notified: Boolean(candidate.userId),
        ...(candidate.handle ? { handle: candidate.handle, name: candidate.name } : {}),
      },
      201
    );
  } catch (err) {
    return errorResponse(err, "create-invitation");
  }
}
