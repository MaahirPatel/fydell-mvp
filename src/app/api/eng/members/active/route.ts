import { cookies } from "next/headers";
import { ACTIVE_ORG_COOKIE, engAdmin, jsonError, readJson, requireCandidate, str } from "@/lib/eng/context";
import { isUuid, ok } from "@/lib/eng/http";

/** Switches the active workspace for someone who belongs to more than one. */
export async function POST(req: Request) {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate.response;
  const organizationId = str((await readJson(req))?.organizationId, 36);
  if (!isUuid(organizationId)) return jsonError(400, "Choose a workspace.");
  const { data } = await engAdmin()
    .from("organization_members")
    .select("id")
    .eq("user_id", gate.value.id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return jsonError(403, "You are not an active member of that workspace.");
  (await cookies()).set(ACTIVE_ORG_COOKIE, organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return ok({ organizationId });
}
