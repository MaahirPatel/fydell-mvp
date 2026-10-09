import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, engAdmin, jsonError, readJson, requireCandidate, str } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { acceptMembership } from "@/lib/eng/members";
import { InboxVerificationRequiredError, inboxVerificationResponse } from "@/lib/security/email-verification";

/** Accepts a pending workspace membership and makes that workspace active. */
export async function POST(req: Request) {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate.response;
  const membershipId = str((await readJson(req))?.membershipId, 36);
  if (!isUuid(membershipId)) return jsonError(400, "That invitation is no longer available.");
  try {
    const organizationId = await acceptMembership(engAdmin(), gate.value, membershipId);
    (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
    return ok({ organizationId });
  } catch (err) {
    if (err instanceof InboxVerificationRequiredError) return inboxVerificationResponse(err);
    return errorResponse(err, "accept-membership");
  }
}
