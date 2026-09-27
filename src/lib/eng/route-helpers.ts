import "server-only";
import { after } from "next/server";
import { processPendingRuns } from "./evaluation/queue";
import { getAttemptForCandidate, getAttemptForOrg } from "./attempts";
import { loadCandidateContext } from "./candidate-view";
import { engAdmin, jsonError, requireCandidate, requireEngAction, type Admin, type EngMember, type Gate } from "./context";
import { errorResponse } from "./http";
import type { EngAction } from "./permissions";
import type { ScenarioDefinition } from "./scenarios/types";
import type { AttemptRow } from "./types";
import { requirePlatformRoleApi } from "@/lib/ops/require-platform-role";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";

export interface CandidateCtx {
  db: Admin;
  user: { id: string; email: string };
  attempt: AttemptRow;
  scenario: ScenarioDefinition;
}

export async function candidateAttempt(attemptId: string): Promise<Gate<CandidateCtx>> {
  const gate = await requireCandidate();
  if (gate.ok === false) return gate;
  const db = engAdmin();
  try {
    const row = await getAttemptForCandidate(db, attemptId, gate.value.id);
    const { attempt, scenario } = await loadCandidateContext(db, row);
    return { ok: true, value: { db, user: gate.value, attempt, scenario } };
  } catch (err) {
    return { ok: false, response: errorResponse(err, "candidate-attempt") };
  }
}

export interface OrgAttemptCtx {
  db: Admin;
  member: EngMember;
  attempt: AttemptRow;
}

export async function orgAttempt(attemptId: string, action: EngAction): Promise<Gate<OrgAttemptCtx>> {
  const gate = await requireEngAction(action);
  if (gate.ok === false) return gate;
  const db = engAdmin();
  try {
    const attempt = await getAttemptForOrg(db, attemptId, gate.value.organizationId);
    return { ok: true, value: { db, member: gate.value, attempt } };
  } catch (err) {
    return { ok: false, response: errorResponse(err, "org-attempt") };
  }
}

/**
 * Runs queued evaluations after the response is sent. The queue's leases make
 * concurrent workers safe, so a scheduled worker can run alongside this.
 */
export function scheduleEvaluationWork(): void {
  after(async () => {
    try {
      await processPendingRuns(engAdmin(), 2);
    } catch (err) {
      console.error("[eng:worker] background processing failed", err);
    }
  });
}

/**
 * Self-healing without a scheduler: whenever someone views an attempt whose
 * evaluation is runnable (queued, due for retry, or abandoned by a dead
 * worker), process the queue after the response.
 */
export async function scheduleIfRunnable(db: Admin, attemptId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data } = await db
    .from("eng_evaluation_runs")
    .select("id")
    .eq("attempt_id", attemptId)
    .or(`status.eq.queued,and(status.eq.retryable_failure,next_retry_at.lte.${now}),and(status.eq.running,lease_expires_at.lt.${now})`)
    .limit(1)
    .maybeSingle();
  if (data) scheduleEvaluationWork();
}

/** Optional Fydell staff review path: platform reviewer, admin or super_admin. */
export async function requireReviewer(): Promise<Gate<PlatformAdminContext>> {
  const ctx = await requirePlatformRoleApi(["super_admin", "admin", "reviewer"]);
  if ("error" in ctx) {
    const status = ctx.error.status;
    return { ok: false, response: jsonError(status, status === 401 ? "Sign in as a Fydell reviewer." : "Your account is not a Fydell reviewer.") };
  }
  return { ok: true, value: ctx };
}

export async function reviewerAttempt(attemptId: string): Promise<Gate<{ db: Admin; reviewer: PlatformAdminContext; attempt: AttemptRow }>> {
  const gate = await requireReviewer();
  if (gate.ok === false) return gate;
  const db = engAdmin();
  const { data } = await db.from("eng_attempts").select("*").eq("id", attemptId).maybeSingle();
  if (!data) return { ok: false, response: jsonError(404, "Attempt not found.") };
  return { ok: true, value: { db, reviewer: gate.value, attempt: data as AttemptRow } };
}