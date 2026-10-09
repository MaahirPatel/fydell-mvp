import "server-only";
import { randomUUID } from "crypto";
import type { Admin } from "../context";
import { AttemptError } from "../attempts";
import { recordEngEvent } from "../events";
import type { PackageFile, ScenarioPackage } from "../authoring/package";
import { displayCommand, selectRunner, type TestCaseResult } from "../authoring/runner";
import { resolveScenarioVersion } from "../scenario-versions";
import { completeSubmission } from "../submissions";
import { effectiveDueAt, operationalState, sessionLifecycle, submissionWindow } from "../state";
import { SUBMISSION_BUCKET } from "../uploads";
import type { AttemptRow, AuthoredHandoff, InvitationRow, RunRow, ScenarioVersionRow, SubmissionRow } from "../types";
import { filesFingerprint, sha256Hex, zipFiles } from "./archive";
import { asManifest, buildManifest, isClientSubmissionId, manifestSha256, receiptStatements, seqRange } from "./manifest";
import { buildAuthoredCandidatePayload } from "./candidate-payload";
import { PUBLIC_RUN_TIMEOUT_MS, publicTestProject, validateCandidateFiles } from "./evaluate";
import type { AuthoredCandidateView, AuthoredEvaluationStatus, CandidateTask, PublicRunView } from "./types";

export const PUBLIC_RUN_MIN_GAP_SECONDS = 20;
export const PUBLIC_RUN_LIMIT = 30;
/** Minutes after the deadline in which a submission is still accepted and marked late. */
export const AUTHORED_GRACE_MINUTES = 10;

export interface AuthoredAttempt {
  attempt: AttemptRow;
  pkg: ScenarioPackage;
  version: ScenarioVersionRow;
}

/** Loads an attempt's employer-authored package, or throws when the attempt is not an authored one. */
export async function loadAuthored(db: Admin, attempt: AttemptRow): Promise<AuthoredAttempt> {
  const resolved = await resolveScenarioVersion(db, attempt.scenario_version_id);
  if (resolved.origin !== "employer_authored") throw new AttemptError("This attempt is not an employer-authored work sample.", 404);
  return { attempt, pkg: resolved.pkg, version: resolved.row };
}

export function publicCommand(pkg: ScenarioPackage): string {
  return displayCommand(pkg.environment.id, [...new Set(pkg.publicTests.map((t) => t.file))]);
}

export function candidateTask(pkg: ScenarioPackage): CandidateTask {
  return buildAuthoredCandidatePayload(pkg, { publicTestCommand: publicCommand(pkg) });
}

function requireOpen(attempt: AttemptRow) {
  if (attempt.status === "withdrawn") throw new AttemptError("The employer withdrew this invitation.", 409);
  if (attempt.status === "expired") throw new AttemptError("This attempt has expired.", 409);
}

function requireWorking(attempt: AttemptRow) {
  requireOpen(attempt);
  if (attempt.status !== "in_progress") throw new AttemptError("The editor opens when you start the task and closes after you submit.", 409);
  if (submissionWindow(attempt, AUTHORED_GRACE_MINUTES) === "closed") {
    throw new AttemptError("The submission window has closed. Contact the employer if you need an extension.", 409);
  }
}

/* ------------------------------------------------------------------ */
/* Workspace                                                           */
/* ------------------------------------------------------------------ */

export async function getWorkspace(db: Admin, attemptId: string): Promise<{ files: PackageFile[]; revision: number } | null> {
  const { data } = await db.from("eng_authored_workspaces").select("files, revision").eq("attempt_id", attemptId).maybeSingle();
  if (!data) return null;
  return { files: (data.files as PackageFile[]) ?? [], revision: data.revision as number };
}

async function ensureWorkspace(db: Admin, attemptId: string, pkg: ScenarioPackage): Promise<{ files: PackageFile[]; revision: number }> {
  const existing = await getWorkspace(db, attemptId);
  if (existing) return existing;
  const files = pkg.starterFiles.map((f) => ({ path: f.path, content: f.content }));
  const { error } = await db.from("eng_authored_workspaces").insert({ attempt_id: attemptId, files, revision: 1 });
  if (error && error.code !== "23505") throw new AttemptError("Could not open your workspace. Try again.", 500);
  return (await getWorkspace(db, attemptId)) ?? { files, revision: 1 };
}

