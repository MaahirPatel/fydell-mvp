import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { isRoleTransition, parseRoleInput } from "@/lib/hiring/role-contract";
import { RoleError, transitionRole, updateRole } from "@/lib/hiring/roles";
import { employerFor, noStore } from "@/lib/hiring/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ roleId: string }> };

function failure(err: unknown) {
  if (err instanceof RoleError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error("[hiring] role change failed", err instanceof Error ? err.message : "unknown");
  return NextResponse.json({ error: "Could not save. Nothing was changed; try again." }, { status: 500 });
}

/** Edit the role's fields. */
export async function PATCH(req: Request, { params }: Params) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("manage_candidates");
  if ("response" in auth) return auth.response;
  const { roleId } = await params;
  const parsed = parseRoleInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    return NextResponse.json({ role: await updateRole(auth.org.organizationId, roleId, parsed.value) }, { headers: noStore });
  } catch (err) {
    return failure(err);
  }
}

/** Publish, pause, reopen, fill or close the role. */
export async function POST(req: Request, { params }: Params) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("manage_candidates");
  if ("response" in auth) return auth.response;
  const { roleId } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; confirmGenuine?: unknown } | null;
  if (!isRoleTransition(body?.action)) return NextResponse.json({ error: "Choose publish, pause, reopen, fill or close." }, { status: 400 });
  try {
    const role = await transitionRole(auth.org.organizationId, roleId, auth.org.userId, body.action, body?.confirmGenuine === true);
    return NextResponse.json({ role }, { headers: noStore });
  } catch (err) {
    return failure(err);
  }
}
