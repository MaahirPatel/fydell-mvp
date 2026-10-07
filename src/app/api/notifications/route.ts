import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { listNotifications, markAllRead } from "@/lib/notifications/store";
import { csrfGuard } from "@/lib/security/csrf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see notifications." }, { status: 401, headers: NO_STORE });
  try {
    return NextResponse.json(await listNotifications(user.id), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500, headers: NO_STORE });
  }
}

/** Marks every unread notification for the signed-in user as read. */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see notifications." }, { status: 401, headers: NO_STORE });
  try {
    await markAllRead(user.id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "Could not update notifications." }, { status: 500, headers: NO_STORE });
  }
}