/** Compare-and-set on the revision, so two tabs cannot silently overwrite each other. */
export async function saveWorkspace(
  db: Admin,
  { attempt, pkg }: AuthoredAttempt,
  rawFiles: unknown,
  baseRevision: number,
): Promise<{ ok: true; revision: number; filesSha256: string } | { ok: false; current: { files: PackageFile[]; revision: number } }> {
  requireWorking(attempt);
  const checked = validateCandidateFiles(pkg, rawFiles);
  if (checked.ok === false) throw new AttemptError(checked.error, 422);
  await ensureWorkspace(db, attempt.id, pkg);
  const { data } = await db
    .from("eng_authored_workspaces")
    .update({ files: checked.files, revision: baseRevision + 1 })
    .eq("attempt_id", attempt.id)
    .eq("revision", baseRevision)
    .select("revision")
    .maybeSingle();
  if (data) return { ok: true, revision: data.revision as number, filesSha256: filesFingerprint(checked.files) };
  const current = await getWorkspace(db, attempt.id);
  if (!current) throw new AttemptError("Could not save your files. Try again.", 500);
  return { ok: false, current };
}

/* ------------------------------------------------------------------ */
/* Setup and start                                                     */
/* ------------------------------------------------------------------ */

export async function passEnvironmentCheck(db: Admin, attempt: AttemptRow, userId: string, runtime: string): Promise<AttemptRow> {
  requireOpen(attempt);
  if (!attempt.consented_at) throw new AttemptError("Review and accept the task terms first.", 409);
  if (attempt.status !== "accepted") return attempt;
  const { data } = await db
    .from("eng_attempts")
    .update({ status: "preflight_passed", preflight_passed_at: new Date().toISOString(), preflight_runtime: runtime.slice(0, 120) })
    .eq("id", attempt.id)
    .eq("status", "accepted")
    .select("*")
    .maybeSingle();
  await recordEngEvent(db, attempt.id, { type: "preflight_passed", actor: "candidate", actorUserId: userId, payload: { runtime }, clientEventId: "preflight_passed" });
  return (data as AttemptRow) ?? attempt;
}

export async function startAuthored(db: Admin, { attempt, pkg }: AuthoredAttempt, userId: string): Promise<AttemptRow> {
  requireOpen(attempt);
  if (attempt.status === "in_progress" || attempt.status === "submitted") return attempt;
  if (attempt.status !== "preflight_passed") throw new AttemptError("Finish the environment check before starting.", 409);
  const startedAt = new Date();
  const dueAt = new Date(startedAt.getTime() + attempt.allowed_minutes * 60000);
  const { data } = await db
    .from("eng_attempts")
    .update({ status: "in_progress", started_at: startedAt.toISOString(), due_at: dueAt.toISOString() })
    .eq("id", attempt.id)
    .eq("status", "preflight_passed")
    .select("*")
    .maybeSingle();
  if (!data) {
    const { data: current } = await db.from("eng_attempts").select("*").eq("id", attempt.id).single();
    return current as AttemptRow;
  }
  await ensureWorkspace(db, attempt.id, pkg);
  await recordEngEvent(db, attempt.id, { type: "attempt_started", actor: "candidate", actorUserId: userId, payload: { dueAt: dueAt.toISOString() }, clientEventId: "attempt_started" });
  return data as AttemptRow;
}

/* ------------------------------------------------------------------ */
/* Public tests                                                        */
/* ------------------------------------------------------------------ */

type PublicRunRow = {
  id: string;
  files_sha256: string;
  purpose: PublicRunView["purpose"];
  status: PublicRunView["status"];
  runner_label: string | null;
  isolated: boolean | null;
  command: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  tests: { name: string; outcome: TestCaseResult["outcome"] }[];
  output: string;
  detail: string | null;
  created_at: string;
};

