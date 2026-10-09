import "server-only";
import { randomUUID } from "node:crypto";
import type { Admin } from "../context";
import { validatePackage } from "./checks";
import {
  GenerationError,
  assemble,
  authoringProvider,
  generateBrief,
  generateCode,
  generateTests,
  reconcileRefs,
  repairDraft,
  stagesFromPackage,
  type BriefStage,
  type CodeStage,
  type TestsStage,
} from "./generate";
import { asPackage, asProtected, bumpSections, packageSha256, type ProtectedMaterials, type ScenarioPackage, type SectionKey } from "./package";
import type { AuthoringConfig } from "./registry";
import { selectRunner } from "./runner";

export type JobKind = "generate" | "test";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type StageStatus = "pending" | "running" | "done" | "kept" | "waiting" | "failed";
export type JobStage = { id: string; label: string; status: StageStatus; note?: string; startedAt?: string; finishedAt?: string };

/** "kept" means the stage was not rerun because a scoped regeneration preserved that part of the draft. */
export const GENERATE_STAGES: Array<{ id: GenStageId; label: string }> = [
  { id: "prepare", label: "Preparing context" },
  { id: "starter", label: "Building starter project" },
  { id: "tests", label: "Creating tests" },
  { id: "check", label: "Checking environment" },
  { id: "assemble", label: "Assembling draft" },
];
export const TEST_STAGES: Array<{ id: TestStageId; label: string }> = [
  { id: "environment", label: "Preparing environment" },
  { id: "run", label: "Running starter, reference and incorrect solutions" },
  { id: "record", label: "Recording results" },
];
type GenStageId = "prepare" | "starter" | "tests" | "check" | "assemble";
type TestStageId = "environment" | "run" | "record";

export type RegenerateScope = "all" | "starter" | "tests";

export type GenerateCheckpoint = {
  scope: RegenerateScope;
  config: AuthoringConfig;
  brief?: BriefStage;
  code?: CodeStage;
  tests?: TestsStage;
  repairs?: number;
  model?: string;
};

export type JobRow = {
  id: string;
  draft_id: string;
  organization_id: string;
  kind: JobKind;
  draft_revision: number;
  status: JobStatus;
  stages: JobStage[];
  checkpoint: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  error_code: string | null;
  error_detail: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

const LEASE_MS = 4 * 60_000;
/** Leave headroom under the route's maxDuration (300s). */
const TIME_BUDGET_MS = 230_000;
const MAX_REPAIRS = 2;

export class AuthoringError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function initialStages(kind: JobKind, scope: RegenerateScope = "all"): JobStage[] {
  if (kind === "test") return TEST_STAGES.map((s) => ({ ...s, status: "pending" }));
  const keptUntil = scope === "tests" ? 2 : scope === "starter" ? 1 : 0;
  return GENERATE_STAGES.map((s, i) => ({ ...s, status: i < keptUntil ? "kept" : "pending" }));
}

export async function enqueueJob(
  db: Admin,
  args: { draftId: string; organizationId: string; kind: JobKind; revision: number; requestedBy: string; checkpoint: Record<string, unknown>; scope?: RegenerateScope },
): Promise<JobRow> {
  const { data, error } = await db
    .from("eng_authoring_jobs")
    .insert({
      draft_id: args.draftId,
      organization_id: args.organizationId,
      kind: args.kind,
      draft_revision: args.revision,
      status: "queued",
      stages: initialStages(args.kind, args.scope),
      checkpoint: args.checkpoint,
      requested_by: args.requestedBy,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new AuthoringError(409, args.kind === "generate" ? "A draft is already being generated." : "Tests are already running for this draft.");
    throw new Error(`Could not queue job: ${error.message}`);
  }
  return data as JobRow;
}

export async function liveJob(db: Admin, draftId: string, kind?: JobKind): Promise<JobRow | null> {
  let q = db.from("eng_authoring_jobs").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }).limit(1);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q.maybeSingle();
  return (data as JobRow | null) ?? null;
}

