import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { isStage } from "@/lib/hiring/role-contract";
import { setApplicationStage } from "@/lib/hiring/applications";
import { employerFor, noStore } from "@/lib/hiring/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Move an application to another review stage. Decisions are recorded on the review, not here. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const auth = await employerFor("record_decisions");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { stage?: unknown } | null;
  if (!isStage(body?.stage)) return NextResponse.json({ error: "Choose a stage." }, { status: 400 });
  const ok = await setApplicationStage(auth.org.organizationId, id, body.stage);
  if (!ok) return NextResponse.json({ error: "That application isn't open in your workspace." }, { status: 404 });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
