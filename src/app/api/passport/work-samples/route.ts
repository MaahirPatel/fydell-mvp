/**
 * Work-sample reports in the engineer's Passport.
 *
 * POST   { attemptId } - include the candidate-visible part of a released report.
 * DELETE { id }        - remove it from the Passport and future applications.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireUser } from "@/lib/simulations/auth";
import { includeWorkSample, removeWorkSample } from "@/lib/profile-evidence/work-samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function body(req: Request): Promise<Record<string, unknown>> {
  const raw: unknown = await req.json().catch(() => null);
  return (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  if (typeof b.attemptId !== "string") return NextResponse.json({ error: "Choose a work sample." }, { status: 400 });
  const result = await includeWorkSample(user.id, b.attemptId);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ workSample: result.entry }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = await body(req);
  if (typeof b.id !== "string" || !(await removeWorkSample(user.id, b.id))) return NextResponse.json({ error: "That work sample is not in your Passport." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