/** True when nobody holds the job and it is due: queued past its back-off, or running with an expired lease. */
export function isClaimable(job: JobRow, now = Date.now()): boolean {
  const due = !job.lease_expires_at || new Date(job.lease_expires_at).getTime() < now;
  return (job.status === "queued" || job.status === "running") && due;
}

/** Resumes up to `limit` due authoring jobs, oldest first. Used by the scheduled worker. */
export async function processDueJobs(db: Admin, limit: number): Promise<{ attempted: number }> {
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("eng_authoring_jobs")
    .select("id")
    .in("status", ["queued", "running"])
    .or(`lease_expires_at.is.null,lease_expires_at.lt.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(limit);
  const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  for (const id of ids) await processJob(db, id);
  return { attempted: ids.length };
}

/**
 * Every graceful exit clears lease_owner, and the time budget is shorter than
 * the lease, so a job still "running" under an expired lease means its worker
 * was killed (timeout, out of memory, deploy). That counts as an attempt; once
 * max_attempts is reached the job fails visibly instead of being reclaimed
 * forever. The claim is a compare-and-set on the previous owner.
 */
async function claim(db: Admin, jobId: string, owner: string): Promise<JobRow | null> {
  const nowIso = new Date().toISOString();
  const { data: current } = await db
    .from("eng_authoring_jobs")
    .select("status, lease_owner, lease_expires_at, attempt_count, max_attempts, stages")
    .eq("id", jobId)
    .maybeSingle();
  if (!current || (current.status !== "queued" && current.status !== "running")) return null;
  if (current.lease_expires_at && (current.lease_expires_at as string) >= nowIso) return null;
  const priorOwner = (current.lease_owner as string | null) ?? null;
  const workerLost = current.status === "running" && priorOwner !== null;
  const attempts = (current.attempt_count as number) + (workerLost ? 1 : 0);

  if (workerLost && attempts >= (current.max_attempts as number)) {
    const stages = current.stages as JobStage[];
    const running = stages.find((s) => s.status === "running" || s.status === "waiting")?.id;
    const detail = "The worker running this job stopped responding several times. Start the job again.";
    await db
      .from("eng_authoring_jobs")
      .update({
        status: "failed",
        attempt_count: attempts,
        lease_owner: null,
        lease_expires_at: null,
        error_code: "worker_lost",
        error_detail: detail,
        finished_at: nowIso,
        updated_at: nowIso,
        stages: running ? setStage(stages, running, "failed", detail) : stages,
      })
      .eq("id", jobId)
      .eq("status", "running")
      .eq("lease_owner", priorOwner);
    return null;
  }

  let update = db
    .from("eng_authoring_jobs")
    .update({ status: "running", lease_owner: owner, lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(), attempt_count: attempts, updated_at: nowIso })
    .eq("id", jobId)
    .in("status", ["queued", "running"])
    .or(`lease_expires_at.is.null,lease_expires_at.lt.${nowIso}`);
  update = priorOwner ? update.eq("lease_owner", priorOwner) : update.is("lease_owner", null);
  const { data } = await update.select("*").maybeSingle();
  if (!data) return null;
  const job = data as JobRow;
  if (!job.started_at) await db.from("eng_authoring_jobs").update({ started_at: nowIso }).eq("id", jobId);
  return job;
}

async function save(db: Admin, job: JobRow, owner: string, patch: Partial<JobRow>): Promise<void> {
  const { error } = await db
    .from("eng_authoring_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("lease_owner", owner);
  if (error) throw new Error(`Could not save job: ${error.message}`);
}

function setStage(stages: JobStage[], id: string, status: StageStatus, note?: string): JobStage[] {
  const now = new Date().toISOString();
  return stages.map((s) =>
    s.id === id
      ? { ...s, status, note, startedAt: status === "running" ? s.startedAt ?? now : s.startedAt, finishedAt: status === "done" || status === "failed" ? now : undefined }
      : s,
  );
}

async function loadDraft(db: Admin, draftId: string): Promise<{ revision: number; pkg: ScenarioPackage | null; prot: ProtectedMaterials; status: string }> {
  const [{ data: d }, { data: p }] = await Promise.all([
    db.from("eng_scenario_drafts").select("revision, package, status").eq("id", draftId).single(),
    db.from("eng_scenario_draft_protected").select("content").eq("draft_id", draftId).maybeSingle(),
  ]);
  if (!d) throw new AuthoringError(404, "Draft not found.");
  return { revision: d.revision as number, pkg: asPackage(d.package), prot: asProtected(p?.content), status: d.status as string };
}

/** Stores a validation record for the exact draft revision it ran against. */
export async function recordValidation(
  db: Admin,
  args: { draftId: string; organizationId: string; revision: number; pkg: ScenarioPackage; prot: ProtectedMaterials; ranBy: string | null },
) {
  const runner = selectRunner();
  const record = await validatePackage(args.pkg, args.prot, runner.runner, runner.detail);
  const { data, error } = await db
    .from("eng_scenario_validations")
    .insert({
      draft_id: args.draftId,
      organization_id: args.organizationId,
      draft_revision: args.revision,
      package_sha256: record.packageSha256,
      status: record.status,
      checks: record.checks,
      meta: { runner: record.runner, runnerUnavailable: record.runnerUnavailable, sectionRevisions: record.sectionRevisions, ranAt: record.ranAt },
      ran_by: args.ranBy,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not record validation: ${error.message}`);
  await db.from("eng_scenario_drafts").update({ last_validation_id: data.id }).eq("id", args.draftId);
  return { id: data.id as string, record };
}

