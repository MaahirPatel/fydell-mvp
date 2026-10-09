import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { limitByUser, ROUTE_LIMITS } from "@/lib/security/route-limits";
import { enqueueImport, listImportJobs, runImportJob } from "@/lib/passport/import-store";
import { accountDisplayName } from "@/lib/auth/account-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/passport/imports - the caller's recent imports, newest first. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see your imports." }, { status: 401 });
  return NextResponse.json({ jobs: await listImportJobs(user.id) });
}

/**
 * POST /api/passport/imports - start an import of a previewed repository.
 * Body: { repository, commitSha, revisionRef, contribution?, githubLogin? }
 *
 * The same owner, repository, commit and analysis version always resolve
 * to one job, so repeated clicks and retried requests are safe. The job
 * runs after the response is sent; if this instance dies, polling the
 * job or the cron reconciler picks it up again.
 */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to save projects to your Passport.", code: "unauthorized" }, { status: 401 });
  const limited = limitByUser(user.id, ROUTE_LIMITS.importJob);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const githubLogin = /^[A-Za-z0-9-]{1,39}$/.test(str(body?.githubLogin)) ? str(body?.githubLogin) : null;

  const result = await enqueueImport({
    ownerId: user.id,
    displayName: await accountDisplayName(user.id, user.email),
    repository: str(body?.repository),
    commitSha: str(body?.commitSha),
    revisionRef: str(body?.revisionRef),
    contribution: str(body?.contribution),
    githubLogin,
  });
  if (result.ok === false) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });

  if (result.job.state === "queued") {
    const jobId = result.job.id;
    after(async () => {
      try {
        await runImportJob(jobId);
      } catch {
        // The job row records the failure; the reconciler retries it.
      }
    });
  }
  return NextResponse.json({ job: result.job, created: result.created }, { status: result.created ? 201 : 200 });
}
