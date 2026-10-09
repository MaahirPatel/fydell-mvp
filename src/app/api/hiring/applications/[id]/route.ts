import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { isStage, STAGE_LABEL } from "@/lib/hiring/role-contract";
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
  const body = (await req.json().catch(() => null)) as { stage?: unknown; expectedStage?: unknown } | null;
  if (!isStage(body?.stage)) return NextResponse.json({ error: "Choose a stage." }, { status: 400 });
  const expected = isStage(body.expectedStage) ? body.expectedStage : null;
  const result = await setApplicationStage(auth.org.organizationId, id, body.stage, expected);
  if (result.kind === "not_found") return NextResponse.json({ error: "That application isn't open in your workspace." }, { status: 404 });
  if (result.kind === "conflict") {
    return NextResponse.json(
      { error: `A teammate moved this application to ${STAGE_LABEL[result.current]} first. Choose again if it should still change.`, current: result.current },
      { status: 409, headers: noStore },
    );
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
