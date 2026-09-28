import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { flagFinding, listCorrections, resolveCorrection } from "@/lib/passport/store";

export const runtime = "nodejs";

/** List the candidate's filed corrections (PASS-08). */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ corrections: await listCorrections(user.id) });
}

/**
 * Flag a finding as inaccurate. The finding itself is never mutated, so
 * employer audit history is preserved; the correction is stored separately.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { repo?: unknown; findingId?: unknown; reason?: unknown } | null;
  if (typeof body?.repo !== "string" || typeof body?.findingId !== "string") {
    return NextResponse.json({ error: "Send the repository and finding id." }, { status: 400 });
  }
  const filed = await flagFinding(user.id, body.repo, body.findingId, typeof body?.reason === "string" ? body.reason : "");
  if ("error" in filed) return NextResponse.json({ error: filed.error }, { status: 400 });
  return NextResponse.json({ correction: filed.correction });
}

/** Mark a correction resolved with a note. History is appended, not rewritten. */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; note?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Send the correction id." }, { status: 400 });
  const ok = await resolveCorrection(user.id, body.id, typeof body?.note === "string" ? body.note : "");
  if (!ok) return NextResponse.json({ error: "Correction not found or already resolved." }, { status: 404 });
  return NextResponse.json({ corrections: await listCorrections(user.id) });
}
