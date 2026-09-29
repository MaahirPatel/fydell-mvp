import { extendAttempt } from "@/lib/eng/attempts";
import { jsonError, readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "manage_invitations");
  if (gate.ok === false) return gate.response;
  const { db, member, attempt } = gate.value;
  const body = await readJson(req);
  const minutes = typeof body?.minutes === "number" ? body.minutes : NaN;
  const reason = str(body?.reason, 500);
  if (!reason) return jsonError(400, "Record why the extension was granted.");
  try {
    const updated = await extendAttempt(db, attempt, minutes, reason, { userId: member.userId, email: member.email });
    return ok({ extensionMinutes: updated.extension_minutes });
  } catch (err) {
    return errorResponse(err, "extend");
  }
}
