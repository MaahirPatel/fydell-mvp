import { NextResponse, after } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";
import { beginAnalysis, getAnalysis, latestAnalysis, latestCompleteReport, listAnalysisVersions } from "@/lib/builder-analysis/store";
import { runAnalysis } from "@/lib/builder-analysis/run";
import { compareVersions } from "@/lib/builder-analysis/ledger";
import { hasSourceChanges, sourceChanges } from "@/lib/builder-analysis/synthesize";
import type { BuilderAnalysisReport } from "@/lib/builder-analysis/types";
import { getOwnerPassport } from "@/lib/passport/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function comparable(r: BuilderAnalysisReport) {
  return {
    inputHash: r.run?.inputHash ?? null,
    input: r.run?.input ?? null,
    dimensions: r.dimensions.map((d) => ({ id: d.id, label: d.label, level: d.level })),
    ledgerIds: (r.ledger ?? []).map((e) => e.id),
  };
}

/**
 * GET - read stored runs. Owner-only; never shared; never starts a run.
 *   (no params)            the latest run
 *   ?id=<run>              one stored run
 *   ?versions=1            the run history
 *   ?compare=<a>,<b>       what changed from run a to run b
 */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your analysis." }, { status: 401 });
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("versions")) return NextResponse.json({ versions: await listAnalysisVersions(user.id) });
    const compare = url.searchParams.get("compare");
    if (compare) {
      const [a, b] = compare.split(",");
      const [before, after] = await Promise.all([getAnalysis(user.id, a ?? ""), getAnalysis(user.id, b ?? "")]);
      if (!before?.report || !after?.report) return NextResponse.json({ error: "Choose two finished runs of your own to compare." }, { status: 404 });
      return NextResponse.json({ comparison: compareVersions(comparable(before.report), comparable(after.report)) });
    }
    const id = url.searchParams.get("id");
    if (id) {
      const row = await getAnalysis(user.id, id);
      if (!row) return NextResponse.json({ error: "That analysis was not found." }, { status: 404 });
      return NextResponse.json({ analysis: row });
    }
    return NextResponse.json({ analysis: await latestAnalysis(user.id) });
  } catch {
    return NextResponse.json({ error: "Could not load the analysis." }, { status: 500 });
  }
}

/** POST - explicitly start a new run. One at a time, with a cooldown between completed runs. */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to run an analysis." }, { status: 401 });
  const limited = limitByUser(user.id, ROUTE_LIMITS.analysis);
  if (limited) return limited;
  try {
    const [passport, previous] = await Promise.all([getOwnerPassport(user.id), latestCompleteReport(user.id)]);
    const sourcesChanged =
      !!previous && hasSourceChanges(sourceChanges(previous, { projects: passport?.projects ?? [], githubLogin: passport?.githubLogin ?? null }));
    const start = await beginAnalysis(user.id, { sourcesChanged });
    if (start.started === false && start.reason === "cooldown") {
      const minutes = Math.ceil(start.retryAfterSeconds / 60);
      return NextResponse.json(
        { error: `Your last analysis finished recently. You can run it again in ${minutes} minute${minutes === 1 ? "" : "s"}.` },
        { status: 429, headers: { "Retry-After": String(start.retryAfterSeconds) } },
      );
    }
    if (start.started) after(() => runAnalysis(start.id, user.id, start.supersedes));
    return NextResponse.json({ analysis: await latestAnalysis(user.id) }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not start the analysis. Try again." }, { status: 500 });
  }
}
