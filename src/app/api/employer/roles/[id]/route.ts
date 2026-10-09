/**
 * PATCH /api/employer/roles/[id] - save the engineering intake for a role.
 * Body: intake fields plus `expectedUpdatedAt` for conflict detection. A
 * change to the confirmed requirements starts a new requirements version.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { parseRoleIntake } from "@/lib/hiring/intake-contract";
import { RoleError, updateRoleFromIntake } from "@/lib/hiring/roles";
import { employerFor, noStore } from "@/lib/hiring/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("manage_candidates");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "That role is not in your workspace." }, { status: 404 });
  const body: unknown = await req.json().catch(() => null);
  const parsed = parseRoleIntake(body);
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const expectedRaw = typeof body === "object" && body !== null ? (body as Record<string, unknown>).expectedUpdatedAt : null;
  const expected = typeof expectedRaw === "string" && expectedRaw.length > 0 && expectedRaw.length <= 40 ? expectedRaw : null;
  if (!expected) {
    return NextResponse.json({ error: "Reload the role before saving so changes made by others are not overwritten." }, { status: 428, headers: noStore });
  }
  try {
    const role = await updateRoleFromIntake(auth.org.organizationId, id, auth.org.userId, parsed.value, expected);
    return NextResponse.json({ role: { id: role.id, requirementsVersion: role.requirementsVersion } }, { headers: noStore });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Could not save the role. Your entries are kept; try again." }, { status: 500 });
  }
}
