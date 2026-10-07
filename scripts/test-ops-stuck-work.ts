/**
 * Operator view of stuck work and audited retry/cancel, against fydell-dev only.
 *
 * Pure checks run first. The live part seeds throwaway rows on fydell-dev
 * (btbmvrvynnrhapjdkunz), exercises every operator action through the real
 * library, then deletes what it created.
 *
 * Engineering uploads, submissions and attempt events are append-only by
 * database trigger, and evaluation runs need a submission. The engineering
 * checks therefore reuse one labelled dev fixture ("Ops test fixture (dev
 * only)", created on first run and left in place with its runs cancelled);
 * runs, reports, responses, import jobs and the disposable import owner are
 * deleted at the end. ops_actions and audit_logs rows are append-only and stay.
 *
 * Run: npx tsx --conditions react-server --env-file=.env.local scripts/test-ops-stuck-work.ts
 */
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const PROJECT_REF = "btbmvrvynnrhapjdkunz";
const devUrl = process.env.FYDELL_DEV_SUPABASE_URL;
const devServiceKey = process.env.FYDELL_DEV_SERVICE_ROLE_KEY;

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

let passed = 0;
function pass(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}

const FIXTURE_ORG = "Ops test fixture (dev only)";
const FIXTURE_EMAIL = "ops-fixture@example.com";
const HANDOFF_MARKER = "ops-fixture-handoff-marker";
const OPERATOR = { email: "ops-test-operator@example.com", roles: ["operator" as const] };
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const ago = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();
const ahead = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString();

async function pureChecks() {
  const { runActionsFor, classifyImport, DEFAULT_OPS_THRESHOLDS } = await import("../src/lib/ops/stuck-work");
  const { parseOpsActionInput, canAct } = await import("../src/lib/ops/ops-actions");

  assert.deepEqual(runActionsFor("blocked", false, 3), ["requeue", "cancel"]);
  assert.deepEqual(runActionsFor("retryable_failure", false, 1), ["requeue", "cancel"]);
  assert.deepEqual(runActionsFor("queued", false, 0), ["cancel"]);
  assert.deepEqual(runActionsFor("running", false, 1), []);
  assert.deepEqual(runActionsFor("running", true, 1), ["requeue", "cancel"]);
  assert.deepEqual(runActionsFor("blocked", false, 10), ["cancel"], "no retry once the 10-try cap is reached");
  assert.deepEqual(runActionsFor("human_review", false, 1), []);
  pass("run actions: only blocked, retrying or lease-expired runs can be retried; finished runs accept nothing");

  const now = Date.now();
  const base = {
    id: randomUUID(),
    owner_id: randomUUID(),
    stage: "fetching",
    attempt_count: 1,
    max_attempts: 4,
    error_code: null,
    retryable: null,
    created_at: ago(60),
    heartbeat_at: null,
    next_attempt_at: ago(60),
    finished_at: null,
    cancel_requested_at: null,
  };
  const t = DEFAULT_OPS_THRESHOLDS;
  assert.equal(classifyImport({ ...base, state: "running", heartbeat_at: new Date(now - 5000).toISOString() }, t, now), null);
  assert.equal(classifyImport({ ...base, state: "running", heartbeat_at: ago(10) }, t, now)?.problem, "worker_lost");
  assert.equal(classifyImport({ ...base, state: "queued", next_attempt_at: ago(1) }, t, now), null);
  assert.equal(classifyImport({ ...base, state: "queued" }, t, now)?.problem, "overdue");
  assert.equal(classifyImport({ ...base, state: "succeeded" }, t, now), null);
  assert.equal(classifyImport({ ...base, state: "dead_letter", error_code: "cancelled" }, t, now), null);
  const failedRetryable = classifyImport({ ...base, state: "dead_letter", error_code: "attempts_exhausted", retryable: true }, t, now);
  assert.deepEqual(failedRetryable?.actions, ["requeue"]);
  const failedTerminal = classifyImport({ ...base, state: "dead_letter", error_code: "private_repository", retryable: false }, t, now);
  assert.deepEqual(failedTerminal?.actions, []);
  pass("import classification: healthy and cancelled jobs are hidden; repository failures are not offered a retry");

  const good = { action: "eng_run.cancel", targetId: randomUUID(), reason: "Test attempt, never evaluate", idempotencyKey: `k-${randomUUID()}` };
  assert.equal(parseOpsActionInput(good).ok, true);
  assert.equal(parseOpsActionInput({ ...good, action: "drop_table" }).ok, false);
  assert.equal(parseOpsActionInput({ ...good, targetId: "1; drop" }).ok, false);
  assert.equal(parseOpsActionInput({ ...good, reason: "ok" }).ok, false, "a reason is required");
  assert.equal(parseOpsActionInput({ ...good, idempotencyKey: "short" }).ok, false);
  assert.equal(parseOpsActionInput(null).ok, false);
  assert.equal(canAct(["support"]), false);
  assert.equal(canAct(["reviewer"]), false);
  assert.equal(canAct(["operator"]), true);
  pass("input validation and role check: unknown actions, bad ids, missing reasons and support/reviewer roles are refused");
}

