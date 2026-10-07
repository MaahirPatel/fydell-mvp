import "server-only";
import { randomUUID } from "node:crypto";
import { enqueueEvaluation } from "@/lib/eng/evaluation/queue";
import { recordEngEvent } from "@/lib/eng/events";
import type { RunStatus, SubmissionRow } from "@/lib/eng/types";
import { visibleState, type StoredJobState } from "@/lib/passport/import-jobs";
import { cancelImport, reconcileImports, resumeImport, retryImport } from "@/lib/passport/import-store";
import { writeAudit, type PlatformRole } from "./platform-roles";
import { DEFAULT_OPS_THRESHOLDS, IMPORT_OPS_COLUMNS, classifyImport, type OpsDb } from "./stuck-work";

/**
 * Audited operator actions on stuck work.
 *
 * Each action claims an `ops_actions` row by idempotency key before it acts,
 * so a double click, a network retry or two operators racing with the same
 * key act at most once. Every state change is a compare-and-set on the
 * state the action was checked against; a request that loses a race records
 * `noop` instead of acting on a row that has since moved.
 */

export const OPS_VIEW_ROLES: PlatformRole[] = ["super_admin", "admin", "operator", "support"];
export const OPS_ACTION_ROLES: PlatformRole[] = ["super_admin", "admin", "operator"];

export const OPS_ACTIONS = [
  "eng_run.requeue",
  "eng_run.cancel",
  "eng_attempt.enqueue_evaluation",
  "eng_upload.reset",
  "import_job.retry",
  "import_job.cancel",
] as const;
export type OpsActionKind = (typeof OPS_ACTIONS)[number];

export type OpsTargetType = "eng_evaluation_run" | "eng_attempt" | "eng_upload" | "passport_import_job";

const TARGET_OF: Record<OpsActionKind, OpsTargetType> = {
  "eng_run.requeue": "eng_evaluation_run",
  "eng_run.cancel": "eng_evaluation_run",
  "eng_attempt.enqueue_evaluation": "eng_attempt",
  "eng_upload.reset": "eng_upload",
  "import_job.retry": "passport_import_job",
  "import_job.cancel": "passport_import_job",
};

export type OpsOutcome = "applied" | "noop" | "rejected" | "error";

/** Work the route schedules after responding, outside this library. */
export type OpsFollowUp = { kind: "run_evaluation" } | { kind: "run_import"; jobId: string } | null;

export interface OpsActor {
  email: string;
  roles: PlatformRole[];
}

export interface OpsActionInput {
  action: OpsActionKind;
  targetId: string;
  reason: string;
  idempotencyKey: string;
}

export interface OpsActionResult {
  id: string;
  action: OpsActionKind;
  targetId: string;
  outcome: OpsOutcome | "pending";
  beforeState: string | null;
  afterState: string | null;
  detail: string | null;
  duplicate: boolean;
  followUp: OpsFollowUp;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9:_-]{8,120}$/;

export function isOpsAction(value: unknown): value is OpsActionKind {
  return typeof value === "string" && (OPS_ACTIONS as readonly string[]).includes(value);
}

export function canAct(roles: PlatformRole[]): boolean {
  return roles.some((r) => OPS_ACTION_ROLES.includes(r));
}

export function parseOpsActionInput(body: unknown): { ok: true; value: OpsActionInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, error: "Send a JSON object." };
  const b = body as Record<string, unknown>;
  if (!isOpsAction(b.action)) return { ok: false, error: "Unknown action." };
  if (typeof b.targetId !== "string" || !UUID.test(b.targetId)) return { ok: false, error: "Choose a target by id." };
  const reason = typeof b.reason === "string" ? b.reason.trim() : "";
  if (reason.length < 5 || reason.length > 500) return { ok: false, error: "Write a reason between 5 and 500 characters." };
  if (typeof b.idempotencyKey !== "string" || !KEY.test(b.idempotencyKey)) return { ok: false, error: "Missing or malformed idempotency key." };
  return { ok: true, value: { action: b.action, targetId: b.targetId.toLowerCase(), reason, idempotencyKey: b.idempotencyKey } };
}

type HandlerResult = { outcome: Exclude<OpsOutcome, "error">; afterState: string | null; detail: string | null; followUp?: OpsFollowUp };
type Prepared = { beforeState: string | null; run: (opsActionId: string) => Promise<HandlerResult> };