/**
 * Runs a job until it finishes, its time budget runs out, or the model asks
 * it to back off. Safe to call repeatedly and concurrently: only the lease
 * holder makes progress, and every completed stage is checkpointed.
 */
export async function processJob(db: Admin, jobId: string): Promise<void> {
  const owner = randomUUID();
  const job = await claim(db, jobId, owner);
  if (!job) return;
  const deadline = Date.now() + TIME_BUDGET_MS;
  try {
    if (job.kind === "test") await runTestJob(db, job, owner);
    else await runGenerateJob(db, job, owner, deadline);
  } catch (error) {
    const attempts = job.attempt_count + 1;
    if (error instanceof GenerationError && error.retryable && error.code === "provider_rate_limited") {
      const stage = job.stages.find((s) => s.status === "running")?.id;
      await save(db, job, owner, {
        status: "queued",
        lease_owner: null,
        lease_expires_at: new Date(Date.now() + error.retryAfterMs).toISOString(),
        stages: stage ? setStage(job.stages, stage, "waiting", "Waiting for the model's rate limit. Continues automatically.") : job.stages,
      }).catch(() => undefined);
      return;
    }
    const retryable = (error instanceof GenerationError && error.retryable) || !(error instanceof GenerationError || error instanceof AuthoringError);
    const message = error instanceof GenerationError || error instanceof AuthoringError ? error.message : "The job stopped unexpectedly.";
    const code = error instanceof GenerationError ? error.code : error instanceof AuthoringError ? "authoring_error" : "unexpected";
    if (!(error instanceof GenerationError || error instanceof AuthoringError)) console.error(`[authoring-job] ${job.id}`, error);
    if (retryable && attempts < job.max_attempts) {
      await save(db, job, owner, {
        status: "queued",
        attempt_count: attempts,
        lease_owner: null,
        lease_expires_at: new Date(Date.now() + (error instanceof GenerationError ? error.retryAfterMs || 15_000 : 15_000)).toISOString(),
        error_code: code,
        error_detail: `${message} Retrying (attempt ${attempts + 1} of ${job.max_attempts}).`.slice(0, 600),
      }).catch(() => undefined);
      return;
    }
    const running = job.stages.find((s) => s.status === "running" || s.status === "waiting")?.id;
    await save(db, job, owner, {
      status: "failed",
      attempt_count: attempts,
      lease_owner: null,
      lease_expires_at: null,
      error_code: code,
      error_detail: message.slice(0, 600),
      finished_at: new Date().toISOString(),
      stages: running ? setStage(job.stages, running, "failed", message.slice(0, 200)) : job.stages,
    }).catch(() => undefined);
  }
}