function toRunView(r: PublicRunRow): PublicRunView {
  return {
    id: r.id,
    purpose: r.purpose,
    status: r.status,
    filesSha256: r.files_sha256,
    runnerLabel: r.runner_label,
    isolated: r.isolated,
    command: r.command,
    exitCode: r.exit_code,
    durationMs: r.duration_ms,
    tests: (r.tests ?? []).map((t) => ({ name: t.name, outcome: t.outcome })),
    output: r.status === "infrastructure_error" ? "" : r.output,
    detail:
      r.status === "infrastructure_error"
        ? "The test runner could not start. This is a platform problem, not a result about your code. Try again in a minute."
        : r.detail,
    createdAt: r.created_at,
  };
}

const PLATFORM_FAULT_STATES = ["infrastructure_error", "runner_unavailable"];

/** Runs that failed for platform reasons. They never use up the candidate's allowance. */
async function platformFaultRuns(db: Admin, attemptId: string): Promise<number> {
  const { count } = await db.from("eng_public_test_runs").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId).in("status", PLATFORM_FAULT_STATES);
  return count ?? 0;
}

async function publicRunSummary(db: Admin, attemptId: string): Promise<AuthoredCandidateView["publicRuns"]> {
  const [{ count }, faults, { data: latest }] = await Promise.all([
    db.from("eng_public_test_runs").select("id", { count: "exact", head: true }).eq("attempt_id", attemptId),
    platformFaultRuns(db, attemptId),
    db.from("eng_public_test_runs").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { used: Math.max(0, (count ?? 0) - faults), limit: PUBLIC_RUN_LIMIT, minGapSeconds: PUBLIC_RUN_MIN_GAP_SECONDS, latest: latest ? toRunView(latest as PublicRunRow) : null };
}

/**
 * Runs only the public tests, on the authoring runner, against the files the
 * candidate sends (or the untouched starter for the environment check). The
 * candidate's code never runs in this process: the runner spawns a separate
 * process locally (labelled not isolated) or a sandbox in production.
 */
export async function runPublicTests(
  db: Admin,
  { attempt, pkg }: AuthoredAttempt,
  purpose: PublicRunView["purpose"],
  rawFiles: unknown,
  userId: string,
): Promise<PublicRunView> {
  let files: PackageFile[];
  if (purpose === "environment_check") {
    requireOpen(attempt);
    if (!attempt.consented_at) throw new AttemptError("Review and accept the task terms first.", 409);
    if (attempt.status !== "accepted" && attempt.status !== "preflight_passed") throw new AttemptError("The environment check is part of setup.", 409);
    files = pkg.starterFiles;
  } else {
    requireWorking(attempt);
    const checked = validateCandidateFiles(pkg, rawFiles);
    if (checked.ok === false) throw new AttemptError(checked.error, 422);
    files = checked.files;
  }
  if (pkg.publicTests.length === 0) throw new AttemptError("This task has no public tests to run.", 409);

  const { data: claim, error } = await db.rpc("eng_claim_public_test_run", {
    p_attempt_id: attempt.id,
    p_files_sha256: filesFingerprint(files),
    p_purpose: purpose,
    p_min_gap_seconds: PUBLIC_RUN_MIN_GAP_SECONDS,
    p_max_runs: PUBLIC_RUN_LIMIT + (await platformFaultRuns(db, attempt.id)),
  });
  if (error) throw new AttemptError("Could not start the test run. Try again.", 500);
  const row = (Array.isArray(claim) ? claim[0] : claim) as { run_id: string | null; reason: string | null; retry_after_seconds: number | null } | undefined;
  if (!row?.run_id) {
    if (row?.reason === "limit_reached") throw new AttemptError(`You have used all ${PUBLIC_RUN_LIMIT} public test runs for this attempt. You can still run the tests locally and submit.`, 429);
    throw new AttemptError(`Wait ${row?.retry_after_seconds ?? PUBLIC_RUN_MIN_GAP_SECONDS} seconds before running the tests again.`, 429);
  }
  const runId = row.run_id;

  const selection = selectRunner();
  let patch: Record<string, unknown>;
  if (selection.ok === false) {
    patch = { status: "runner_unavailable", detail: selection.detail.slice(0, 500), finished_at: new Date().toISOString() };
  } else {
    const project = publicTestProject(pkg, files);
    const [run] = await selection.runner.runSuites([{ ...project, timeoutMs: PUBLIC_RUN_TIMEOUT_MS }]);
    const info = selection.runner.info;
    const base = { runner_name: info.name, runner_label: info.label, isolated: info.isolated, finished_at: new Date().toISOString() };
    if (!run) {
      patch = { ...base, status: "infrastructure_error", detail: "The runner returned no result." };
    } else if (run.kind === "infrastructure_error") {
      patch = { ...base, status: "infrastructure_error", detail: run.detail.slice(0, 500) };
    } else if (run.kind === "timeout") {
      patch = { ...base, status: "timeout", command: run.command, duration_ms: run.durationMs, output: run.output.slice(0, 20000) };
    } else {
      patch = { ...base, status: "ran", command: run.command, exit_code: run.exitCode, duration_ms: run.durationMs, tests: run.tests, output: run.output.slice(0, 20000) };
    }
  }
  const { data: saved } = await db.from("eng_public_test_runs").update(patch).eq("id", runId).eq("status", "running").select("*").single();
  const view = toRunView(saved as PublicRunRow);
  await recordEngEvent(db, attempt.id, {
    type: purpose === "environment_check" ? "environment_check_run" : "public_tests_run",
    actor: "candidate",
    actorUserId: userId,
    payload: {
      runId,
      status: view.status,
      passed: view.tests.filter((t) => t.outcome === "passed").length,
      total: view.tests.length,
      runner: view.runnerLabel,
    },
    clientEventId: `public_run_${runId}`,
  });
  return view;
}

/* ------------------------------------------------------------------ */
/* Submission                                                          */
/* ------------------------------------------------------------------ */

export type AuthoredReceipt = NonNullable<AuthoredCandidateView["receipt"]> & { alreadySubmitted: boolean };

function receiptOf(s: SubmissionRow, alreadySubmitted: boolean): AuthoredReceipt {
  const manifest = asManifest(s.manifest);
  return {
    submissionId: s.id,
    archiveSha256: s.archive_sha256,
    archiveBytes: s.archive_bytes,
    submittedAt: s.submitted_at,
    late: s.late,
    clientSubmissionId: s.client_submission_id ?? null,
    manifestSha256: s.manifest_sha256 ?? null,
    scenarioVersion: manifest?.scenario.version ?? null,
    files: manifest?.files ?? [],
    ...receiptStatements(manifest),
    alreadySubmitted,
  };
}

async function seqs(db: Admin, table: "eng_attempt_events" | "eng_messages" | "eng_assistant_interactions", attemptId: string, statuses?: string[]): Promise<number[]> {
  let q = db.from(table).select("seq").eq("attempt_id", attemptId);
  if (statuses) q = q.in("status", statuses);
  const { data, error } = await q;
  if (error) throw new AttemptError("Could not freeze the submission record. Your files are saved; try again.", 500);
  return ((data ?? []) as Array<{ seq: number }>).map((r) => Number(r.seq));
}

export function validateAuthoredHandoff(
  pkg: ScenarioPackage,
  body: Record<string, unknown>,
): { ok: true; handoff: AuthoredHandoff; aiDisclosure: string } | { ok: false; error: string } {
  const raw = body.handoff && typeof body.handoff === "object" && !Array.isArray(body.handoff) ? (body.handoff as Record<string, unknown>) : {};
  const answers = pkg.submission.handoffPrompts.map((p) => ({ id: p.id, label: p.label, answer: typeof raw[p.id] === "string" ? (raw[p.id] as string).trim() : "" }));
  for (const a of answers) if (a.answer.length > 8000) return { ok: false, error: `Keep "${a.label}" under 8,000 characters.` };
  if (answers.length && !answers.some((a) => a.answer)) return { ok: false, error: "Answer at least one handoff question before submitting." };
  const aiDisclosure = typeof body.ai_use === "string" ? body.ai_use.trim() : "";
  if (aiDisclosure.length > 4000) return { ok: false, error: "Keep the AI assistance note under 4,000 characters." };
  const summary = answers
    .filter((a) => a.answer)
    .map((a) => `${a.label}\n${a.answer}`)
    .join("\n\n")
    .slice(0, 8000);
  return { ok: true, handoff: { what_changed: summary, testing: "", risks: "", next_steps: "", authored: answers }, aiDisclosure };
}

/**
 * Accepts the sealed upload behind a recorded submission, then closes the
 * attempt, logs the acceptance and queues evaluation. Every step is guarded
 * or keyed, so this is re-run whenever the submission is seen again and
 * finishes the work of a request that died part way.
 */
async function followThrough(db: Admin, attempt: AttemptRow, submission: SubmissionRow, userId: string | null): Promise<void> {
  await db
    .from("eng_uploads")
    .update({ status: "accepted", validated_at: new Date().toISOString() })
    .eq("id", submission.upload_id)
    .eq("status", "initiated");
  await completeSubmission(db, attempt, submission, userId);
  await discardOrphanedUploads(db, attempt.id, submission.upload_id);
}

/**
 * Sealed archives left by requests that died before their submission was
 * recorded. Once a submission exists none of them can become it, so each is
 * marked failed and its stored copy removed.
 */
async function discardOrphanedUploads(db: Admin, attemptId: string, keepUploadId: string): Promise<void> {
  const { data } = await db.from("eng_uploads").select("id, storage_path").eq("attempt_id", attemptId).eq("status", "initiated").neq("id", keepUploadId);
  for (const u of (data ?? []) as Array<{ id: string; storage_path: string }>) {
    await discardSealed(db, u.id, u.storage_path, "A different archive became this attempt's submission.");
  }
  const prefix = `attempts/${attemptId}`;
  const keepPath = `${prefix}/${keepUploadId}.zip`;
  const { data: objects } = await db.storage.from(SUBMISSION_BUCKET).list(prefix);
  const stray = (objects ?? []).map((o) => `${prefix}/${o.name}`).filter((p) => p.endsWith(".zip") && p !== keepPath);
  if (stray.length) await db.storage.from(SUBMISSION_BUCKET).remove(stray);
}

/** A sealed archive that never became the submission is marked failed and its stored copy removed. */
async function discardSealed(db: Admin, uploadId: string, storagePath: string, detail: string): Promise<void> {
  await db
    .from("eng_uploads")
    .update({ status: "failed", rejection_code: "not_submitted", rejection_detail: detail })
    .eq("id", uploadId)
    .eq("status", "initiated");
  await db.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
}

/**
 * The receipt of an attempt that was already submitted, after completing any
 * follow-through, so a retry gets it back whatever its body holds.
 */
export async function existingAuthoredReceipt(db: Admin, authored: AuthoredAttempt, userId: string): Promise<AuthoredReceipt | null> {
  const { data } = await db.from("eng_submissions").select("*").eq("attempt_id", authored.attempt.id).maybeSingle();
  if (!data) return null;
  await followThrough(db, authored.attempt, data as SubmissionRow, userId);
  return receiptOf(data as SubmissionRow, true);
}

/**
 * Seals the candidate's files into a ZIP in private storage, records the
 * upload and the immutable submission, and queues evaluation. The upload is
 * accepted only once the submission exists, so a failed or lost race leaves
 * no accepted archive behind. One submission per attempt: a repeat returns the
 * original receipt and completes anything the first request left undone.
 */
export async function submitAuthored(
  db: Admin,
  authored: AuthoredAttempt,
  input: { files: unknown; handoff: AuthoredHandoff; aiDisclosure: string; clientSubmissionId?: string | null },
  userId: string,
): Promise<AuthoredReceipt> {
  const { attempt, pkg, version } = authored;
  const { data: existing } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).maybeSingle();
  if (existing) {
    await followThrough(db, attempt, existing as SubmissionRow, userId);
    return receiptOf(existing as SubmissionRow, true);
  }
  requireWorking(attempt);
  const window = submissionWindow(attempt, AUTHORED_GRACE_MINUTES);
  const checked = validateCandidateFiles(pkg, input.files);
  if (checked.ok === false) throw new AttemptError(checked.error, 422);
  const files = checked.files;

  await ensureWorkspace(db, attempt.id, pkg);
  const { data: ws } = await db.from("eng_authored_workspaces").select("revision").eq("attempt_id", attempt.id).single();
  await db.from("eng_authored_workspaces").update({ files, revision: ((ws?.revision as number) ?? 1) + 1 }).eq("attempt_id", attempt.id);

  const bytes = zipFiles(files);
  const sha256 = sha256Hex(bytes);
  const [eventSeqs, messageSeqs, assistantSeqs] = await Promise.all([
    seqs(db, "eng_attempt_events", attempt.id),
    seqs(db, "eng_messages", attempt.id),
    seqs(db, "eng_assistant_interactions", attempt.id),
  ]);
  const usedAssistant = await seqs(db, "eng_assistant_interactions", attempt.id, ["answered", "invalid_output"]);
  const manifest = buildManifest({
    clientSubmissionId: isClientSubmissionId(input.clientSubmissionId) ? input.clientSubmissionId : `srv_${randomUUID().replace(/-/g, "")}`,
    attemptId: attempt.id,
    scenario: { versionId: version.id, key: version.scenario_key, version: version.version, harnessSha256: version.harness_sha256, aiPolicy: pkg.aiPolicy.id },
    files,
    archive: { sha256, bytes: bytes.length },
    handoff: input.handoff,
    aiDisclosure: input.aiDisclosure,
    builtInAssistantRequests: usedAssistant.length,
    events: seqRange(eventSeqs),
    teamMessages: seqRange(messageSeqs),
    assistantInteractions: seqRange(assistantSeqs),
    late: window === "late",
  });
  const uploadId = randomUUID();
  const storagePath = `attempts/${attempt.id}/${uploadId}.zip`;
  const { error: storageError } = await db.storage.from(SUBMISSION_BUCKET).upload(storagePath, bytes, { contentType: "application/zip", upsert: false });
  if (storageError) throw new AttemptError("File storage is unavailable right now. Your files are saved in the workspace; try submitting again in a minute.", 503);
  const { error: uploadError } = await db.from("eng_uploads").insert({
    id: uploadId,
    attempt_id: attempt.id,
    status: "initiated",
    storage_path: storagePath,
    original_filename: "workspace.zip",
    byte_size: bytes.length,
    sha256,
    entry_count: files.length,
    uncompressed_bytes: files.reduce((n, f) => n + Buffer.byteLength(f.content, "utf8"), 0),
    file_list: files.map((f) => ({ path: f.path, size: Buffer.byteLength(f.content, "utf8") })),
  });
  if (uploadError) {
    await db.storage.from(SUBMISSION_BUCKET).remove([storagePath]);
    throw new AttemptError("Could not record your files. They are saved in the workspace; try again.", 500);
  }

  const { data, error } = await db
    .from("eng_submissions")
    .insert({
      attempt_id: attempt.id,
      upload_id: uploadId,
      archive_sha256: sha256,
      archive_bytes: bytes.length,
      handoff: input.handoff,
      ai_disclosure: input.aiDisclosure,
      late: window === "late",
      client_submission_id: manifest.clientSubmissionId,
      manifest,
      manifest_sha256: manifestSha256(manifest),
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      await discardSealed(db, uploadId, storagePath, "Another request submitted this attempt first.");
      const { data: raced } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).single();
      await followThrough(db, attempt, raced as SubmissionRow, userId);
      return receiptOf(raced as SubmissionRow, true);
    }
    await discardSealed(db, uploadId, storagePath, "The submission could not be recorded.");
    throw new AttemptError("Could not record the submission. Your files are saved; try again.", 500);
  }
  const submission = data as SubmissionRow;
  await followThrough(db, attempt, submission, userId);
  return receiptOf(submission, false);
}

