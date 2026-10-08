/**
 * POST /api/applications/[id]/evidence - remove one pinned project from an
 * application. Body: { versionId }. The team's access ends on their next read.
 */
import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { requireUser } from "@/lib/simulations/auth";
import { revokeApplicationEvidence } from "@/lib/profile-evidence/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body: unknown = await req.json().catch(() => null);
  const versionId = typeof body === "object" && body !== null ? (body as Record<string, unknown>).versionId : null;
  if (typeof versionId !== "string") return NextResponse.json({ error: "Choose a project to remove." }, { status: 400 });
  const { id } = await params;
  const result = await revokeApplicationEvidence(user.id, id, versionId);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
