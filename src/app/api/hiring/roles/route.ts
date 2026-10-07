import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { parseRoleInput } from "@/lib/hiring/role-contract";
import { createRole, listRoles, RoleError } from "@/lib/hiring/roles";
import { employerFor, noStore } from "@/lib/hiring/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await employerFor("view_hiring_work");
  if ("response" in auth) return auth.response;
  return NextResponse.json({ roles: await listRoles(auth.org.organizationId) }, { headers: noStore });
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("manage_candidates");
  if ("response" in auth) return auth.response;
  if (!rateLimit(`hiring-role:${auth.org.userId}`, 60, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many roles created in the last hour. Try again later." }, { status: 429 });
  }
  const parsed = parseRoleInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const role = await createRole(auth.org.organizationId, auth.org.userId, parsed.value);
    return NextResponse.json({ role }, { headers: noStore });
  } catch (err) {
    const status = err instanceof RoleError ? err.status : 500;
    return NextResponse.json({ error: err instanceof RoleError ? err.message : "Could not save the role. Try again." }, { status });
  }
}
