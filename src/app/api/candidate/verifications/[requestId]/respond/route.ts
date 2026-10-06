import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { submitVerification } from "@/lib/employer/review";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/candidate/verifications/[requestId]/respond
 * Candidate submits their focused response to a verification request.
 * Body: { response }
 */
export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const blocked = await csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { requestId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json({ error: "Unknown request." }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { response?: unknown } | null;
  const response = typeof body?.response === "string" ? body.response : "";
  try {
    const verification = await submitVerification(requestId, user.id, response);
    return NextResponse.json({ ok: true, verification });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not submit." }, { status: 400 });
  }
}