const rejected = (detail: string, afterState: string | null = null): HandlerResult => ({ outcome: "rejected", afterState, detail });
const noop = (detail: string, afterState: string | null): HandlerResult => ({ outcome: "noop", afterState, detail });

// ---------------------------------------------------------------------------
// Engineering evaluation runs
// ---------------------------------------------------------------------------

type RunLite = {
  id: string;
  attempt_id: string;
  status: RunStatus;
  attempt_count: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
};

const MAX_RUN_TRIES = 10;

async function readRun(db: OpsDb, runId: string): Promise<RunLite | null> {
  const { data, error } = await db.from("eng_evaluation_runs").select("id,attempt_id,status,attempt_count,lease_owner,lease_expires_at").eq("id", runId).maybeSingle();
  if (error) throw new Error(`Could not read run: ${error.message}`);
  return (data as RunLite | null) ?? null;
}

function leaseExpired(run: RunLite, now: number): boolean {
  return run.lease_expires_at === null || Date.parse(run.lease_expires_at) < now;
}

async function prepareRunRequeue(db: OpsDb, actor: OpsActor, runId: string): Promise<Prepared> {
  const run = await readRun(db, runId);
  if (!run) return { beforeState: null, run: async () => rejected("Run not found.") };
  const now = Date.now();
  const before = run.status === "running" && leaseExpired(run, now) ? "running_lease_expired" : run.status;
  return {
    beforeState: before,
    run: async (opsActionId) => {
      if (run.status === "queued") return noop("Already queued for a worker.", "queued");
      if (run.status === "running" && !leaseExpired(run, now)) return rejected("A worker holds this run's lease. Wait for the lease to expire.", "running");
      if (run.status !== "blocked" && run.status !== "retryable_failure" && run.status !== "running") {
        return rejected(`A ${run.status} run cannot be retried.`, run.status);
      }
      if (run.attempt_count >= MAX_RUN_TRIES) return rejected(`The run has used the maximum of ${MAX_RUN_TRIES} tries. Investigate the error code before anything else.`, run.status);
      let query = db
        .from("eng_evaluation_runs")
        .update({
          status: "queued",
          max_attempts: Math.min(MAX_RUN_TRIES, run.attempt_count + 3),
          next_retry_at: null,
          lease_owner: null,
          lease_expires_at: null,
        })
        .eq("id", run.id)
        .eq("status", run.status)
        .eq("attempt_count", run.attempt_count);
      if (run.status === "running") query = query.lt("lease_expires_at", new Date(now).toISOString());
      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw new Error(`Could not requeue: ${error.message}`);
      if (!data) return noop("The run changed state before the retry applied. Reload and check again.", (await readRun(db, run.id))?.status ?? null);
      await recordEngEvent(db, run.attempt_id, {
        type: "evaluation_requeued",
        actor: "reviewer",
        actorEmail: actor.email,
        payload: { runId: run.id, opsActionId },
        clientEventId: `ops_${opsActionId}`,
      });
      return { outcome: "applied", afterState: "queued", detail: null, followUp: { kind: "run_evaluation" } };
    },
  };
}

async function prepareRunCancel(db: OpsDb, actor: OpsActor, runId: string): Promise<Prepared> {
  const run = await readRun(db, runId);
  if (!run) return { beforeState: null, run: async () => rejected("Run not found.") };
  const now = Date.now();
  const before = run.status === "running" && leaseExpired(run, now) ? "running_lease_expired" : run.status;
  return {
    beforeState: before,
    run: async (opsActionId) => {
      if (run.status === "canceled") return noop("Already cancelled.", "canceled");
      if (run.status === "human_review" || run.status === "ready") return rejected("The run finished; its results stay on record.", run.status);
      if (run.status === "running" && !leaseExpired(run, now)) return rejected("A worker holds this run's lease. Wait for the lease to expire.", "running");
      let query = db
        .from("eng_evaluation_runs")
        .update({
          status: "canceled",
          lease_owner: null,
          lease_expires_at: null,
          next_retry_at: null,
          last_error_code: "canceled_by_operator",
          finished_at: new Date(now).toISOString(),
        })
        .eq("id", run.id)
        .eq("status", run.status)
        .eq("attempt_count", run.attempt_count);
      if (run.status === "running") query = query.lt("lease_expires_at", new Date(now).toISOString());
      const { data, error } = await query.select("id").maybeSingle();
      if (error) throw new Error(`Could not cancel: ${error.message}`);
      if (!data) return noop("The run changed state before the cancel applied. Reload and check again.", (await readRun(db, run.id))?.status ?? null);
      await recordEngEvent(db, run.attempt_id, {
        type: "evaluation_canceled",
        actor: "reviewer",
        actorEmail: actor.email,
        payload: { runId: run.id, opsActionId },
        clientEventId: `ops_${opsActionId}`,
      });
      return { outcome: "applied", afterState: "canceled", detail: null };
    },
  };
}

