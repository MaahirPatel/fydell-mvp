import { NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { rateLimit } from "@/lib/security/rate-limit";
import { capabilityReportState, ensureCapabilityReport, listCapabilityReportVersions } from "@/lib/passport/capability/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "That project is not in your Passport." }, { status: 404 });

/** GET ?projectId= - the latest stored capability report, whether its inputs changed since, and every version. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId") ?? "";
  const [state, versions] = await Promise.all([capabilityReportState(user.id, projectId), listCapabilityReportVersions(user.id, projectId)]);
  if (!state.currentInputHash) return notFound();
  return NextResponse.json({ latest: state.latest, stale: state.stale, versions });
}

/**
 * POST { projectId, reason } - build a report for the project's current
 * inputs. Earlier versions are kept unchanged; identical inputs return the
 * existing version instead of creating one.
 */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!rateLimit(`capability-report:${user.id}`, 20, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many re-analyses in the last hour. Try again later." }, { status: 429 });
  }
  const b = (await req.json().catch(() => null)) as unknown;
  const body = typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return NextResponse.json({ error: "Say why you are re-analyzing, in 3 to 300 characters." }, { status: 400 });
  try {
    const done = await ensureCapabilityReport(user.id, projectId, reason);
    if (!done) return notFound();
    return NextResponse.json({ report: done.report, created: done.created }, { status: done.created ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "The report could not be saved. Trying again is safe and will not create a duplicate." }, { status: 500 });
  }
}
