import { NextResponse } from "next/server";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { requireUser } from "@/lib/simulations/auth";
import { confirmPhraseMatches, deleteAccount } from "@/lib/account/delete";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/account - body { confirm: "delete my account" }. */
export async function DELETE(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!rateLimit(`account-delete:${user.id}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
  if (!confirmPhraseMatches(body?.confirm)) {
    return NextResponse.json({ error: "Type “delete my account” to confirm." }, { status: 400 });
  }
  const result = await deleteAccount(user.id);
  if (result.ok === false) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
