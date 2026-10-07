import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { parseHowIBuild } from "@/lib/profile/how-i-build";
import { updateHowIBuild } from "@/lib/profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PUT { text, includeInShares } - save the engineer's "How I build" statement. Private unless includeInShares is true. */
export async function PUT(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  const parsed = parseHowIBuild(await req.json().catch(() => null));
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const profile = await updateHowIBuild(user.id, user.email.split("@")[0], parsed.value);
    return NextResponse.json({ howIBuild: profile.howIBuild });
  } catch {
    return NextResponse.json({ error: "Could not save. Your text is kept; try again." }, { status: 500 });
  }
}
