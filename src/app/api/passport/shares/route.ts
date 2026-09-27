import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createShare, listShares } from "@/lib/passport/store";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json({ shares: await listShares(user.id) });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { label?: unknown; fields?: unknown } | null;
  const fields = Array.isArray(body?.fields) ? body.fields.filter((f): f is string => typeof f === "string") : [];
  if (!fields.includes("projects")) return NextResponse.json({ error: "Share at least your projects." }, { status: 400 });
  const created = await createShare(user.id, typeof body?.label === "string" ? body.label : "", fields);
  if (!created) return NextResponse.json({ error: "Add a project to your passport before sharing it." }, { status: 409 });
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  return NextResponse.json({ url: `${origin}/p/${created.token}`, shares: await listShares(user.id) });
}
