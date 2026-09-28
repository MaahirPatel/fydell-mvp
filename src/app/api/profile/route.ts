import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getProfileHub, updateIdentity } from "@/lib/profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The engineer's profile hub: identity, accounts, editor imports, timeline. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });
  try {
    const hub = await getProfileHub(user.id, user.email.split("@")[0]);
    return NextResponse.json({ hub });
  } catch {
    return NextResponse.json({ error: "Could not load the profile." }, { status: 500 });
  }
}

/** Update identity fields: displayName, headline, role. */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    displayName?: unknown;
    headline?: unknown;
    role?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "Send JSON with profile fields." }, { status: 400 });
  try {
    const profile = await updateIdentity(user.id, {
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      headline: typeof body.headline === "string" ? body.headline : undefined,
      role: typeof body.role === "string" ? body.role : undefined,
    });
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not save the profile." }, { status: 400 });
  }
}
