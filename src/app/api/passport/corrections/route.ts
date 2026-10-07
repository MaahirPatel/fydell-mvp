import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { flagFinding, listCorrections, resolveCorrection, withdrawCorrection } from "@/lib/passport/store";

export const runtime = "nodejs";

/** List the engineer's notes on findings: context, disputes and proposed corrections. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ corrections: await listCorrections(user.id) });
}

/**
 * Attach a note to a finding. The finding itself is never mutated, so the
 * automated observation and any employer review of it are preserved.
 */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { repo?: unknown; findingId?: unknown; reason?: unknown; kind?: unknown; proposedInterpretation?: unknown; projectId?: unknown }
    | null;
  if (typeof body?.repo !== "string" || typeof body?.findingId !== "string") {
    return NextResponse.json({ error: "Send the repository and finding id." }, { status: 400 });
  }
  const filed = await flagFinding(user.id, body.repo, body.findingId, typeof body?.reason === "string" ? body.reason : "", {
    kind: body.kind,
    proposedInterpretation: body.proposedInterpretation,
    projectId: body.projectId,
  });
  if ("error" in filed) return NextResponse.json({ error: filed.error }, { status: 400 });
  return NextResponse.json({ correction: filed.correction, corrections: await listCorrections(user.id) });
}

/** Resolve (with a note) or withdraw a note. History is appended, never rewritten. */
export async function PATCH(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; note?: unknown; action?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Send the note id." }, { status: 400 });
  const ok =
    body.action === "withdraw"
      ? await withdrawCorrection(user.id, body.id)
      : await resolveCorrection(user.id, body.id, typeof body?.note === "string" ? body.note : "");
  if (!ok) return NextResponse.json({ error: "Note not found, or already resolved or withdrawn." }, { status: 404 });
  return NextResponse.json({ corrections: await listCorrections(user.id) });
}
