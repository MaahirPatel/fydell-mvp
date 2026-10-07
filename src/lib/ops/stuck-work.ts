import "server-only";
import type { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { IMPORT_JOB_TYPE, isStale, visibleState, type ImportJobState, type StoredJobState } from "@/lib/passport/import-jobs";
import type { RunStatus } from "@/lib/eng/types";

/**
 * Read model for the operator view of stuck work.
 *
 * Every row carries ids, states, counts and timestamps only. Candidate source,
 * archive contents, hidden test results, handoff text, response bodies,
 * reviewer notes, storage paths and import payloads are never selected.
 */

export type OpsDb = ReturnType<typeof createAdminSupabaseClient>;

export interface OpsThresholds {
  /** A submitted attempt whose evaluation has not reached review after this long is stuck. */
  evaluationStuckMinutes: number;
  /** A submission with no evaluation run at all after this long was never queued. */
  submissionWithoutRunMinutes: number;
  /** Submissions from this many days back are checked for a missing run. */
  submissionLookbackDays: number;
  /** An upload still validating after this long lost its validator. Also the minimum age for a reset. */
  uploadValidatingMinutes: number;
  /** A queued or retry-scheduled import still unclaimed this long after it was due. */
  importOverdueMinutes: number;
  /** Failed imports from this many days back are listed. */
  importFailedLookbackDays: number;
  /** A draft report untouched this long. */
  reportDraftHours: number;
  /** An evaluated run with no draft report this long after it finished. */
  awaitingReviewHours: number;
  /** An open candidate response older than this many days. */
  responseOpenDays: number;
}

export const DEFAULT_OPS_THRESHOLDS: OpsThresholds = {
  evaluationStuckMinutes: 60,
  submissionWithoutRunMinutes: 10,
  submissionLookbackDays: 30,
  uploadValidatingMinutes: 15,
  importOverdueMinutes: 10,
  importFailedLookbackDays: 14,
  reportDraftHours: 48,
  awaitingReviewHours: 48,
  responseOpenDays: 5,
};

/** Rows per section. A section at the limit is shown as "limit+". */
export const OPS_SECTION_LIMIT = 200;

export type RunAction = "requeue" | "cancel";

export interface StuckRun {
  runId: string;
  attemptId: string;
  organizationId: string | null;
  status: RunStatus;
  leaseExpired: boolean;
  tries: number;
  maxTries: number;
  errorCode: string | null;
  submittedAt: string | null;
  createdAt: string;
  nextRetryAt: string | null;
  pastThreshold: boolean;
  actions: RunAction[];
}

export interface SubmissionWithoutRun {
  submissionId: string;
  attemptId: string;
  submittedAt: string;
}

export interface StuckUpload {
  uploadId: string;
  attemptId: string;
  createdAt: string;
}

export type ImportProblem = "overdue" | "worker_lost" | "failed";

export interface StuckImport {
  jobId: string;
  ownerId: string;
  state: ImportJobState;
  problem: ImportProblem;
  stage: string | null;
  tries: number;
  maxTries: number;
  errorCode: string | null;
  retryable: boolean;
  cancelRequested: boolean;
  createdAt: string;
  heartbeatAt: string | null;
  nextAttemptAt: string | null;
  finishedAt: string | null;
  actions: RunAction[];
}

export interface StaleReport {
  kind: "draft_unreleased" | "awaiting_draft";
  attemptId: string;
  reportId: string | null;
  runId: string | null;
  version: number | null;
  since: string;
}

export interface OldResponse {
  responseId: string;
  attemptId: string;
  organizationId: string;
  kind: "context" | "inaccurate";
  targetKind: "finding" | "criterion" | "report";
  reportVersion: number;
  createdAt: string;
}

export interface RecentOpsAction {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  outcome: string;
  beforeState: string | null;
  afterState: string | null;
  createdAt: string;
}

export interface OpsSnapshot {
  generatedAt: string;
  thresholds: OpsThresholds;
  runs: StuckRun[];
  submissionsWithoutRun: SubmissionWithoutRun[];
  uploads: StuckUpload[];
  imports: StuckImport[];
  reports: StaleReport[];
  responses: OldResponse[];
  recentActions: RecentOpsAction[];
  errors: string[];
}

const minutesAgo = (now: number, minutes: number) => new Date(now - minutes * 60000).toISOString();

function isPast(iso: string | null, now: number): boolean {
  return iso !== null && Date.parse(iso) < now;
}

type RunRowLite = {
  id: string;
  attempt_id: string;
  status: RunStatus;
  attempt_count: number;
  max_attempts: number;
  lease_expires_at: string | null;
  next_retry_at: string | null;
  last_error_code: string | null;
  created_at: string;
};

/** Which operator actions a run in this state accepts. Mirrors the checks in ops-actions. */
export function runActionsFor(status: RunStatus, leaseExpired: boolean, tries: number): RunAction[] {
  const actions: RunAction[] = [];
  const requeueable = status === "blocked" || status === "retryable_failure" || (status === "running" && leaseExpired);
  if (requeueable && tries < 10) actions.push("requeue");
  if (status === "queued" || status === "blocked" || status === "retryable_failure" || (status === "running" && leaseExpired)) actions.push("cancel");
  return actions;
}

async function loadRuns(db: OpsDb, t: OpsThresholds, now: number): Promise<StuckRun[]> {
  const { data, error } = await db
    .from("eng_evaluation_runs")
    .select("id,attempt_id,status,attempt_count,max_attempts,lease_expires_at,next_retry_at,last_error_code,created_at")
    .in("status", ["queued", "running", "retryable_failure", "blocked"])
    .order("created_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`evaluation runs: ${error.message}`);
  const rows = (data ?? []) as RunRowLite[];
  if (rows.length === 0) return [];
  const { data: attempts, error: attemptError } = await db
    .from("eng_attempts")
    .select("id,organization_id,submitted_at")
    .in("id", [...new Set(rows.map((r) => r.attempt_id))]);
  if (attemptError) throw new Error(`attempts: ${attemptError.message}`);
  const byId = new Map(((attempts ?? []) as { id: string; organization_id: string; submitted_at: string | null }[]).map((a) => [a.id, a]));
  const cutoff = now - t.evaluationStuckMinutes * 60000;
  const out: StuckRun[] = [];
  for (const r of rows) {
    const attempt = byId.get(r.attempt_id);
    const since = attempt?.submitted_at ?? r.created_at;
    const pastThreshold = Date.parse(since) < cutoff;
    const leaseExpired = r.status === "running" && (r.lease_expires_at === null || isPast(r.lease_expires_at, now));
    if (r.status === "running" && !leaseExpired && !pastThreshold) continue;
    out.push({
      runId: r.id,
      attemptId: r.attempt_id,
      organizationId: attempt?.organization_id ?? null,
      status: r.status,
      leaseExpired,
      tries: r.attempt_count,
      maxTries: r.max_attempts,
      errorCode: r.last_error_code,
      submittedAt: attempt?.submitted_at ?? null,
      createdAt: r.created_at,
      nextRetryAt: r.next_retry_at,
      pastThreshold,
      actions: runActionsFor(r.status, leaseExpired, r.attempt_count),
    });
  }
  return out;
}

async function loadSubmissionsWithoutRun(db: OpsDb, t: OpsThresholds, now: number): Promise<SubmissionWithoutRun[]> {
  const { data, error } = await db
    .from("eng_submissions")
    .select("id,attempt_id,submitted_at")
    .lt("submitted_at", minutesAgo(now, t.submissionWithoutRunMinutes))
    .gte("submitted_at", minutesAgo(now, t.submissionLookbackDays * 24 * 60))
    .order("submitted_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`submissions: ${error.message}`);
  const subs = (data ?? []) as { id: string; attempt_id: string; submitted_at: string }[];
  if (subs.length === 0) return [];
  const { data: runs, error: runError } = await db.from("eng_evaluation_runs").select("submission_id").in("submission_id", subs.map((s) => s.id));
  if (runError) throw new Error(`runs for submissions: ${runError.message}`);
  const withRun = new Set(((runs ?? []) as { submission_id: string }[]).map((r) => r.submission_id));
  return subs.filter((s) => !withRun.has(s.id)).map((s) => ({ submissionId: s.id, attemptId: s.attempt_id, submittedAt: s.submitted_at }));
}

async function loadUploads(db: OpsDb, t: OpsThresholds, now: number): Promise<StuckUpload[]> {
  const { data, error } = await db
    .from("eng_uploads")
    .select("id,attempt_id,created_at")
    .eq("status", "validating")
    .lt("created_at", minutesAgo(now, t.uploadValidatingMinutes))
    .order("created_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`uploads: ${error.message}`);
  return ((data ?? []) as { id: string; attempt_id: string; created_at: string }[]).map((u) => ({ uploadId: u.id, attemptId: u.attempt_id, createdAt: u.created_at }));
}

type ImportRowLite = {
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

export const IMPORT_OPS_COLUMNS =
  "id,owner_id,state,stage,attempt_count,max_attempts,error_code,retryable,created_at,heartbeat_at,next_attempt_at,finished_at,cancel_requested_at";

/** Classifies one import job for the operator view; null when it is healthy or finished cleanly. */
export function classifyImport(row: ImportRowLite, t: OpsThresholds, now: number): StuckImport | null {
  const state = visibleState(row.state, row.error_code);
  let problem: ImportProblem | null = null;
  if (state === "running") {
    if (isStale(row.heartbeat_at, now)) problem = "worker_lost";
  } else if (state === "queued" || state === "retry_scheduled") {
    const due = Date.parse(row.next_attempt_at ?? row.created_at);
    if (now - due > t.importOverdueMinutes * 60000) problem = "overdue";
  } else if (state === "failed") {
    problem = "failed";
  }
  if (!problem) return null;
  const actions: RunAction[] = [];
  if (problem === "failed" ? row.retryable === true : true) actions.push("requeue");
  if (problem !== "failed") actions.push("cancel");
  return {
    jobId: row.id,
    ownerId: row.owner_id,
    state,
    problem,
    stage: row.stage,
    tries: row.attempt_count,
    maxTries: row.max_attempts,
    errorCode: row.error_code,
    retryable: row.retryable === true,
    cancelRequested: row.cancel_requested_at !== null,
    createdAt: row.created_at,
    heartbeatAt: row.heartbeat_at,
    nextAttemptAt: row.next_attempt_at,
    finishedAt: row.finished_at,
    actions,
  };
}

async function loadImports(db: OpsDb, t: OpsThresholds, now: number): Promise<StuckImport[]> {
  const lookback = minutesAgo(now, t.importFailedLookbackDays * 24 * 60);
  const { data, error } = await db
    .from("durable_jobs")
    .select(IMPORT_OPS_COLUMNS)
    .eq("job_type", IMPORT_JOB_TYPE)
    .or(`state.in.(queued,running,failed),and(state.eq.dead_letter,finished_at.gte.${lookback})`)
    .order("created_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`imports: ${error.message}`);
  return ((data ?? []) as ImportRowLite[]).map((r) => classifyImport(r, t, now)).filter((r): r is StuckImport => r !== null);
}

async function loadReports(db: OpsDb, t: OpsThresholds, now: number): Promise<StaleReport[]> {
  const { data: drafts, error } = await db
    .from("eng_reports")
    .select("id,attempt_id,version,updated_at")
    .eq("status", "draft")
    .lt("updated_at", minutesAgo(now, t.reportDraftHours * 60))
    .order("updated_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`draft reports: ${error.message}`);
  const out: StaleReport[] = ((drafts ?? []) as { id: string; attempt_id: string; version: number; updated_at: string }[]).map((d) => ({
    kind: "draft_unreleased",
    attemptId: d.attempt_id,
    reportId: d.id,
    runId: null,
    version: d.version,
    since: d.updated_at,
  }));

  const { data: runs, error: runError } = await db
    .from("eng_evaluation_runs")
    .select("id,attempt_id,finished_at")
    .eq("status", "human_review")
    .lt("finished_at", minutesAgo(now, t.awaitingReviewHours * 60))
    .order("finished_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (runError) throw new Error(`runs awaiting review: ${runError.message}`);
  const waiting = (runs ?? []) as { id: string; attempt_id: string; finished_at: string }[];
  if (waiting.length > 0) {
    const { data: reports, error: reportError } = await db
      .from("eng_reports")
      .select("attempt_id")
      .in("attempt_id", waiting.map((r) => r.attempt_id))
      .in("status", ["draft", "released"]);
    if (reportError) throw new Error(`reports for runs: ${reportError.message}`);
    const covered = new Set(((reports ?? []) as { attempt_id: string }[]).map((r) => r.attempt_id));
    for (const r of waiting) {
      if (covered.has(r.attempt_id)) continue;
      out.push({ kind: "awaiting_draft", attemptId: r.attempt_id, reportId: null, runId: r.id, version: null, since: r.finished_at });
    }
  }
  return out;
}

async function loadResponses(db: OpsDb, t: OpsThresholds, now: number): Promise<OldResponse[]> {
  const { data, error } = await db
    .from("eng_report_responses")
    .select("id,attempt_id,organization_id,kind,target_kind,report_version,created_at")
    .eq("status", "open")
    .lt("created_at", minutesAgo(now, t.responseOpenDays * 24 * 60))
    .order("created_at", { ascending: true })
    .limit(OPS_SECTION_LIMIT);
  if (error) throw new Error(`responses: ${error.message}`);
  return (
    (data ?? []) as {
      id: string;
      attempt_id: string;
      organization_id: string;
      kind: OldResponse["kind"];
      target_kind: OldResponse["targetKind"];
      report_version: number;
      created_at: string;
    }[]
  ).map((r) => ({
    responseId: r.id,
    attemptId: r.attempt_id,
    organizationId: r.organization_id,
    kind: r.kind,
    targetKind: r.target_kind,
    reportVersion: r.report_version,
    createdAt: r.created_at,
  }));
}

export async function listRecentOpsActions(db: OpsDb, limit = 25): Promise<RecentOpsAction[]> {
  const { data, error } = await db
    .from("ops_actions")
    .select("id,actor_email,action,target_type,target_id,reason,outcome,before_state,after_state,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`ops actions: ${error.message}`);
  return (
    (data ?? []) as {
      id: string;
      actor_email: string;
      action: string;
      target_type: string;
      target_id: string;
      reason: string;
      outcome: string;
      before_state: string | null;
      after_state: string | null;
      created_at: string;
    }[]
  ).map((a) => ({
    id: a.id,
    actorEmail: a.actor_email,
    action: a.action,
    targetType: a.target_type,
    targetId: a.target_id,
    reason: a.reason,
    outcome: a.outcome,
    beforeState: a.before_state,
    afterState: a.after_state,
    createdAt: a.created_at,
  }));
}

/**
 * Loads every section independently: one failing query is reported in
 * `errors` and leaves that section empty instead of hiding the others.
 */
export async function loadOpsSnapshot(db: OpsDb, overrides: Partial<OpsThresholds> = {}, nowMs = Date.now()): Promise<OpsSnapshot> {
  const thresholds: OpsThresholds = { ...DEFAULT_OPS_THRESHOLDS, ...overrides };
  const errors: string[] = [];
  async function section<T>(name: string, load: () => Promise<T[]>): Promise<T[]> {
    try {
      return await load();
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message.slice(0, 200) : "failed"}`);
      return [];
    }
  }
  const [runs, submissionsWithoutRun, uploads, imports, reports, responses, recentActions] = await Promise.all([
    section("Evaluation runs", () => loadRuns(db, thresholds, nowMs)),
    section("Submissions without a run", () => loadSubmissionsWithoutRun(db, thresholds, nowMs)),
    section("Uploads", () => loadUploads(db, thresholds, nowMs)),
    section("Imports", () => loadImports(db, thresholds, nowMs)),
    section("Reports", () => loadReports(db, thresholds, nowMs)),
    section("Candidate responses", () => loadResponses(db, thresholds, nowMs)),
    section("Recent operator actions", () => listRecentOpsActions(db)),
  ]);
  return {
    generatedAt: new Date(nowMs).toISOString(),
    thresholds,
    runs,
    submissionsWithoutRun,
    uploads,
    imports,
    reports,
    responses,
    recentActions,
    errors,
  };
}

/** Headline count of items that need an operator, for the overview card. */
export function stuckTotal(s: OpsSnapshot): number {
  return (
    s.runs.filter((r) => r.pastThreshold || r.status === "blocked" || r.leaseExpired).length +
    s.submissionsWithoutRun.length +
    s.uploads.length +
    s.imports.length +
    s.reports.length +
    s.responses.length
  );
}
