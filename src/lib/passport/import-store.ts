import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { GithubClient } from "./github/client";
import { extractRepository } from "./github/extract";
import { parseGithubInput } from "./github/parse";
import { ANALYSIS_VERSION, type ExtractionErrorCode, type ExtractionProgress } from "./github/types";
import {
  IMPORT_JOB_TYPE,
  IMPORT_LEASE_SECONDS,
  IMPORT_MAX_ACTIVE_PER_OWNER,
  IMPORT_MAX_ATTEMPTS,
  IMPORT_MAX_PER_HOUR,
  decideFailure,
  importIdempotencyKey,
  isActive,
  isStale,
  parsePayload,
  safeMessage,
  toJobView,
  needsWorker,
  type ImportErrorCode,
  type ImportJobRow,
  type ImportJobView,
  type ImportPayload,
  type ImportResultRef,
  type ImportStage,
} from "./import-jobs";
import { saveProjectVersion } from "./store";
import { issueSnapshotReceipt } from "@/lib/receipts/store";
import { adoptContributionStatement } from "./context-store";
import { ensureCapabilityReport } from "./capability/store";

const JOB_COLUMNS =
  "id,state,payload,attempt_count,max_attempts,next_attempt_at,stage,progress,error_code,safe_error,retryable,result_ref,analysis_version,created_at,started_at,finished_at,heartbeat_at,cancel_requested_at,owner_id";

type FullRow = ImportJobRow & { heartbeat_at: string | null; cancel_requested_at: string | null; owner_id: string };

const workerId = () => `web:${process.env.VERCEL_REGION ?? "local"}:${randomUUID().slice(0, 8)}`;

export type EnqueueInput = {
  ownerId: string;
  displayName: string;
  repository: string;
  commitSha: string;
  revisionRef: string;
  contribution: string;
  githubLogin: string | null;
};

export type EnqueueResult =
  | { ok: true; job: ImportJobView; created: boolean }
  | { ok: false; status: number; code: string; error: string };

/**
 * Creates an import job, or returns the existing one for the same owner,
 * repository, commit and analysis version. Repeated clicks and retried
 * requests therefore resolve to one job and, later, one report version.
 */
export async function enqueueImport(input: EnqueueInput): Promise<EnqueueResult> {
  const ref = parseGithubInput(input.repository);
  if (!ref || ref.kind !== "repository") return { ok: false, status: 400, code: "invalid_input", error: "Choose a repository as owner/repository." };
  if (!/^[0-9a-f]{40}$/.test(input.commitSha)) return { ok: false, status: 400, code: "invalid_input", error: "Preview the repository first so the revision is pinned." };
  const admin = createAdminSupabaseClient();
  const key = importIdempotencyKey(input.ownerId, input.repository, input.commitSha, ANALYSIS_VERSION);

  const existing = await jobByKey(key);
  if (existing && (existing.state === "cancelled" || existing.state === "failed")) {
    // An explicit new request for a revision whose last import was cancelled
    // or gave up starts it again on the same job, keeping one row per revision.
    const again = await requeue(input.ownerId, existing);
    if (again) return { ok: true, job: again, created: again.state === "queued" };
  }
  if (existing) return { ok: true, job: existing, created: false };

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await admin
    .from("durable_jobs")
    .select("id,state,error_code")
    .eq("job_type", IMPORT_JOB_TYPE)
    .eq("owner_id", input.ownerId)
    .gte("created_at", since)
    .limit(IMPORT_MAX_PER_HOUR + 1);
  const rows = (recent ?? []) as Array<{ state: ImportJobRow["state"]; error_code: string | null }>;
  if (rows.length >= IMPORT_MAX_PER_HOUR) {
    return { ok: false, status: 429, code: "rate_limited", error: "You have started many imports in the last hour. Try again later." };
  }
  const { count: activeCount } = await admin
    .from("durable_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", IMPORT_JOB_TYPE)
    .eq("owner_id", input.ownerId)
    .in("state", ["queued", "running", "failed"]);
  if ((activeCount ?? 0) >= IMPORT_MAX_ACTIVE_PER_OWNER) {
    return { ok: false, status: 409, code: "too_many_active", error: `Up to ${IMPORT_MAX_ACTIVE_PER_OWNER} imports can run at once. Wait for one to finish.` };
  }

  const payload: ImportPayload = {
    repository: `${ref.ref.owner}/${ref.ref.repo}`,
    commitSha: input.commitSha,
    revisionRef: input.revisionRef.slice(0, 200),
    contribution: input.contribution.slice(0, 1000),
    githubLogin: input.githubLogin,
    displayName: input.displayName.slice(0, 120),
  };
  const { error } = await admin.from("durable_jobs").insert({
    job_type: IMPORT_JOB_TYPE,
    idempotency_key: key,
    state: "queued",
    payload,
    max_attempts: IMPORT_MAX_ATTEMPTS,
    owner_id: input.ownerId,
    stage: "queued",
    analysis_version: ANALYSIS_VERSION,
  });
  // A concurrent request may have inserted the same key; the unique
  // constraint makes that safe and the lookup below returns the winner.
  if (error && error.code !== "23505") return { ok: false, status: 500, code: "enqueue_failed", error: "Could not start the import. Try again." };
  const job = await jobByKey(key);
  if (!job) return { ok: false, status: 500, code: "enqueue_failed", error: "Could not start the import. Try again." };
  return { ok: true, job, created: !error };
}

