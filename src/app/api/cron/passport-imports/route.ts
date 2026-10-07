import { NextResponse } from "next/server";
import { reconcileImports, runImportJob } from "@/lib/passport/import-store";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Backstop for imports nobody is polling: queued jobs whose `after()` never
 * ran, retries that came due, and running jobs whose worker lost its lease.
 * Jobs run one at a time so a backlog cannot exhaust the GitHub quota.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const due = await reconcileImports({ limit: 20 });
  let ran = 0;
  for (const id of due) {
    if (Date.now() - started > 240_000) break;
    try {
      await runImportJob(id);
      ran += 1;
    } catch {
      // Recorded on the job row.
    }
  }
  return NextResponse.json({ ok: true, due: due.length, ran });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
