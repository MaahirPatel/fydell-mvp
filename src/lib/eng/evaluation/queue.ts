import "server-only";
import { randomUUID } from "crypto";
import type { Admin } from "../context";
import { recordEngEvent } from "../events";
import { EXPECTATIONS, HARNESS_SHA256, HARNESS_SOURCE } from "../scenarios/backend-webhook-retry/hidden.generated";
import { scenarioForVersionId, versionOrigin } from "../scenario-versions";
import { processAuthoredRun } from "../authored/evaluation-run";
import type { ProbeResult, RunRow, ScenarioVersionRow, SubmissionRow, UploadRow } from "../types";
import { loadAcceptedArchive } from "../uploads";
import { gradeProbe, summarize } from "./grade.mjs";
import type { ExecutorSelection } from "./executor";
import { localDevExecutor } from "./local-executor";
import { vercelExecutor } from "./vercel-executor";

const LEASE_MS = 6 * 60000;

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview");
}

export function selectExecutor(): ExecutorSelection {
  const requested = process.env.FYDELL_EVAL_EXECUTOR;
  if (requested === "local-dev") {
    if (isProductionRuntime()) {
      return { ok: false, code: "executor_refused", detail: "The local development executor is refused in production." };
    }
    return { ok: true, executor: localDevExecutor() };
  }
  const snapshotId = process.env.FYDELL_EXECUTION_SNAPSHOT_ID;
  if (!snapshotId) {
    return { ok: false, code: "executor_not_configured", detail: "No isolated evaluation environment is configured (FYDELL_EXECUTION_SNAPSHOT_ID)." };
  }
  return { ok: true, executor: vercelExecutor(snapshotId) };
}

export async function enqueueEvaluation(db: Admin, submission: SubmissionRow, scenarioVersionId: string): Promise<void> {
  const { data: versionRow } = await db.from("eng_scenario_versions").select("id, suite_version, harness_sha256").eq("id", scenarioVersionId).single();
  if (!versionRow) throw new Error("Scenario version not found");
  const row = versionRow as Pick<ScenarioVersionRow, "id" | "suite_version" | "harness_sha256">;
  const { error } = await db.from("eng_evaluation_runs").insert({
    submission_id: submission.id,
    attempt_id: submission.attempt_id,
    run_key: `${submission.id}:${row.suite_version}`,
    status: "queued",
    suite_version: row.suite_version,
    harness_sha256: row.harness_sha256,
    scenario_version_id: row.id,
    ...(submission.manifest_sha256 ? { manifest_sha256: submission.manifest_sha256 } : {}),
  });
  if (error && error.code !== "23505") throw new Error(`Could not queue evaluation: ${error.message}`);
}

/** Claims one runnable job: queued, due for retry, or abandoned by a dead worker. */
export async function claimRun(db: Admin, workerId: string, now = new Date()): Promise<RunRow | null> {
  const iso = now.toISOString();
  const { data: candidates } = await db
    .from("eng_evaluation_runs")
    .select("*")
    .or(`status.eq.queued,and(status.eq.retryable_failure,next_retry_at.lte.${iso}),and(status.eq.running,lease_expires_at.lt.${iso})`)
    .order("created_at", { ascending: true })
    .limit(5);
  for (const candidate of (candidates as RunRow[]) ?? []) {
    if (candidate.attempt_count >= candidate.max_attempts) {
      await db
        .from("eng_evaluation_runs")
        .update({ status: "blocked", last_error_code: candidate.last_error_code ?? "retries_exhausted", lease_owner: null, lease_expires_at: null })
        .eq("id", candidate.id)
        .eq("status", candidate.status)
        .eq("attempt_count", candidate.attempt_count);
      await recordEngEvent(db, candidate.attempt_id, {
        type: "evaluation_retries_exhausted",
        actor: "system",
        payload: { runId: candidate.id, lastError: candidate.last_error_code },
      });
      continue;
    }
    const { data: claimed } = await db
      .from("eng_evaluation_runs")
      .update({
        status: "running",
        attempt_count: candidate.attempt_count + 1,
        lease_owner: workerId,
        lease_expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
        started_at: candidate.started_at ?? iso,
      })
      .eq("id", candidate.id)
      .eq("status", candidate.status)
      .eq("attempt_count", candidate.attempt_count)
      .select("*")
      .maybeSingle();
    if (claimed) {
      if (candidate.status === "running") {
        await recordEngEvent(db, candidate.attempt_id, {
          type: "evaluation_lease_reclaimed",
          actor: "system",
          payload: { runId: candidate.id, previousWorker: candidate.lease_owner },
        });
      }
      return claimed as RunRow;
    }
  }
  return null;
}

