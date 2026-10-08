/**
 * POST /api/employer/roles/intake - create a draft engineering role from the
 * intake form. Unconfirmed suggested requirements are rejected; version 1 of
 * the requirements is recorded.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseRoleIntake } from "@/lib/hiring/intake-contract";
import { createRoleFromIntake, RoleError } from "@/lib/hiring/roles";
import { employerFor, noStore } from "@/lib/hiring/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("manage_candidates");
  if ("response" in auth) return auth.response;
  if (!rateLimit(`hiring-role:${auth.org.userId}`, 60, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many roles created in the last hour. Try again later." }, { status: 429 });
  }
  const parsed = parseRoleIntake(await req.json().catch(() => null));
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const role = await createRoleFromIntake(auth.org.organizationId, auth.org.userId, parsed.value);
    return NextResponse.json({ role: { id: role.id, requirementsVersion: role.requirementsVersion } }, { headers: noStore });
  } catch (err) {
    if (err instanceof RoleError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Could not save the role. Your entries are kept; try again." }, { status: 500 });
  }
}