async function prepareEnqueue(db: OpsDb, actor: OpsActor, attemptId: string): Promise<Prepared> {
  const { data: attemptData, error } = await db.from("eng_attempts").select("id,status,scenario_version_id").eq("id", attemptId).maybeSingle();
  if (error) throw new Error(`Could not read attempt: ${error.message}`);
  const attempt = attemptData as { id: string; status: string; scenario_version_id: string } | null;
  if (!attempt) return { beforeState: null, run: async () => rejected("Attempt not found.") };
  const { data: subData, error: subError } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).maybeSingle();
  if (subError) throw new Error(`Could not read submission: ${subError.message}`);
  const submission = subData as SubmissionRow | null;
  const runsFor = async () => {
    if (!submission) return [];
    const { data, error: runError } = await db.from("eng_evaluation_runs").select("id,status").eq("submission_id", submission.id);
    if (runError) throw new Error(`Could not read runs: ${runError.message}`);
    return (data ?? []) as { id: string; status: RunStatus }[];
  };
  const existing = await runsFor();
  const live = existing.find((r) => r.status !== "canceled");
  const before = !submission ? `attempt_${attempt.status}` : live ? `run_${live.status}` : existing.length ? "only_canceled_runs" : "no_run";
  return {
    beforeState: before,
    run: async (opsActionId) => {
      if (attempt.status !== "submitted" || !submission) return rejected("The attempt has no accepted submission to evaluate.", before);
      if (live) return noop(`An evaluation run already exists (${live.status}).`, `run_${live.status}`);
      if (existing.length > 0) return rejected("This submission's only run was cancelled. Cancelled runs are final and the run key cannot be reused.", before);
      await enqueueEvaluation(db, submission, attempt.scenario_version_id);
      const created = (await runsFor()).find((r) => r.status !== "canceled");
      if (!created) return rejected("No run was created. Check that the attempt's scenario version is still available.", "no_run");
      await recordEngEvent(db, attempt.id, {
        type: "evaluation_requeued",
        actor: "reviewer",
        actorEmail: actor.email,
        payload: { runId: created.id, opsActionId },
        clientEventId: `ops_${opsActionId}`,
      });
      return { outcome: "applied", afterState: `run_${created.status}`, detail: null, followUp: { kind: "run_evaluation" } };
    },
  };
}

// ---------------------------------------------------------------------------
// Engineering uploads
// ---------------------------------------------------------------------------

export const UPLOAD_RESET_CODE = "validation_interrupted";

async function prepareUploadReset(db: OpsDb, actor: OpsActor, uploadId: string): Promise<Prepared> {
  const { data, error } = await db.from("eng_uploads").select("id,attempt_id,status,created_at").eq("id", uploadId).maybeSingle();
  if (error) throw new Error(`Could not read upload: ${error.message}`);
  const upload = data as { id: string; attempt_id: string; status: string; created_at: string } | null;
  if (!upload) return { beforeState: null, run: async () => rejected("Upload not found.") };
  return {
    beforeState: upload.status,
    run: async (opsActionId) => {
      if (upload.status === "failed") return noop("Already failed; the candidate's next submit re-runs the check.", "failed");
      if (upload.status !== "validating") return rejected(`A ${upload.status} upload cannot be reset.`, upload.status);
      const minAgeMs = DEFAULT_OPS_THRESHOLDS.uploadValidatingMinutes * 60000;
      if (Date.now() - Date.parse(upload.created_at) < minAgeMs) {
        return rejected(`Validation may still be running. Uploads can be reset after ${DEFAULT_OPS_THRESHOLDS.uploadValidatingMinutes} minutes.`, "validating");
      }
      const { data: updated, error: updateError } = await db
        .from("eng_uploads")
        .update({
          status: "failed",
          rejection_code: UPLOAD_RESET_CODE,
          rejection_detail: "The check on this file did not finish. Submit again to re-run it.",
        })
        .eq("id", upload.id)
        .eq("status", "validating")
        .select("id")
        .maybeSingle();
      if (updateError) throw new Error(`Could not reset upload: ${updateError.message}`);
      if (!updated) return noop("The upload finished validating before the reset applied.", null);
      await recordEngEvent(db, upload.attempt_id, {
        type: "upload_validation_reset",
        actor: "reviewer",
        actorEmail: actor.email,
        payload: { uploadId: upload.id, opsActionId },
        clientEventId: `ops_${opsActionId}`,
      });
      return { outcome: "applied", afterState: "failed", detail: null };
    },
  };
}

