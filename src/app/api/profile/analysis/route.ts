import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { beginAnalysis, latestAnalysis } from "@/lib/builder-analysis/store";
import { runAnalysis } from "@/lib/builder-analysis/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET - the owner's latest Builder Analysis run. Owner-only; never shared. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your analysis." }, { status: 401 });
  try {
    return NextResponse.json({ analysis: await latestAnalysis(user.id) });
  } catch {
    return NextResponse.json({ error: "Could not load the analysis." }, { status: 500 });
  }
}

/** POST - start a new run. One at a time, with a cooldown between completed runs. */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to run an analysis." }, { status: 401 });
  try {
    const start = await beginAnalysis(user.id);
    if (start.started === false && start.reason === "cooldown") {
      const minutes = Math.ceil(start.retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `Your last analysis finished recently. You can run it again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429, headers: { "Retry-After": String(start.retryAfterSeconds) } },
      );
    }
    if (start.started) after(() => runAnalysis(start.id, user.id));
    return NextResponse.json({ analysis: await latestAnalysis(user.id) }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not start the analysis. Try again." }, { status: 500 });
  }
}
