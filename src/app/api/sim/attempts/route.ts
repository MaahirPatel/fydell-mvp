import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createSelfServeAttempt } from "@/lib/simulations/db";

export const runtime = "nodejs";

/** POST: start or resume a self-serve five-minute attempt. { slug } */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  try {
    const { sessionId, resumed } = await createSelfServeAttempt(body.slug, user.id);
    return NextResponse.json({ ok: true, sessionId, resumed });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start the simulation" },
      { status: 400 }
    );
  }
}