// ---------------------------------------------------------------------------
// Passport import jobs (durable_jobs, job_type passport_import)
// ---------------------------------------------------------------------------

type ImportLite = {
  id: string;
  owner_id: string;
  state: StoredJobState;
  stage: string | null;
  attempt_count: number;
  max_attempts: number;
  error_code: string | null;
  retryable: boolean | null;
  created_at: string;
  heartbeat_at: string | null;
  next_attempt_at: string | null;
  finished_at: string | null;
  cancel_requested_at: string | null;
};

async function readImport(db: OpsDb, jobId: string): Promise<ImportLite | null> {
  const { data, error } = await db.from("durable_jobs").select(IMPORT_OPS_COLUMNS).eq("id", jobId).eq("job_type", "passport_import").maybeSingle();
  if (error) throw new Error(`Could not read import: ${error.message}`);
  return (data as ImportLite | null) ?? null;
}

const importState = (row: ImportLite) => visibleState(row.state, row.error_code);

async function prepareImportRetry(db: OpsDb, jobId: string): Promise<Prepared> {
  const row = await readImport(db, jobId);
  if (!row) return { beforeState: null, run: async () => rejected("Import not found.") };
  const before = importState(row);
  return {
    beforeState: before,
    run: async () => {
      if (before === "succeeded") return rejected("The import already succeeded.", before);
      if (before === "cancelled") return rejected("The owner cancelled this import. They can start it again from their work record.", before);
      if (before === "failed") {
        if (row.retryable !== true) return rejected(`The failure (${row.error_code ?? "unknown"}) is about the repository, not the platform. Retrying would fail the same way.`, before);
        const job = await retryImport(row.owner_id, row.id);
        if (job?.state === "queued") return { outcome: "applied", afterState: "queued", detail: null, followUp: { kind: "run_import", jobId: row.id } };
        return noop("The import changed state before the retry applied.", job?.state ?? null);
      }
      const resumed = await resumeImport(row.owner_id, row.id);
      if (!resumed) return rejected("Import not found.");
      if (resumed.runnable) return { outcome: "applied", afterState: resumed.job.state, detail: "Handed to a worker.", followUp: { kind: "run_import", jobId: row.id } };
      return noop(
        resumed.job.state === "failed" ? "The import used its last attempt and was closed out as failed." : "A live worker holds this import, or it is not due yet.",
        resumed.job.state,
      );
    },
  };
}

async function prepareImportCancel(db: OpsDb, jobId: string): Promise<Prepared> {
  const row = await readImport(db, jobId);
  if (!row) return { beforeState: null, run: async () => rejected("Import not found.") };
  const before = importState(row);
  return {
    beforeState: before,
    run: async () => {
      if (before === "cancelled") return noop("Already cancelled.", before);
      if (before === "succeeded" || before === "failed") return rejected(`A ${before} import cannot be cancelled.`, before);
      await cancelImport(row.owner_id, row.id);
      await reconcileImports({ ownerId: row.owner_id, limit: 25 });
      const after = await readImport(db, row.id);
      if (!after) return rejected("Import not found.");
      const state = importState(after);
      if (state === "cancelled") return { outcome: "applied", afterState: state, detail: null };
      if (after.cancel_requested_at) {
        const stuck = classifyImport(after, DEFAULT_OPS_THRESHOLDS, Date.now());
        return {
          outcome: "applied",
          afterState: `${state}_cancel_requested`,
          detail: stuck?.problem === "worker_lost" ? "Cancel recorded; the stale job is closed out on the next reconcile." : "Cancel recorded; the running worker stops before saving.",
        };
      }
      return noop("The import finished before the cancel applied.", state);
    },
  };
}

// ---------------------------------------------------------------------------
// Audited execution
// ---------------------------------------------------------------------------

