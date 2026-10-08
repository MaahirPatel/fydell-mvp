import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createShare, listShares } from "@/lib/passport/store";
import { csrfGuard } from "@/lib/security/csrf";
import { shareableProjectKeys } from "@/lib/profile-evidence/store";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ shares: await listShares(user.id) });
}

export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as
    | { label?: unknown; fields?: unknown; expiresAt?: unknown; repos?: unknown; versionPolicy?: unknown }
    | null;
  const fields = Array.isArray(body?.fields) ? body.fields.filter((f): f is string => typeof f === "string") : [];
  if (!fields.includes("projects")) return NextResponse.json({ error: "Share at least your projects." }, { status: 400 });
  const repos = await shareableProjectKeys(user.id, body?.repos);
  if (repos.length === 0) {
    return NextResponse.json({ error: "Confirm your contribution on at least one project before sharing it. Unconfirmed drafts stay private." }, { status: 400 });
  }
  const created = await createShare(user.id, typeof body?.label === "string" ? body.label : "", fields, {
    expiresAt: body?.expiresAt,
    repos,
    versionPolicy: body?.versionPolicy,
  });
  if ("error" in created) {
    const status = /expiry|choose/i.test(created.error) ? 400 : 409;
    return NextResponse.json({ error: created.error }, { status });
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/p/${created.token}`, shares: await listShares(user.id) });
}
