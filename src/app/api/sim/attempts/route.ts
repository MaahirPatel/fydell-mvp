import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createSelfServeAttempt } from "@/lib/simulations/db";
import { publicErrorMessage } from "@/lib/security/public-error";
import { parseJsonBody } from "@/lib/security/request-body";

export const runtime = "nodejs";

/** POST: start or resume a self-serve five-minute attempt. { slug } */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseJsonBody(req, { slug: { type: "string", max: 120 } });
  if (parsed.ok === false) return parsed.response;
  const body = parsed.body;
  if (!body.slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  try {
    const { sessionId, resumed } = await createSelfServeAttempt(body.slug, user.id);
    return NextResponse.json({ ok: true, sessionId, resumed });
  } catch (err) {
    return NextResponse.json(
      { error: publicErrorMessage(err, "Could not start the simulation") },
      { status: 400 }
    );
  }
}
