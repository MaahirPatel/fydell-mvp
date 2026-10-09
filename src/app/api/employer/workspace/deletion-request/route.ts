import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { requestWorkspaceDeletion } from "@/lib/account/workspace-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/employer/workspace/deletion-request - records an owner's request to delete the workspace. */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "You're not a member of a workspace." }, { status: 403 });
  if (!rateLimit(`workspace-deletion:${user.id}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }
  const result = await requestWorkspaceDeletion(user, org);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(
    { ok: true, receivedAt: result.request.receivedAt, alreadyOpen: result.alreadyOpen },
    { headers: { "Cache-Control": "no-store" } },
  );
}