async function runGenerateJob(db: Admin, job: JobRow, owner: string, deadline: number): Promise<void> {
  const cp = job.checkpoint as unknown as GenerateCheckpoint;
  const config = cp.config;
  let stages = job.stages;
  const provider = authoringProvider();
  if (!provider) throw new GenerationError("provider_unavailable", "No generation model is configured on the server. Upload starter files instead, or configure a model.", false);
  const model = provider.label;
  let repairNote: string | null = null;

  const step = async (id: GenStageId, fn: () => Promise<Partial<GenerateCheckpoint>>, note?: () => string) => {
    const current = stages.find((s) => s.id === id);
    if (!current || current.status === "done" || current.status === "kept") return;
    if (Date.now() > deadline) throw new TimeBudget();
    stages = setStage(stages, id, "running");
    job.stages = stages;
    await save(db, job, owner, { stages, lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString() });
    const patch = await fn();
    Object.assign(cp, patch);
    stages = setStage(stages, id, "done", note?.());
    job.stages = stages;
    await save(db, job, owner, { stages, checkpoint: cp as unknown as Record<string, unknown>, error_code: null, error_detail: null });
  };

  try {
    await step("prepare", async () => ({ brief: await generateBrief(config), model }), () => `${cp.brief?.acceptanceCriteria.length ?? 0} acceptance criteria`);
    await step("starter", async () => ({ code: await generateCode(config, cp.brief!) }), () => `${cp.code?.starterFiles.length ?? 0} starter files`);
    await step("tests", async () => ({ tests: await generateTests(config, cp.brief!, cp.code!) }), () => `${(cp.tests?.publicTests.tests.length ?? 0) + (cp.tests?.evaluationTests.tests.length ?? 0)} tests, ${cp.tests?.incorrectSolutions.length ?? 0} incorrect solutions`);
    await step(
      "check",
      async () => {
        const runner = selectRunner();
        if (!runner.runner) return { repairs: cp.repairs ?? 0 };
        let code = cp.code!;
        let tests = cp.tests!;
        let repairs = cp.repairs ?? 0;
        for (;;) {
          let { pkg, prot } = assemble(config, cp.brief!, code, tests, model, "generated");
          let rec = await validatePackage(pkg, prot, runner.runner, null);
          const discovered = rec.checks.find((c) => c.id === "reference")?.evidence[0]?.tests ?? [];
          const rc = reconcileRefs(tests, discovered);
          if (rc.dropped.length) {
            tests = rc.tests;
            ({ pkg, prot } = assemble(config, cp.brief!, code, tests, model, "generated"));
            rec = await validatePackage(pkg, prot, runner.runner, null);
          }
          const failing = rec.checks.filter((c) => (c.kind === "execution" || c.id === "test_mapping") && c.status === "failed");
          if (failing.length === 0 || repairs >= MAX_REPAIRS || Date.now() > deadline - 60_000) return { code, tests, repairs };
          let r: Awaited<ReturnType<typeof repairDraft>>;
          try {
            r = await repairDraft(config, cp.brief!, code, tests, failing);
          } catch (error) {
            if (error instanceof GenerationError && error.code === "input_too_large") {
              repairNote = "Automatic repair skipped: the draft is too large for the model's token limit. The failing checks are recorded.";
              return { code, tests, repairs };
            }
            throw error;
          }
          code = r.code;
          tests = r.tests;
          repairs += 1;
          Object.assign(cp, { code, tests, repairs });
          await save(db, job, owner, { checkpoint: cp as unknown as Record<string, unknown>, lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString() });
        }
      },
      () => repairNote ?? (selectRunner().ok ? `${cp.repairs ?? 0} repair round${cp.repairs === 1 ? "" : "s"}` : "Execution unavailable in this environment"),
    );
    await step("assemble", async () => {
      const { pkg: generated, prot } = assemble(config, cp.brief!, cp.code!, cp.tests!, model, "generated");
      const current = await loadDraft(db, job.draft_id);
      if (current.revision !== job.draft_revision) throw new AuthoringError(409, "The draft was edited while generating. Start generation again to use the latest draft.");
      const scopeSections: SectionKey[] = cp.scope === "tests" ? ["tests"] : cp.scope === "starter" ? ["files", "tests"] : ["brief", "files", "tests", "criteria", "coworkers", "policy", "timing"];
      const pkg = current.pkg && cp.scope !== "all" ? bumpSections({ ...generated, provenance: current.pkg.provenance }, scopeSections, "generator") : generated;
      const nextRevision = current.revision + 1;
      const { error } = await db
        .from("eng_scenario_drafts")
        .update({ package: pkg, title: pkg.brief.title.slice(0, 140), revision: nextRevision, status: "draft", updated_at: new Date().toISOString() })
        .eq("id", job.draft_id)
        .eq("revision", current.revision);
      if (error) throw new Error(`Could not save draft: ${error.message}`);
      await db.from("eng_scenario_draft_protected").upsert({ draft_id: job.draft_id, organization_id: job.organization_id, content: prot, updated_at: new Date().toISOString() });
      await recordValidation(db, { draftId: job.draft_id, organizationId: job.organization_id, revision: nextRevision, pkg, prot, ranBy: null });
      return {};
    });
    await save(db, job, owner, { status: "succeeded", lease_owner: null, lease_expires_at: null, finished_at: new Date().toISOString() });
  } catch (error) {
    if (error instanceof TimeBudget) {
      await save(db, job, owner, { status: "queued", lease_owner: null, lease_expires_at: null, stages });
      return;
    }
    throw error;
  }
}

