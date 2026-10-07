import { after, NextResponse } from "next/server";
import { requireUser } from "@/lib/simulations/auth";
import { csrfGuard } from "@/lib/security/csrf";
import { cancelImport, getImportJob, resumeImport, retryImport, runImportJob } from "@/lib/passport/import-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function runLater(jobId: string) {
  after(async () => {
    try {
      await runImportJob(jobId);
    } catch {
      // Recorded on the job row; reconciliation picks it up again.
    }
  });
}

/** GET /api/passport/imports/[id] - current state of one import. Read-only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in to see this import." }, { status: 401 });
  const { id } = await params;
  const job = await getImportJob(user.id, id);
  if (!job) return NextResponse.json({ error: "Import not found." }, { status: 404 });
  return NextResponse.json({ job });
}

/**
 * POST /api/passport/imports/[id] - { action: "cancel" | "retry" | "resume" }.
 * "resume" recovers a job whose worker was lost; it does nothing for a job
 * that a live worker still holds.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;

  if (body?.action === "cancel") {
    const job = await cancelImport(user.id, id);
    if (!job) return NextResponse.json({ error: "Import not found." }, { status: 404 });
    return NextResponse.json({ job });
  }
  if (body?.action === "retry") {
    const job = await retryImport(user.id, id);
    if (!job) return NextResponse.json({ error: "Import not found." }, { status: 404 });
    if (job.state === "queued") runLater(id);
    return NextResponse.json({ job });
  }
  if (body?.action === "resume") {
    const resumed = await resumeImport(user.id, id);
    if (!resumed) return NextResponse.json({ error: "Import not found." }, { status: 404 });
    if (resumed.runnable) runLater(id);
    return NextResponse.json({ job: resumed.job, resumed: resumed.runnable });
  }
  return NextResponse.json({ error: "Choose cancel, retry or resume." }, { status: 400 });
}
