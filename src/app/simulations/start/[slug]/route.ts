import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createSelfServeAttempt } from "@/lib/simulations/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /simulations/start/[slug]: begin (or resume) a five-minute attempt.
 * Signed-out visitors are sent through signup and return here.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const self = `/simulations/start/${slug}`;

  const user = await requireUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/signup?next=${encodeURIComponent(self)}`, req.url));
  }

  try {
    const { sessionId } = await createSelfServeAttempt(slug, user.id);
    return NextResponse.redirect(new URL(`/sim/${sessionId}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/simulations?error=unavailable", req.url));
  }
}
