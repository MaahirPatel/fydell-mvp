import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireUser } from "@/lib/simulations/auth";
import { parseApplicationInput } from "@/lib/hiring/role-contract";
import { submitApplication } from "@/lib/hiring/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to apply. Your entries are kept on this page." }, { status: 401 });
  if (!rateLimit(`apply:${user.id}`, 20, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many applications in the last hour. Try again later." }, { status: 429 });
  }
  const parsed = parseApplicationInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { slug } = await params;
  const result = await submitApplication(user, slug, parsed.value);
  if ("error" in result) {
    return NextResponse.json({ error: result.error, existingId: result.existingId }, { status: result.status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ id: result.id }, { headers: { "Cache-Control": "no-store" } });
}
