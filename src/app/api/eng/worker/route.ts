import { timingSafeEqual } from "crypto";
import { engAdmin, jsonError } from "@/lib/eng/context";
import { processPendingRuns } from "@/lib/eng/evaluation/queue";
import { errorResponse, ok } from "@/lib/eng/http";
import { requireReviewer } from "@/lib/eng/route-helpers";

export const maxDuration = 300;

function hasCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || !token || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

/** Drains the evaluation queue. Called by a scheduler with CRON_SECRET, or by a reviewer. */
async function run(req: Request) {
  if (!hasCronSecret(req)) {
    const gate = await requireReviewer();
    if (gate.ok === false) return jsonError(401, "Unauthorized");
  }
  try {
    const result = await processPendingRuns(engAdmin(), 3);
    return ok(result);
  } catch (err) {
    return errorResponse(err, "worker");
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
