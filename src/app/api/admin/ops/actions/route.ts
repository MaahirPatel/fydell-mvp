import { after, NextResponse } from "next/server";
import { scheduleEvaluationWork } from "@/lib/eng/route-helpers";
import { runImportJob } from "@/lib/passport/import-store";
import { csrfGuard } from "@/lib/security/csrf";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { OPS_ACTION_ROLES, OpsForbiddenError, parseOpsActionInput, performOpsAction, type OpsActionResult } from "@/lib/ops/ops-actions";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const STATUS: Record<OpsActionResult["outcome"], number> = {
  applied: 200,
  noop: 200,
  pending: 202,
  rejected: 409,
  error: 500,
};

/**
 * POST /api/admin/ops/actions
 * { action, targetId, reason, idempotencyKey } -> the audited outcome.
 * Repeating a request with the same idempotencyKey returns the recorded
 * outcome without acting again.
 */
export async function POST(req: Request) {
  const blocked = csrfGuard(req);
  if (blocked) return blocked;
  const gate = await requirePlatformRoleApi(OPS_ACTION_ROLES);
  if ("error" in gate) return gate.error;
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const parsed = parseOpsActionInput(await req.json().catch(() => null));
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await performOpsAction(createAdminSupabaseClient(), { email: gate.email, roles: gate.roles }, parsed.value);
    const followUp = result.followUp;
    if (followUp?.kind === "run_evaluation") scheduleEvaluationWork();
    if (followUp?.kind === "run_import") {
      after(async () => {
        try {
          await runImportJob(followUp.jobId);
        } catch {
          // Recorded on the job row; reconciliation picks it up again.
        }
      });
    }
    return NextResponse.json({ result }, { status: STATUS[result.outcome], headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OpsForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    const reference = `OPS-${Date.now().toString(36).toUpperCase()}`;
    console.error(`[ops:actions] ${reference}`, err);
    return NextResponse.json({ error: `Something went wrong on our side. Reference ${reference}.` }, { status: 500 });
  }
}