async function prepare(db: OpsDb, actor: OpsActor, input: OpsActionInput): Promise<Prepared> {
  switch (input.action) {
    case "eng_run.requeue":
      return prepareRunRequeue(db, actor, input.targetId);
    case "eng_run.cancel":
      return prepareRunCancel(db, actor, input.targetId);
    case "eng_attempt.enqueue_evaluation":
      return prepareEnqueue(db, actor, input.targetId);
    case "eng_upload.reset":
      return prepareUploadReset(db, actor, input.targetId);
    case "import_job.retry":
      return prepareImportRetry(db, input.targetId);
    case "import_job.cancel":
      return prepareImportCancel(db, input.targetId);
  }
}

type OpsActionRow = {
  id: string;
  action: string;
  target_id: string;
  outcome: OpsOutcome | "pending";
  before_state: string | null;
  after_state: string | null;
  detail: string | null;
};

function fromRow(row: OpsActionRow, action: OpsActionKind, duplicate: boolean): OpsActionResult {
  return {
    id: row.id,
    action,
    targetId: row.target_id,
    outcome: row.outcome,
    beforeState: row.before_state,
    afterState: row.after_state,
    detail: row.detail,
    duplicate,
    followUp: null,
  };
}

export class OpsForbiddenError extends Error {
  constructor() {
    super("Your platform role cannot retry or cancel work.");
  }
}

/**
 * Runs one operator action. Authorization is re-checked here so a caller
 * that forgot the route gate still cannot act.
 */
export async function performOpsAction(db: OpsDb, actor: OpsActor, input: OpsActionInput): Promise<OpsActionResult> {
  if (!canAct(actor.roles)) throw new OpsForbiddenError();
  const targetType = TARGET_OF[input.action];

  const { data: prior, error: priorError } = await db
    .from("ops_actions")
    .select("id,action,target_id,outcome,before_state,after_state,detail")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (priorError) throw new Error(`Could not read ops actions: ${priorError.message}`);
  if (prior) return replay(prior as OpsActionRow, input);

  const prepared = await prepare(db, actor, input);
  const id = randomUUID();
  const { error: claimError } = await db.from("ops_actions").insert({
    id,
    idempotency_key: input.idempotencyKey,
    actor_email: actor.email,
    actor_roles: actor.roles,
    action: input.action,
    target_type: targetType,
    target_id: input.targetId,
    reason: input.reason,
    before_state: prepared.beforeState,
  });
  if (claimError) {
    if (claimError.code === "23505") {
      const { data: winner } = await db
        .from("ops_actions")
        .select("id,action,target_id,outcome,before_state,after_state,detail")
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      return replay(winner as OpsActionRow, input);
    }
    throw new Error(`Could not record the action: ${claimError.message}`);
  }

  let result: HandlerResult | { outcome: "error"; afterState: null; detail: string; followUp?: undefined };
  try {
    result = await prepared.run(id);
  } catch (err) {
    const reference = `OPS-${Date.now().toString(36).toUpperCase()}`;
    console.error(`[ops:${input.action}] ${reference}`, err);
    result = { outcome: "error", afterState: null, detail: `Failed on our side. Reference ${reference}.` };
  }

  const { error: finishError } = await db
    .from("ops_actions")
    .update({ outcome: result.outcome, after_state: result.afterState, detail: result.detail, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("outcome", "pending");
  if (finishError) console.error(`[ops:${input.action}] could not finish audit row ${id}`, finishError.message);

  await writeAudit({
    actorEmail: actor.email,
    action: `ops.${input.action}`,
    entityType: targetType,
    entityId: input.targetId,
    before: prepared.beforeState ? { state: prepared.beforeState } : null,
    after: result.afterState ? { state: result.afterState } : null,
    metadata: { reason: input.reason, outcome: result.outcome, opsActionId: id },
  });

  return {
    id,
    action: input.action,
    targetId: input.targetId,
    outcome: result.outcome,
    beforeState: prepared.beforeState,
    afterState: result.afterState,
    detail: result.detail,
    duplicate: false,
    followUp: result.followUp ?? null,
  };
}

function replay(row: OpsActionRow, input: OpsActionInput): OpsActionResult {
  if (row.action !== input.action || row.target_id !== input.targetId) {
    return {
      id: row.id,
      action: input.action,
      targetId: input.targetId,
      outcome: "rejected",
      beforeState: null,
      afterState: null,
      detail: "This idempotency key was already used for a different action. Reload the page and try again.",
      duplicate: true,
      followUp: null,
    };
  }
  return fromRow(row, input.action, true);
}
