import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { createSelfServeAttempt } from "@/lib/simulations/db";
import { isSimEngineSelfServeOptIn } from "@/lib/sim-engine/featureFlag";
import { resolveEngineScenarioId } from "@/lib/sim-engine/adapters/legacy-slug-map";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /simulations/start/[slug]: begin (or resume) a five-minute attempt.
 * Signed-out visitors are sent through signup and return here.
 *
 * Low-risk strangler: when SIM_ENGINE_SELF_SERVE=1 (and engine enabled) and the
 * slug maps to a catalog scenario, redirect to `/lab/sim/<id>` instead of
 * creating a production WorkbenchRunner session. Default path is unchanged.
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

  if (isSimEngineSelfServeOptIn()) {
    const engineId = resolveEngineScenarioId(slug);
    if (engineId) {
      return NextResponse.redirect(new URL(`/lab/sim/${engineId}`, req.url));
    }
  }

  try {
    const { sessionId } = await createSelfServeAttempt(slug, user.id);
    return NextResponse.redirect(new URL(`/sim/${sessionId}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/simulations?error=unavailable", req.url));
  }
}
