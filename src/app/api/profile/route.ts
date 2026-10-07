import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { getProfileHub, ProfileInputError, updateIdentity } from "@/lib/profile/store";
import { SOCIAL_KINDS, type ProfileLink, type SocialKind } from "@/lib/profile/types";

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

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function links(value: unknown): ProfileLink[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({ label: str(l.label) ?? "", url: str(l.url) ?? "" }));
}

function social(value: unknown): Partial<Record<SocialKind, string>> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const v = value as Record<string, unknown>;
  const out: Partial<Record<SocialKind, string>> = {};
  for (const kind of SOCIAL_KINDS) {
    const s = str(v[kind]);
    if (s !== undefined) out[kind] = s;
  }
  return out;
}

/** Update identity and about fields. Omitted fields are left unchanged. */
export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to edit your profile." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send JSON with profile fields." }, { status: 400 });
  try {
    const profile = await updateIdentity(user.id, {
      displayName: str(body.displayName),
      handle: str(body.handle),
      headline: str(body.headline),
      role: str(body.role),
      bio: str(body.bio),
      location: str(body.location),
      website: str(body.website),
      links: links(body.links),
      openTo: str(body.openTo),
      social: social(body.social),
    });
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof ProfileInputError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Could not save the profile. Try again." }, { status: 500 });
  }
}