/**
 * A submission recorded by a request that died before closing the attempt, or
 * before queueing its analysis, is completed on the next load.
 */
async function settleRecordedSubmission(db: Admin, attempt: AttemptRow): Promise<AttemptRow> {
  if (attempt.status !== "in_progress" && attempt.status !== "submitted") return attempt;
  const { data: submission } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).maybeSingle();
  if (!submission) return attempt;
  if (attempt.status === "submitted") {
    const { data: run } = await db.from("eng_evaluation_runs").select("id").eq("submission_id", (submission as SubmissionRow).id).limit(1).maybeSingle();
    if (run) return attempt;
  }
  await followThrough(db, attempt, submission as SubmissionRow, attempt.candidate_user_id);
  const { data: settled } = await db.from("eng_attempts").select("*").eq("id", attempt.id).single();
  return (settled as AttemptRow | null) ?? attempt;
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export function evaluationStatus(run: Pick<RunRow, "status"> | null, released: boolean): AuthoredEvaluationStatus {
  if (released) return "released";
  if (!run) return "pending";
  if (run.status === "human_review" || run.status === "ready") return "awaiting_release";
  if (run.status === "blocked" || run.status === "retryable_failure") return "delayed";
  return "pending";
}

export async function buildAuthoredCandidateView(db: Admin, authored: AuthoredAttempt): Promise<AuthoredCandidateView> {
  const { pkg } = authored;
  const attempt = await settleRecordedSubmission(db, authored.attempt);
  const { data: inv } = await db.from("eng_invitations").select("role_snapshot, is_preview, status, expires_at").eq("id", attempt.invitation_id).single();
  const invitation = inv as Pick<InvitationRow, "role_snapshot" | "is_preview" | "status" | "expires_at">;
  const working = attempt.status === "in_progress";
  const submitted = attempt.status === "submitted";
  const [workspace, publicRuns, submissionRes, runRes, releasedRes] = await Promise.all([
    working ? ensureWorkspace(db, attempt.id, pkg) : submitted ? getWorkspace(db, attempt.id) : Promise.resolve(null),
    publicRunSummary(db, attempt.id),
    working || submitted ? db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).maybeSingle() : Promise.resolve({ data: null }),
    submitted
      ? db.from("eng_evaluation_runs").select("status").eq("attempt_id", attempt.id).neq("status", "canceled").order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    submitted ? db.from("eng_reports").select("id").eq("attempt_id", attempt.id).eq("status", "released").maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const submission = submissionRes.data as SubmissionRow | null;
  const due = effectiveDueAt(attempt);
  const run = runRes.data as Pick<RunRow, "status"> | null;
  const window = submissionWindow(attempt, AUTHORED_GRACE_MINUTES);
  const op = operationalState({
    invitation: { status: invitation.status, expires_at: invitation.expires_at },
    attempt: { status: attempt.status },
    run,
    releasedReport: releasedRes.data ? { status: "released" } : null,
  });
  return {
    kind: "authored",
    serverNow: new Date().toISOString(),
    preview: Boolean(invitation.is_preview),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      consentedAt: attempt.consented_at,
      preflightPassedAt: attempt.preflight_passed_at,
      preflightRuntime: attempt.preflight_runtime,
      startedAt: attempt.started_at,
      dueAt: due ? due.toISOString() : null,
      allowedMinutes: attempt.allowed_minutes,
      extensionMinutes: attempt.extension_minutes,
      submittedAt: attempt.submitted_at,
      window,
    },
    role: {
      title: invitation.role_snapshot.title,
      organizationName: invitation.role_snapshot.organizationName,
      companyContext: invitation.role_snapshot.companyContext,
    },
    task: candidateTask(pkg),
    workspace: workspace ? { ...workspace, filesSha256: filesFingerprint(workspace.files) } : null,
    publicRuns,
    receipt: submission ? receiptOf(submission, true) : null,
    evaluation: submitted ? evaluationStatus(run, Boolean(releasedRes.data)) : "not_submitted",
    lifecycle: sessionLifecycle(op, { audience: "candidate", submissionRecorded: Boolean(submission) && working, windowClosed: working && window === "closed" }),
  };
}