async function live() {
  if (!devUrl || !devServiceKey) {
    console.log("SKIP live checks: FYDELL_DEV_SUPABASE_URL and FYDELL_DEV_SERVICE_ROLE_KEY are not configured.");
    return;
  }
  if (hostOf(devUrl) !== `${PROJECT_REF}.supabase.co`) throw new Error(`Refusing: FYDELL_DEV_SUPABASE_URL must target ${PROJECT_REF}.`);
  process.env.NEXT_PUBLIC_SUPABASE_URL = devUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = devServiceKey;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;

  const { createAdminSupabaseClient } = await import("../src/lib/supabase/admin");
  const { ensureCurrentScenarioVersion } = await import("../src/lib/eng/scenario-versions");
  const { loadOpsSnapshot } = await import("../src/lib/ops/stuck-work");
  const { performOpsAction, OpsForbiddenError } = await import("../src/lib/ops/ops-actions");
  type OpsActionKind = import("../src/lib/ops/ops-actions").OpsActionKind;

  const db = createAdminSupabaseClient();
  const tag = randomBytes(4).toString("hex");
  const createdRunIds: string[] = [];
  const createdReportIds: string[] = [];
  const createdResponseIds: string[] = [];
  const createdJobIds: string[] = [];
  const createdUserIds: string[] = [];
  const opsActionIds: string[] = [];
  const tightThresholds = {
    evaluationStuckMinutes: 0,
    submissionWithoutRunMinutes: 0,
    submissionLookbackDays: 3650,
    uploadValidatingMinutes: 15,
    importOverdueMinutes: 10,
    reportDraftHours: 1,
    awaitingReviewHours: 1,
    responseOpenDays: 3,
  };

  const act = async (action: OpsActionKind, targetId: string, key = `test-${tag}-${randomUUID()}`, actor: { email: string; roles: ("operator" | "support")[] } = OPERATOR) => {
    const r = await performOpsAction(db, actor, { action, targetId, reason: `ops test ${tag}: ${action}`, idempotencyKey: key });
    opsActionIds.push(r.id);
    return r;
  };
  const setRun = async (runId: string, patch: Record<string, unknown>) => {
    const { error } = await db.from("eng_evaluation_runs").update(patch).eq("id", runId);
    if (error) throw new Error(`fixture run update failed: ${error.message}`);
  };

  try {
    // ------------------------------------------------------------ fixture
    const version = await ensureCurrentScenarioVersion(db);
    const fixture = await ensureFixture(db, version.id, version.suite_version, version.harness_sha256);
    const { data: oldRuns } = await db.from("eng_evaluation_runs").select("id").eq("submission_id", fixture.submissionId);
    const oldRunIds = ((oldRuns ?? []) as { id: string }[]).map((r) => r.id);
    if (oldRunIds.length) {
      await db.from("eng_report_responses").delete().eq("attempt_id", fixture.attemptId);
      await db.from("eng_reports").delete().eq("attempt_id", fixture.attemptId).eq("status", "draft");
      const { error } = await db.from("eng_evaluation_runs").delete().in("id", oldRunIds);
      if (error) throw new Error(`could not clear fixture runs: ${error.message}`);
    }
    pass("dev fixture ready (one labelled org, attempt, submission and two uploads; prior runs cleared)");

    // ------------------------------------------- submission without a run
    let snap = await loadOpsSnapshot(db, tightThresholds);
    assert.ok(snap.submissionsWithoutRun.some((s) => s.attemptId === fixture.attemptId), "submission without a run is listed");
    const enqueueKey = `test-${tag}-enqueue`;
    const enq = await act("eng_attempt.enqueue_evaluation", fixture.attemptId, enqueueKey);
    assert.equal(enq.outcome, "applied", JSON.stringify(enq));
    assert.equal(enq.beforeState, "no_run");
    assert.equal(enq.afterState, "run_queued");
    const { data: queuedRuns } = await db.from("eng_evaluation_runs").select("id,status,run_key").eq("submission_id", fixture.submissionId);
    const runs1 = (queuedRuns ?? []) as { id: string; status: string; run_key: string }[];
    assert.equal(runs1.length, 1);
    const runId = runs1[0].id;
    createdRunIds.push(runId);
    const replay = await act("eng_attempt.enqueue_evaluation", fixture.attemptId, enqueueKey);
    assert.equal(replay.duplicate, true);
    assert.equal(replay.id, enq.id, "same key returns the recorded action");
    const again = await act("eng_attempt.enqueue_evaluation", fixture.attemptId);
    assert.equal(again.outcome, "noop");
    pass("missing run: listed, queued once; same key replays, a new key is a no-op");

    // ------------------------------------------------- blocked run, retry
    await setRun(runId, { status: "blocked", attempt_count: 3, last_error_code: "executor_not_configured" });
    snap = await loadOpsSnapshot(db, tightThresholds);
    const listed = snap.runs.find((r) => r.runId === runId);
    assert.ok(listed, "blocked run is listed");
    assert.equal(listed.pastThreshold, true);
    assert.deepEqual(listed.actions, ["requeue", "cancel"]);
    assert.equal(listed.errorCode, "executor_not_configured");

    const sameKey = `test-${tag}-race-same`;
    const [r1, r2] = await Promise.all([act("eng_run.requeue", runId, sameKey), act("eng_run.requeue", runId, sameKey)]);
    const firsts = [r1, r2].filter((r) => !r.duplicate);
    assert.equal(firsts.length, 1, "exactly one request with the key acts");
    assert.equal(firsts[0].outcome, "applied");
    const { count: sameKeyRows } = await db.from("ops_actions").select("id", { count: "exact", head: true }).eq("idempotency_key", sameKey);
    assert.equal(sameKeyRows, 1);
    const { data: requeued } = await db.from("eng_evaluation_runs").select("status,max_attempts,next_retry_at,lease_owner").eq("id", runId).single();
    assert.equal(requeued?.status, "queued");
    assert.equal(requeued?.max_attempts, 6, "fresh budget: tries so far + 3");
    const { count: requeueEvents } = await db
      .from("eng_attempt_events")
      .select("id", { count: "exact", head: true })
      .eq("attempt_id", fixture.attemptId)
      .eq("client_event_id", `ops_${firsts[0].id}`);
    assert.equal(requeueEvents, 1, "one timeline event for the one applied action");
    pass("retry of a blocked run: concurrent requests with one key act once, one audit row, one timeline event");

    await setRun(runId, { status: "blocked" });
    const [d1, d2] = await Promise.all([act("eng_run.requeue", runId), act("eng_run.requeue", runId)]);
    assert.deepEqual([d1.outcome, d2.outcome].sort(), ["applied", "noop"], "two operators racing: one applies, the other records a no-op");
    const queuedAgain = await act("eng_run.requeue", runId);
    assert.equal(queuedAgain.outcome, "noop");
    pass("racing operators with different keys: compare-and-set lets exactly one act");

    // --------------------------------------- lease-expired run, cancel
    await setRun(runId, { status: "running", lease_owner: `ghost-${tag}`, lease_expires_at: ago(5) });
    snap = await loadOpsSnapshot(db, { ...tightThresholds, evaluationStuckMinutes: 100000 });
    assert.equal(snap.runs.find((r) => r.runId === runId)?.leaseExpired, true, "a dead worker's run is listed even under the age threshold");
    const cancel = await act("eng_run.cancel", runId);
    assert.equal(cancel.outcome, "applied");
    assert.equal(cancel.beforeState, "running_lease_expired");
    const { data: canceled } = await db.from("eng_evaluation_runs").select("status,last_error_code,lease_owner").eq("id", runId).single();
    assert.equal(canceled?.status, "canceled");
    assert.equal(canceled?.last_error_code, "canceled_by_operator");
    assert.equal(canceled?.lease_owner, null);
    assert.equal((await act("eng_run.cancel", runId)).outcome, "noop");
    assert.equal((await act("eng_run.requeue", runId)).outcome, "rejected", "cancelled runs are final");
    assert.equal((await act("eng_attempt.enqueue_evaluation", fixture.attemptId)).outcome, "rejected", "the run key of a cancelled run is not reused");
    snap = await loadOpsSnapshot(db, tightThresholds);
    assert.ok(!snap.submissionsWithoutRun.some((s) => s.attemptId === fixture.attemptId), "a cancelled run is an operator decision, not a missing run");
    pass("cancel of a lease-expired run: applied once, final, and not offered again");

    // --------------------------------------------- live worker is protected
    const { data: liveRun, error: liveError } = await db
      .from("eng_evaluation_runs")
      .insert({
        submission_id: fixture.submissionId,
        attempt_id: fixture.attemptId,
        run_key: `ops-test:${tag}:live`,
        status: "running",
        attempt_count: 1,
        lease_owner: `worker-${tag}`,
        lease_expires_at: ahead(5),
        suite_version: version.suite_version,
        harness_sha256: version.harness_sha256,
        scenario_version_id: version.id,
      })
      .select("id")
      .single();
    if (liveError || !liveRun) throw new Error(`could not insert live run: ${liveError?.message}`);
    createdRunIds.push(liveRun.id);
    assert.equal((await act("eng_run.requeue", liveRun.id)).outcome, "rejected");
    assert.equal((await act("eng_run.cancel", liveRun.id)).outcome, "rejected");
    const { data: stillRunning } = await db.from("eng_evaluation_runs").select("status,lease_owner").eq("id", liveRun.id).single();
    assert.equal(stillRunning?.status, "running");
    assert.equal(stillRunning?.lease_owner, `worker-${tag}`);
    snap = await loadOpsSnapshot(db, { ...tightThresholds, evaluationStuckMinutes: 100000 });
    assert.ok(!snap.runs.some((r) => r.runId === liveRun.id), "a healthy running run under the threshold is not listed");
    pass("a run held by a live worker lease is neither listed nor touched");

    // ------------------------------------------------- stuck upload reset
    const setUpload = async (patch: Record<string, unknown>) => {
      const { error } = await db.from("eng_uploads").update(patch).eq("id", fixture.stuckUploadId);
      if (error) throw new Error(`fixture upload update failed: ${error.message}`);
    };
    await setUpload({ status: "validating", created_at: new Date().toISOString(), rejection_code: null, rejection_detail: null });
    assert.equal((await act("eng_upload.reset", fixture.stuckUploadId)).outcome, "rejected", "a fresh validation is not interrupted");
    await setUpload({ created_at: ago(60) });
    snap = await loadOpsSnapshot(db, tightThresholds);
    assert.ok(snap.uploads.some((u) => u.uploadId === fixture.stuckUploadId), "stuck upload is listed");
    const reset = await act("eng_upload.reset", fixture.stuckUploadId);
    assert.equal(reset.outcome, "applied");
    const { data: upl } = await db.from("eng_uploads").select("status,rejection_code").eq("id", fixture.stuckUploadId).single();
    assert.equal(upl?.status, "failed");
    assert.equal(upl?.rejection_code, "validation_interrupted");
    assert.equal((await act("eng_upload.reset", fixture.stuckUploadId)).outcome, "noop");
    assert.equal((await act("eng_upload.reset", fixture.acceptedUploadId)).outcome, "rejected", "accepted uploads are final");
    pass("stuck upload: fresh validations protected, old ones reset to failed once, accepted uploads refused");

    // ------------------------------------- stale draft and old response
    const responseMarker = `ops-test-response-body-${tag}`;
    const { data: report, error: reportError } = await db
      .from("eng_reports")
      .insert({
        attempt_id: fixture.attemptId,
        evaluation_run_id: liveRun.id,
        version: 1,
        status: "draft",
        brief: { summary: "ops-test-private-draft" },
        rubric_version: version.rubric_version,
        reviewer_email: "ops-test-reviewer@example.com",
        updated_at: ago(3 * 60),
      })
      .select("id")
      .single();
    if (reportError || !report) throw new Error(`could not insert draft: ${reportError?.message}`);
    createdReportIds.push(report.id);
    const { data: response, error: responseError } = await db
      .from("eng_report_responses")
      .insert({
        attempt_id: fixture.attemptId,
        organization_id: fixture.orgId,
        report_id: report.id,
        report_version: 1,
        target_kind: "report",
        target_id: "report",
        kind: "inaccurate",
        body: responseMarker,
        created_at: ago(5 * 24 * 60),
      })
      .select("id")
      .single();
    if (responseError || !response) throw new Error(`could not insert response: ${responseError?.message}`);
    createdResponseIds.push(response.id);
    snap = await loadOpsSnapshot(db, tightThresholds);
    assert.ok(snap.reports.some((r) => r.kind === "draft_unreleased" && r.reportId === report.id), "stale draft listed");
    const old = snap.responses.find((r) => r.responseId === response.id);
    assert.ok(old, "old open response listed");
    assert.equal(old.kind, "inaccurate");
    pass("stale draft report and old open candidate response are listed");

    // ------------------------------------------------------- import jobs
    const owner = await db.auth.admin.createUser({ email: `ops-test-${tag}@example.com`, email_confirm: true });
    if (owner.error || !owner.data.user) throw new Error(`could not create disposable owner: ${owner.error?.message}`);
    createdUserIds.push(owner.data.user.id);
    const ownerId = owner.data.user.id;
    const job = async (patch: Record<string, unknown>) => {
      const { data, error } = await db
        .from("durable_jobs")
        .insert({
          job_type: "passport_import",
          idempotency_key: `ops-test:${tag}:${randomUUID()}`,
          owner_id: ownerId,
          payload: { repository: "example/ops-test", commitSha: "a".repeat(40), revisionRef: "main", contribution: "ops-test-private-contribution", githubLogin: null, displayName: "" },
          max_attempts: 4,
          analysis_version: "ops-test",
          ...patch,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`could not insert job: ${error?.message}`);
      createdJobIds.push(data.id);
      return data.id as string;
    };
    const failedJob = await job({ state: "dead_letter", stage: "fetching", attempt_count: 4, error_code: "attempts_exhausted", retryable: true, finished_at: ago(30) });
    const terminalJob = await job({ state: "dead_letter", stage: "resolving", attempt_count: 1, error_code: "private_repository", retryable: false, finished_at: ago(30) });
    const lostJob = await job({ state: "running", stage: "fetching", attempt_count: 1, heartbeat_at: ago(10), locked_by: `ghost-${tag}` });
    const overdueJob = await job({ state: "queued", stage: "queued", next_attempt_at: ago(30) });
    snap = await loadOpsSnapshot(db, tightThresholds);
    const byJob = new Map(snap.imports.map((j) => [j.jobId, j]));
    assert.equal(byJob.get(failedJob)?.problem, "failed");
    assert.equal(byJob.get(terminalJob)?.problem, "failed");
    assert.equal(byJob.get(lostJob)?.problem, "worker_lost");
    assert.equal(byJob.get(overdueJob)?.problem, "overdue");
    pass("imports: failed, worker-lost and overdue jobs are listed with their problem");

    const retryKey = `test-${tag}-import-retry`;
    const retried = await act("import_job.retry", failedJob, retryKey);
    assert.equal(retried.outcome, "applied", JSON.stringify(retried));
    assert.deepEqual(retried.followUp, { kind: "run_import", jobId: failedJob });
    const { data: requeuedJob } = await db.from("durable_jobs").select("state,max_attempts").eq("id", failedJob).single();
    assert.equal(requeuedJob?.state, "queued");
    assert.equal(requeuedJob?.max_attempts, 8);
    assert.equal((await act("import_job.retry", failedJob, retryKey)).duplicate, true);
    assert.equal((await act("import_job.retry", terminalJob)).outcome, "rejected", "repository failures are not retried");
    const cancelLost = await act("import_job.cancel", lostJob);
    assert.equal(cancelLost.outcome, "applied", JSON.stringify(cancelLost));
    const { data: lostAfter } = await db.from("durable_jobs").select("state,error_code,cancel_requested_at").eq("id", lostJob).single();
    assert.equal(lostAfter?.state, "dead_letter");
    assert.equal(lostAfter?.error_code, "cancelled");
    assert.equal((await act("import_job.cancel", overdueJob)).outcome, "applied");
    assert.equal((await act("import_job.cancel", overdueJob)).outcome, "noop");
    assert.equal((await act("import_job.cancel", terminalJob)).outcome, "rejected");
    pass("imports: retry requeues retryable failures once; cancel closes out lost and overdue jobs; finished jobs refused");

    // ------------------------------------------------------ authorization
    const before = await db.from("ops_actions").select("id", { count: "exact", head: true }).eq("target_id", overdueJob);
    await assert.rejects(
      () => performOpsAction(db, { email: "ops-test-support@example.com", roles: ["support"] }, { action: "import_job.retry", targetId: overdueJob, reason: "support should not act", idempotencyKey: `test-${tag}-support` }),
      (err: unknown) => err instanceof OpsForbiddenError,
    );
    const afterCount = await db.from("ops_actions").select("id", { count: "exact", head: true }).eq("target_id", overdueJob);
    assert.equal(afterCount.count, before.count, "a refused role writes nothing");
    pass("authorization: a support role is refused inside the library and nothing is recorded");

    await httpChecks();

    // ---------------------------------------------------------- audit trail
    const { data: audit } = await db
      .from("ops_actions")
      .select("id,actor_email,actor_roles,action,target_type,target_id,reason,outcome,before_state,after_state,completed_at,created_at")
      .in("id", [...new Set(opsActionIds)]);
    const rows = (audit ?? []) as { id: string; actor_email: string; actor_roles: string[]; reason: string; outcome: string; completed_at: string | null; created_at: string }[];
    assert.ok(rows.length >= 20, `audit rows recorded (${rows.length})`);
    assert.ok(rows.every((r) => r.actor_email === OPERATOR.email && r.actor_roles.includes("operator") && r.reason.startsWith(`ops test ${tag}`) && r.created_at));
    assert.ok(rows.every((r) => r.outcome !== "pending" && r.completed_at), "every action finished its audit row");
    const { error: deleteError } = await db.from("ops_actions").delete().eq("id", rows[0].id);
    assert.ok(deleteError, "audit rows cannot be deleted");
    const { error: rewriteError } = await db.from("ops_actions").update({ outcome: "noop" }).eq("id", rows[0].id);
    assert.ok(rewriteError, "a finished audit row cannot be rewritten");
    const { count: mirrored } = await db.from("audit_logs").select("id", { count: "exact", head: true }).eq("actor_email", OPERATOR.email).eq("action", "ops.eng_run.cancel").eq("entity_id", runId);
    assert.ok((mirrored ?? 0) >= 1, "actions are mirrored to audit_logs");
    pass("audit: who, what, target, why, outcome and when recorded for every action; rows are append-only and mirrored to audit_logs");

    // ------------------------------------------------------- no leakage
    snap = await loadOpsSnapshot(db, tightThresholds);
    const json = JSON.stringify(snap);
    for (const secret of [HANDOFF_MARKER, responseMarker, "ops-test-private-draft", "ops-test-private-contribution", "attempts/", "ops-test-reviewer@example.com", "example/ops-test"]) {
      assert.ok(!json.includes(secret), `snapshot does not contain ${secret}`);
    }
    for (const field of ['"body"', '"handoff"', '"results"', '"storage_path"', '"payload"', '"brief"', '"findings"', '"last_error_detail"', '"rejection_detail"', '"token_hash"']) {
      assert.ok(!json.includes(field), `snapshot has no ${field} field`);
    }
    pass("snapshot carries ids, states, counts and times only: no source, handoff, response text, draft content, payloads or paths");

    console.log(`OPS_STUCK_WORK_OK ${passed} checks`);
  } finally {
    if (createdResponseIds.length) await db.from("eng_report_responses").delete().in("id", createdResponseIds);
    if (createdReportIds.length) await db.from("eng_reports").delete().in("id", createdReportIds);
    const keepParked = createdRunIds[0];
    const toDelete = createdRunIds.filter((id) => id !== keepParked);
    if (toDelete.length) await db.from("eng_evaluation_runs").delete().in("id", toDelete);
    if (keepParked) {
      const { data: parked } = await db.from("eng_evaluation_runs").select("status").eq("id", keepParked).maybeSingle();
      if (parked && parked.status !== "canceled") await db.from("eng_evaluation_runs").delete().eq("id", keepParked);
    }
    if (createdJobIds.length) await db.from("durable_jobs").delete().in("id", createdJobIds);
    for (const id of createdUserIds) await db.auth.admin.deleteUser(id);
    const { count: leftJobs } = await db.from("durable_jobs").select("id", { count: "exact", head: true }).like("idempotency_key", `ops-test:${tag}:%`);
    console.log(`Cleanup: deleted ${createdResponseIds.length} responses, ${createdReportIds.length} reports, ${toDelete.length} runs, ${createdJobIds.length} import jobs (${leftJobs ?? 0} left), ${createdUserIds.length} users. Kept: the labelled dev fixture with its cancelled run; append-only ops_actions, audit_logs and attempt events.`);
  }
}

async function httpChecks() {
  const base = process.env.OPS_TEST_BASE_URL ?? "http://localhost:3000";
  const body = JSON.stringify({ action: "eng_run.cancel", targetId: randomUUID(), reason: "unauthenticated probe", idempotencyKey: `probe-${randomUUID()}` });
  let res: Response;
  try {
    res = await fetch(`${base}/api/admin/ops/actions`, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(90000) });
  } catch {
    console.log(`SKIP http checks: ${base} is not reachable.`);
    return;
  }
  assert.equal(res.status, 401, "no admin session -> 401");
  const cross = await fetch(`${base}/api/admin/ops/actions`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.example" }, body, signal: AbortSignal.timeout(30000) });
  assert.equal(cross.status, 403, "cross-origin POST -> 403");
  const view = await fetch(`${base}/api/admin/ops/stuck`, { signal: AbortSignal.timeout(90000) });
  assert.equal(view.status, 401, "snapshot API needs an admin session");
  pass("http: action and snapshot routes refuse requests without an admin session, and cross-origin posts");
}

type Db = ReturnType<typeof import("../src/lib/supabase/admin").createAdminSupabaseClient>;

/** Finds or creates the labelled dev fixture. Only ever created on fydell-dev. */
async function ensureFixture(db: Db, versionId: string, suiteVersion: string, harnessSha: string) {
  void suiteVersion;
  void harnessSha;
  const { data: existingOrg } = await db.from("organizations").select("id").eq("name", FIXTURE_ORG).limit(1).maybeSingle();
  let orgId = (existingOrg as { id: string } | null)?.id ?? null;
  let userId: string;
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = (users?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === FIXTURE_EMAIL);
  if (found) userId = found.id;
  else {
    const created = await db.auth.admin.createUser({ email: FIXTURE_EMAIL, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(`fixture user: ${created.error?.message}`);
    userId = created.data.user.id;
  }
  if (!orgId) {
    const { data: org, error } = await db.from("organizations").insert({ name: FIXTURE_ORG, owner_id: userId, owner_email: FIXTURE_EMAIL, created_by: userId }).select("id").single();
    if (error || !org) throw new Error(`fixture org: ${error?.message}`);
    orgId = org.id as string;
  }

  const { data: attemptRow } = await db.from("eng_attempts").select("id").eq("organization_id", orgId).limit(1).maybeSingle();
  let attemptId = (attemptRow as { id: string } | null)?.id ?? null;
  if (!attemptId) {
    const { data: role, error: roleError } = await db
      .from("eng_roles")
      .insert({ organization_id: orgId, title: "Ops fixture role", role_family: "backend_engineer", scenario_version_id: versionId, status: "draft" })
      .select("id")
      .single();
    if (roleError || !role) throw new Error(`fixture role: ${roleError?.message}`);
    const { data: inv, error: invError } = await db
      .from("eng_invitations")
      .insert({
        organization_id: orgId,
        role_id: role.id,
        scenario_version_id: versionId,
        candidate_email: FIXTURE_EMAIL,
        token_hash: sha(`ops-fixture-${randomUUID()}`),
        status: "accepted",
        role_snapshot: { title: "Ops fixture role", companyContext: "", organizationName: FIXTURE_ORG, scenarioKey: "fixture", scenarioVersion: 1 },
        allowed_minutes: 120,
        expires_at: ahead(60 * 24 * 365),
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (invError || !inv) throw new Error(`fixture invitation: ${invError?.message}`);
    const { data: att, error: attError } = await db
      .from("eng_attempts")
      .insert({
        invitation_id: inv.id,
        organization_id: orgId,
        role_id: role.id,
        scenario_version_id: versionId,
        candidate_user_id: userId,
        status: "submitted",
        allowed_minutes: 120,
        submitted_at: ago(120),
      })
      .select("id")
      .single();
    if (attError || !att) throw new Error(`fixture attempt: ${attError?.message}`);
    attemptId = att.id as string;
  }

  const { data: uploadRows } = await db.from("eng_uploads").select("id,status,storage_path").eq("attempt_id", attemptId);
  const uploads = (uploadRows ?? []) as { id: string; status: string; storage_path: string }[];
  let accepted = uploads.find((u) => u.status === "accepted");
  if (!accepted) {
    const { data, error } = await db
      .from("eng_uploads")
      .insert({ attempt_id: attemptId, status: "accepted", storage_path: `attempts/${attemptId}/ops-fixture-a.zip`, sha256: sha("ops-fixture-a"), byte_size: 1, validated_at: new Date().toISOString() })
      .select("id,status,storage_path")
      .single();
    if (error || !data) throw new Error(`fixture accepted upload: ${error?.message}`);
    accepted = data as { id: string; status: string; storage_path: string };
  }
  let stuck = uploads.find((u) => u.storage_path.endsWith("ops-fixture-b.zip"));
  if (!stuck) {
    const { data, error } = await db
      .from("eng_uploads")
      .insert({ attempt_id: attemptId, status: "failed", storage_path: `attempts/${attemptId}/ops-fixture-b.zip`, byte_size: 1 })
      .select("id,status,storage_path")
      .single();
    if (error || !data) throw new Error(`fixture stuck upload: ${error?.message}`);
    stuck = data as { id: string; status: string; storage_path: string };
  }

  const { data: subRow } = await db.from("eng_submissions").select("id").eq("attempt_id", attemptId).maybeSingle();
  let submissionId = (subRow as { id: string } | null)?.id ?? null;
  if (!submissionId) {
    const { data, error } = await db
      .from("eng_submissions")
      .insert({
        attempt_id: attemptId,
        upload_id: accepted.id,
        archive_sha256: sha("ops-fixture-a"),
        archive_bytes: 1,
        handoff: { what_changed: HANDOFF_MARKER, testing: HANDOFF_MARKER, risks: HANDOFF_MARKER, next_steps: HANDOFF_MARKER },
        submitted_at: ago(120),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`fixture submission: ${error?.message}`);
    submissionId = data.id as string;
  }
  return { orgId, userId, attemptId, submissionId, acceptedUploadId: accepted.id, stuckUploadId: stuck.id };
}

async function main() {
  await pureChecks();
  await live();
  console.log(`${passed} checks passed`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : "ops test failed");
  process.exitCode = 1;
});