/** A worker whose lease was reclaimed is fenced out: its write matches no row and it records nothing. */
export async function failRun(db: Admin, run: RunRow, code: string, detail: string, retryable: boolean): Promise<RunRow["status"]> {
  const exhausted = !retryable || run.attempt_count >= run.max_attempts;
  const nextRetry = new Date(Date.now() + Math.min(30, 2 ** run.attempt_count) * 60000).toISOString();
  const { data: applied } = await db
    .from("eng_evaluation_runs")
    .update({
      status: exhausted ? "blocked" : "retryable_failure",
      last_error_code: code,
      last_error_detail: detail.slice(0, 500),
      next_retry_at: exhausted ? null : nextRetry,
      lease_owner: null,
      lease_expires_at: null,
    })
    .eq("id", run.id)
    .eq("lease_owner", run.lease_owner ?? "")
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (!applied) return "running";
  await recordEngEvent(db, run.attempt_id, {
    type: exhausted ? "evaluation_blocked" : "evaluation_retry_scheduled",
    actor: "system",
    payload: { runId: run.id, code, attempt: run.attempt_count },
  });
  return exhausted ? "blocked" : "retryable_failure";
}

export async function processRun(db: Admin, run: RunRow): Promise<RunRow["status"]> {
  if ((await versionOrigin(db, run.scenario_version_id)) === "employer_authored") return processAuthoredRun(db, run);
  const { data: submission } = await db.from("eng_submissions").select("*").eq("id", run.submission_id).single();
  const { data: upload } = await db.from("eng_uploads").select("*").eq("id", (submission as SubmissionRow).upload_id).single();
  const { row: version } = await scenarioForVersionId(db, run.scenario_version_id);
  if (version.harness_sha256 !== HARNESS_SHA256 || run.harness_sha256 !== HARNESS_SHA256) {
    return failRun(db, run, "harness_version_mismatch", "The deployed evaluator does not match the pinned scenario version.", false);
  }

  let files: Map<string, Uint8Array>;
  try {
    files = (await loadAcceptedArchive(db, upload as UploadRow, version.scenario_key)).contents;
  } catch (error) {
    const code = error instanceof Error ? error.message : "archive_unreadable";
    return failRun(db, run, code, "The stored archive could not be read back and verified.", code === "archive_missing");
  }

  const selection = selectExecutor();
  if (selection.ok === false) {
    return failRun(db, run, selection.code, selection.detail, false);
  }

  const probes = EXPECTATIONS.probes;
  const outcome = await selection.executor.run({ files, harnessSource: HARNESS_SOURCE, probeIds: probes.map((p) => p.id) });
  if (outcome.kind === "infrastructure_error") {
    return failRun(db, run, outcome.code, outcome.detail, true);
  }

  const results: ProbeResult[] = probes.map((probe) => {
    const probeRun = outcome.probeRuns[probe.id];
    const graded = gradeProbe(probe as unknown as Parameters<typeof gradeProbe>[0], probeRun ?? { kind: "exited", stdout: "", nonce: "missing" });
    return graded as ProbeResult;
  });
  const { data: saved } = await db
    .from("eng_evaluation_runs")
    .update({
      status: "human_review",
      results,
      summary: summarize(results),
      executor: selection.executor.name,
      environment_version: outcome.environmentVersion,
      finished_at: new Date().toISOString(),
      lease_owner: null,
      lease_expires_at: null,
      last_error_code: null,
      last_error_detail: null,
    })
    .eq("id", run.id)
    .eq("lease_owner", run.lease_owner ?? "")
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (!saved) return "running";
  await recordEngEvent(db, run.attempt_id, {
    type: "evaluation_completed",
    actor: "system",
    payload: { runId: run.id, executor: selection.executor.name, summary: summarize(results) },
    clientEventId: `evaluation_completed_${run.id}`,
  });
  return "human_review";
}

export async function processPendingRuns(db: Admin, limit = 3): Promise<{ processed: number; statuses: string[] }> {
  const workerId = `worker-${randomUUID()}`;
  const statuses: string[] = [];
  for (let i = 0; i < limit; i++) {
    const run = await claimRun(db, workerId);
    if (!run) break;
    statuses.push(await processRun(db, run));
  }
  return { processed: statuses.length, statuses };
}

/** Operator action: give a blocked or failed run a fresh retry budget. */
export async function requeueRun(db: Admin, runId: string, operatorEmail: string, reason: string): Promise<void> {
  const { data } = await db.from("eng_evaluation_runs").select("*").eq("id", runId).maybeSingle();
  const run = data as RunRow | null;
  if (!run) throw new Error("Run not found");
  if (run.status !== "blocked" && run.status !== "retryable_failure") throw new Error(`A ${run.status} run cannot be requeued.`);
  const { error } = await db
    .from("eng_evaluation_runs")
    .update({ status: "queued", max_attempts: Math.min(10, run.attempt_count + 3), next_retry_at: null })
    .eq("id", run.id)
    .eq("status", run.status);
  if (error) throw new Error(`Could not requeue: ${error.message}`);
  await recordEngEvent(db, run.attempt_id, {
    type: "evaluation_requeued",
    actor: "reviewer",
    actorEmail: operatorEmail,
    payload: { runId, reason: reason.slice(0, 500) },
  });
}