function view(row: FullRow): ImportJobView | null {
  const v = toJobView(row);
  return v ? { ...v, needsWorker: needsWorker(v, row, Date.now()) } : null;
}

/**
 * Explicit recovery for one of the caller's imports. Reconciliation closes
 * out exhausted jobs; anything still due is returned for a worker to claim.
 * Claims are atomic, so concurrent resume requests run a job at most once.
 */
export async function resumeImport(ownerId: string, jobId: string): Promise<{ job: ImportJobView; runnable: boolean } | null> {
  const job = await getImportJob(ownerId, jobId);
  if (!job) return null;
  if (!job.needsWorker) return { job, runnable: false };
  const due = await reconcileImports({ ownerId, limit: 10 });
  return { job: (await getImportJob(ownerId, jobId)) ?? job, runnable: due.includes(jobId) };
}

async function jobByKey(key: string): Promise<ImportJobView | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("durable_jobs").select(JOB_COLUMNS).eq("job_type", IMPORT_JOB_TYPE).eq("idempotency_key", key).maybeSingle();
  return data ? view(data as FullRow) : null;
}

export async function getImportJob(ownerId: string, jobId: string): Promise<ImportJobView | null> {
  if (!/^[0-9a-f-]{36}$/.test(jobId)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("durable_jobs")
    .select(JOB_COLUMNS)
    .eq("job_type", IMPORT_JOB_TYPE)
    .eq("owner_id", ownerId)
    .eq("id", jobId)
    .maybeSingle();
  return data ? view(data as FullRow) : null;
}

export async function listImportJobs(ownerId: string, limit = 20): Promise<ImportJobView[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("durable_jobs")
    .select(JOB_COLUMNS)
    .eq("job_type", IMPORT_JOB_TYPE)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  return ((data ?? []) as FullRow[]).map(view).filter((j): j is ImportJobView => j !== null);
}

async function update(jobId: string, worker: string, patch: Record<string, unknown>): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("durable_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("locked_by", worker)
    .eq("state", "running")
    .select("id");
  return (data ?? []).length > 0;
}

async function cancelRequested(jobId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin.from("durable_jobs").select("cancel_requested_at").eq("id", jobId).maybeSingle();
  return !!(data as { cancel_requested_at: string | null } | null)?.cancel_requested_at;
}

/**
 * Claims and runs one import. Safe to call from several places at once:
 * the database claim admits one worker, and a worker that loses its lease
 * (heartbeat older than IMPORT_LEASE_SECONDS) can be replaced. Every write
 * is fenced on locked_by, so a replaced worker cannot overwrite the result.
 */
export async function runImportJob(jobId: string): Promise<ImportJobView | null> {
  const admin = createAdminSupabaseClient();
  const worker = workerId();
  const { data: claimed } = await admin.rpc("claim_durable_job", { p_job_id: jobId, p_worker: worker, p_lease_seconds: IMPORT_LEASE_SECONDS });
  const row = (Array.isArray(claimed) ? claimed[0] : null) as FullRow | null;
  if (!row) return null;
  const payload = parsePayload(row.payload);
  if (!payload) {
    await finishTerminal(jobId, worker, "invalid_input", false);
    return null;
  }
  const ref = parseGithubInput(payload.repository);
  if (!ref || ref.kind !== "repository") {
    await finishTerminal(jobId, worker, "invalid_input", false);
    return null;
  }

  let lastWrite = 0;
  let lastStage: ImportStage = "queued";
  const onProgress = async (p: ExtractionProgress) => {
    const now = Date.now();
    if (p.stage === lastStage && now - lastWrite < 1500) return;
    lastStage = p.stage;
    lastWrite = now;
    await update(jobId, worker, {
      stage: p.stage,
      heartbeat_at: new Date(now).toISOString(),
      progress: { filesFetched: p.filesFetched, filesSelected: p.filesSelected },
    });
  };

  let result: Awaited<ReturnType<typeof extractRepository>>;
  try {
    result = await extractRepository(ref.ref, new GithubClient(), { commitSha: payload.commitSha, onProgress, contributorLogin: payload.githubLogin });
  } catch {
    await scheduleOrFail(row, worker, "worker_interrupted");
    return getImportJob(row.owner_id, jobId);
  }

  if (result.status === "failed" || !result.repository) {
    const code = (result.error?.code ?? "github_unavailable") as ExtractionErrorCode;
    await scheduleOrFail(row, worker, code, result.error?.retryAfterSeconds);
    return getImportJob(row.owner_id, jobId);
  }

  if (await cancelRequested(jobId)) {
    await finishTerminal(jobId, worker, "cancelled", false);
    return getImportJob(row.owner_id, jobId);
  }

  await update(jobId, worker, { stage: "saving", heartbeat_at: new Date().toISOString() });
  let ref2: ImportResultRef;
  try {
    const saved = await saveProjectVersion(
      { id: row.owner_id, displayName: payload.displayName || payload.githubLogin || "" },
      payload.githubLogin,
      result,
      payload.contribution,
      jobId,
    );
    if (payload.contribution.trim() && !(await adoptContributionStatement(row.owner_id, result.repository?.fullName ?? "", payload.contribution))) {
      throw new Error("Could not save the contribution statement.");
    }
    const receipt = await issueSnapshotReceipt(row.owner_id, saved.projectId, jobId);
    if (!(await ensureCapabilityReport(row.owner_id, saved.projectId, `Imported ${result.repository?.fullName ?? "repository"} at ${(result.commitSha ?? "").slice(0, 7)}`))) {
      throw new Error("Could not save the capability report.");
    }
    ref2 = {
      projectId: saved.projectId,
      findings: result.findings.length,
      status: result.status === "partial" ? "partial" : "complete",
      reusedExistingVersion: saved.reusedExistingVersion,
      receiptId: receipt.id,
    };
  } catch {
    await scheduleOrFail(row, worker, "save_failed");
    return getImportJob(row.owner_id, jobId);
  }

  // The project row is written before this transition. If the worker dies
  // here, a later claim re-runs the import and saveProjectVersion returns the
  // existing snapshot, so recovery cannot create a duplicate report.
  await update(jobId, worker, {
    state: "succeeded",
    stage: "done",
    result_ref: ref2,
    finished_at: new Date().toISOString(),
    error_code: result.status === "partial" && result.error ? result.error.code : null,
    safe_error: result.status === "partial" ? "Some files could not be retrieved; the report shows partial coverage." : null,
    retryable: null,
    locked_by: null,
  });
  return getImportJob(row.owner_id, jobId);
}

async function scheduleOrFail(row: FullRow, worker: string, code: ImportErrorCode, retryAfterSeconds?: number) {
  const decision = decideFailure(code, row.attempt_count, row.max_attempts, retryAfterSeconds);
  if (decision.kind === "retry") {
    await update(row.id, worker, {
      state: "failed",
      error_code: decision.code,
      safe_error: decision.message,
      retryable: true,
      last_error: decision.code,
      next_attempt_at: new Date(Date.now() + decision.delaySeconds * 1000).toISOString(),
      locked_by: null,
    });
    return;
  }
  await update(row.id, worker, {
    state: "dead_letter",
    error_code: decision.code,
    safe_error: decision.message,
    retryable: decision.retryable,
    last_error: code,
    finished_at: new Date().toISOString(),
    locked_by: null,
  });
}

async function finishTerminal(jobId: string, worker: string, code: ImportErrorCode, retryable: boolean) {
  await update(jobId, worker, {
    state: "dead_letter",
    error_code: code,
    safe_error: safeMessage(code),
    retryable,
    finished_at: new Date().toISOString(),
    locked_by: null,
  });
}

/**
 * Cancels an import. Jobs that have not started are cancelled immediately.
 * A running job stops before it saves; one already saving completes.
 */
export async function cancelImport(ownerId: string, jobId: string): Promise<ImportJobView | null> {
  const job = await getImportJob(ownerId, jobId);
  if (!job || !isActive(job.state)) return job;
  const admin = createAdminSupabaseClient();
  const now = new Date().toISOString();
  await admin.from("durable_jobs").update({ cancel_requested_at: now, updated_at: now }).eq("id", jobId).eq("owner_id", ownerId);
  await admin
    .from("durable_jobs")
    .update({ state: "dead_letter", error_code: "cancelled", safe_error: safeMessage("cancelled"), retryable: false, finished_at: now, updated_at: now })
    .eq("id", jobId)
    .eq("owner_id", ownerId)
    .in("state", ["queued", "failed"]);
  return getImportJob(ownerId, jobId);
}

/** Requeues a failed import with a fresh attempt budget. History stays in last_error/attempt_count. */
export async function retryImport(ownerId: string, jobId: string): Promise<ImportJobView | null> {
  const job = await getImportJob(ownerId, jobId);
  if (!job || job.state !== "failed" || !job.retryable) return job;
  return requeue(ownerId, job);
}

/** Puts a finished-but-unsuccessful job back in the queue. Only dead-lettered rows move. */
async function requeue(ownerId: string, job: ImportJobView): Promise<ImportJobView | null> {
  const jobId = job.id;
  const admin = createAdminSupabaseClient();
  await admin
    .from("durable_jobs")
    .update({
      state: "queued",
      stage: "queued",
      error_code: null,
      safe_error: null,
      retryable: null,
      finished_at: null,
      cancel_requested_at: null,
      next_attempt_at: new Date().toISOString(),
      max_attempts: job.attempts + IMPORT_MAX_ATTEMPTS,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("owner_id", ownerId)
    .eq("state", "dead_letter");
  return getImportJob(ownerId, jobId);
}

/**
 * Finds imports that need a worker: queued, due for retry, or running with
 * a lost worker. Lost workers on their final attempt are closed out as
 * failed rather than left running forever. Returns ids to run.
 */
export async function reconcileImports(opts: { ownerId?: string; limit?: number } = {}): Promise<string[]> {
  const admin = createAdminSupabaseClient();
  const now = Date.now();
  let query = admin
    .from("durable_jobs")
    .select("id,state,attempt_count,max_attempts,next_attempt_at,heartbeat_at,cancel_requested_at,created_at")
    .eq("job_type", IMPORT_JOB_TYPE)
    .in("state", ["queued", "failed", "running"])
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 25);
  if (opts.ownerId) query = query.eq("owner_id", opts.ownerId);
  const { data } = await query;
  const ids: string[] = [];
  for (const j of (data ?? []) as Array<{
    id: string;
    state: string;
    attempt_count: number;
    max_attempts: number;
    next_attempt_at: string;
    heartbeat_at: string | null;
    cancel_requested_at: string | null;
  }>) {
    if (j.state === "running") {
      if (!isStale(j.heartbeat_at, now)) continue;
      if (j.cancel_requested_at || j.attempt_count >= j.max_attempts) {
        const code: ImportErrorCode = j.cancel_requested_at ? "cancelled" : "attempts_exhausted";
        await admin
          .from("durable_jobs")
          .update({
            state: "dead_letter",
            error_code: code,
            safe_error: safeMessage(code),
            retryable: code !== "cancelled",
            finished_at: new Date().toISOString(),
            locked_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", j.id)
          .eq("state", "running")
          .lt("heartbeat_at", new Date(now - IMPORT_LEASE_SECONDS * 1000).toISOString());
        continue;
      }
      ids.push(j.id);
    } else if (Date.parse(j.next_attempt_at) <= now) {
      ids.push(j.id);
    }
  }
  return ids;
}