class TimeBudget extends Error {}

async function runTestJob(db: Admin, job: JobRow, owner: string): Promise<void> {
  let stages = setStage(job.stages, "environment", "running");
  await save(db, job, owner, { stages });
  const draft = await loadDraft(db, job.draft_id);
  if (!draft.pkg) throw new AuthoringError(409, "The draft has no package yet.");
  if (draft.revision !== job.draft_revision) throw new AuthoringError(409, "The draft changed after the test run was requested. Run the tests again.");
  const runner = selectRunner();
  stages = setStage(stages, "environment", "done", runner.runner?.info.label ?? runner.detail ?? "");
  stages = setStage(stages, "run", "running");
  await save(db, job, owner, { stages });
  const { record } = await recordValidation(db, { draftId: job.draft_id, organizationId: job.organization_id, revision: draft.revision, pkg: draft.pkg, prot: draft.prot, ranBy: null });
  const failed = record.checks.filter((c) => c.status !== "passed").length;
  stages = setStage(stages, "run", "done", runner.ok ? `${record.checks.filter((c) => c.kind === "execution").length} execution checks ran` : "Execution unavailable");
  stages = setStage(stages, "record", "done", failed ? `${failed} check${failed === 1 ? "" : "s"} need attention` : "All checks passed");
  await save(db, job, owner, { stages, status: "succeeded", lease_owner: null, lease_expires_at: null, finished_at: new Date().toISOString() });
}

export function currentSha(pkg: ScenarioPackage, prot: ProtectedMaterials): string {
  return packageSha256(pkg, prot);
}

export function publicJob(job: JobRow | null) {
  if (!job) return null;
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    stages: job.stages,
    draftRevision: job.draft_revision,
    attempt: job.attempt_count,
    maxAttempts: job.max_attempts,
    error: job.error_detail,
    waitingUntil: job.status === "queued" ? job.lease_expires_at : null,
    createdAt: job.created_at,
    finishedAt: job.finished_at,
  };
}
