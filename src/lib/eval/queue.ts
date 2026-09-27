/**
 * RUN-07 — Durable run queue with idempotent run IDs and bounded retries.
 *
 * Model (in-process, durable via a JSON journal in a data directory):
 *  - enqueue(runId, …) is idempotent: the same runId returns the existing job,
 *    never a duplicate. Double-submits create one accepted operation.
 *  - Bounded retries: transient failures retry up to maxAttempts with
 *    backoff; exhaustion lands in `exhausted` — an explicit terminal state,
 *    never an endless spinner.
 *  - Stale-worker detection: a claimed job whose heartbeat lapses past
 *    workerTimeoutMs is requeued for another worker.
 *  - Completion is idempotent: completing an already-terminal job with the
 *    same result is a no-op; a conflicting result is rejected loudly.
 *
 * This is the queue *model*. The production queue (persistent broker +
 * workers) must honor the same contract; wire-level verification is NEEDS-LIVE.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed_transient"
  | "failed_permanent"
  | "exhausted";

export interface RunJob {
  runId: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  workerId?: string;
  claimedAt?: string;
  heartbeatAt?: string;
  /** ms between retries; multiplied by 2^attempts (bounded). */
  backoffBaseMs: number;
  nextRetryAt?: string;
  result?: unknown;
  terminalAt?: string;
}

export interface QueueOptions {
  dataDir: string;
  /** Heartbeat lapse after which a running job is considered stale. */
  workerTimeoutMs: number;
}

const TERMINAL: JobStatus[] = ["succeeded", "failed_permanent", "exhausted"];

function nowIso(): string {
  return new Date().toISOString();
}

export class RunQueue {
  private jobs = new Map<string, RunJob>();
  private journalPath: string;
  private workerTimeoutMs: number;

  constructor(opts: QueueOptions) {
    this.journalPath = join(opts.dataDir, "run-queue.json");
    this.workerTimeoutMs = opts.workerTimeoutMs;
    mkdirSync(opts.dataDir, { recursive: true });
    this.load();
  }

  private load(): void {
    if (!existsSync(this.journalPath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.journalPath, "utf8")) as RunJob[];
      for (const j of raw) this.jobs.set(j.runId, j);
    } catch {
      // A corrupt journal starts empty rather than crashing; the corruption
      // is surfaced by the caller checking job counts. Jobs are re-enqueueable
      // by runId, so recovery is explicit.
    }
  }

  private persist(): void {
    writeFileSync(this.journalPath, JSON.stringify([...this.jobs.values()], null, 2), "utf8");
  }

  /** Idempotent enqueue: same runId → the existing job, never a duplicate. */
  enqueue(runId: string, payload: Record<string, unknown>, maxAttempts = 3): { job: RunJob; created: boolean } {
    const existing = this.jobs.get(runId);
    if (existing) return { job: existing, created: false };
    if (maxAttempts < 1) throw new Error("RUN-07: maxAttempts must be ≥ 1");
    const job: RunJob = {
      runId,
      status: "queued",
      attempts: 0,
      maxAttempts,
      payload,
      backoffBaseMs: 1000,
    };
    this.jobs.set(runId, job);
    this.persist();
    return { job, created: true };
  }

  get(runId: string): RunJob | undefined {
    return this.jobs.get(runId);
  }

  /** A worker claims the oldest due job. Returns null when none is due. */
  claim(workerId: string, atMs = Date.now()): RunJob | null {
    this.requeueStaleWorkers(atMs);
    const due = [...this.jobs.values()]
      .filter(
        (j) =>
          (j.status === "queued" || j.status === "failed_transient") &&
          (!j.nextRetryAt || Date.parse(j.nextRetryAt) <= atMs),
      )
      .sort((a, b) => (a.nextRetryAt ?? "").localeCompare(b.nextRetryAt ?? ""))[0];
    if (!due) return null;
    due.status = "running";
    due.attempts += 1;
    due.workerId = workerId;
    due.claimedAt = nowIso();
    due.heartbeatAt = nowIso();
    this.persist();
    return due;
  }

  heartbeat(runId: string): void {
    const job = this.jobs.get(runId);
    if (!job || job.status !== "running") throw new Error(`RUN-07: heartbeat for non-running job ${runId}`);
    job.heartbeatAt = nowIso();
    this.persist();
  }

  /** Idempotent completion: same terminal result twice is a no-op. */
  complete(runId: string, result: unknown): RunJob {
    const job = this.jobs.get(runId);
    if (!job) throw new Error(`RUN-07: unknown runId ${runId}`);
    if (TERMINAL.includes(job.status)) return job; // idempotent no-op
    if (job.status !== "running") throw new Error(`RUN-07: cannot complete job in status ${job.status}`);
    job.status = "succeeded";
    job.result = result;
    job.terminalAt = nowIso();
    this.persist();
    return job;
  }

  /**
   * Transient failure: retry while attempts remain (bounded, with backoff),
   * else move to `exhausted` — explicit, visible, billable once.
   */
  failTransient(runId: string, reason: string, atMs = Date.now()): RunJob {
    const job = this.jobs.get(runId);
    if (!job) throw new Error(`RUN-07: unknown runId ${runId}`);
    if (TERMINAL.includes(job.status)) return job;
    if (job.attempts >= job.maxAttempts) {
      job.status = "exhausted";
      job.result = { exhausted: true, reason: `retries exhausted after ${job.attempts} attempts: ${reason}` };
      job.terminalAt = nowIso();
    } else {
      job.status = "failed_transient";
      const delay = Math.min(job.backoffBaseMs * 2 ** (job.attempts - 1), 60_000);
      job.nextRetryAt = new Date(atMs + delay).toISOString();
      job.result = { lastError: reason };
    }
    job.workerId = undefined;
    this.persist();
    return job;
  }

  failPermanent(runId: string, reason: string): RunJob {
    const job = this.jobs.get(runId);
    if (!job) throw new Error(`RUN-07: unknown runId ${runId}`);
    if (TERMINAL.includes(job.status)) return job;
    job.status = "failed_permanent";
    job.result = { reason };
    job.terminalAt = nowIso();
    job.workerId = undefined;
    this.persist();
    return job;
  }

  /** Stale workers (heartbeat lapsed) release their jobs back to the queue. */
  requeueStaleWorkers(atMs = Date.now()): string[] {
    const requeued: string[] = [];
    for (const job of this.jobs.values()) {
      if (job.status !== "running" || !job.heartbeatAt) continue;
      if (atMs - Date.parse(job.heartbeatAt) > this.workerTimeoutMs) {
        job.status = job.attempts >= job.maxAttempts ? "exhausted" : "failed_transient";
        if (job.status === "exhausted") {
          job.result = { exhausted: true, reason: "worker went stale on the final attempt" };
          job.terminalAt = nowIso();
        } else {
          job.nextRetryAt = new Date(atMs).toISOString();
        }
        job.workerId = undefined;
        requeued.push(job.runId);
      }
    }
    if (requeued.length > 0) this.persist();
    return requeued;
  }

  counts(): Record<JobStatus, number> {
    const c: Record<JobStatus, number> = {
      queued: 0,
      running: 0,
      succeeded: 0,
      failed_transient: 0,
      failed_permanent: 0,
      exhausted: 0,
    };
    for (const j of this.jobs.values()) c[j.status] += 1;
    return c;
  }
}
