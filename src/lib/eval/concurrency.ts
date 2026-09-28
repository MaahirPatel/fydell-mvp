/**
 * RUN-09 — Concurrency model (in-process).
 *
 * Drives jobs through the RunQueue with at most `limit` workers active.
 * Each worker must heartbeat to stay alive; a worker that stops
 * heartbeating (crash/hang) has its job recovered via stale-worker
 * detection and retried by a fresh worker — bounded by maxAttempts.
 *
 * This models the *contract*. Real verification — the purchased cohort's
 * expected parallel jobs against the live sandbox, the malicious
 * resource-exhaustion fixture, worker-restart recovery — is NEEDS-LIVE.
 */

import { RunQueue } from "./queue";

export interface ConcurrencyReport {
  limit: number;
  maxObservedConcurrency: number;
  limitRespected: boolean;
  completed: number;
  exhausted: number;
  staleRecovered: string[];
}

/**
 * @param work  one attempt. Must call heartbeat() periodically; a worker
 *              that never heartbeats is treated as crashed/hung.
 */
export async function runWithConcurrency(opts: {
  queue: RunQueue;
  runIds: string[];
  limit: number;
  work: (runId: string, attempt: number, heartbeat: () => void) => Promise<unknown>;
  maxWallMs?: number;
}): Promise<ConcurrencyReport> {
  const { queue, runIds, limit, work } = opts;
  const maxWallMs = opts.maxWallMs ?? 60_000;
  let maxObserved = 0;
  const staleRecovered: string[] = [];
  const pending = new Set(runIds);
  const inFlight = new Map<string, true>();
  const t0 = Date.now();

  while (Date.now() - t0 < maxWallMs) {
    // Recover crashed/hung workers: their slots are gone; retryable jobs requeue.
    for (const r of queue.requeueStaleWorkers()) {
      if (!staleRecovered.includes(r)) staleRecovered.push(r);
      inFlight.delete(r);
      const rej = queue.get(r);
      if (rej && rej.status === "failed_transient") pending.add(r);
    }
    // Fill free worker slots.
    while (inFlight.size < limit) {
      const job = queue.claim(`worker-${inFlight.size}`);
      if (!job) break;
      pending.delete(job.runId);
      inFlight.set(job.runId, true);
      const myClaim = job.claimedAt;
      void (async () => {
        try {
          const result = await work(job.runId, job.attempts, () => {
            try {
              // Only heartbeat our own claim — a stale worker must not keep
              // another worker's job alive.
              if (queue.get(job.runId)?.claimedAt === myClaim) queue.heartbeat(job.runId);
            } catch {
              /* job finished or was requeued — ignore */
            }
          });
          queue.complete(job.runId, result);
        } catch (e) {
          const j = queue.failTransient(job.runId, String(e));
          if (j.status === "failed_transient") pending.add(job.runId);
        } finally {
          inFlight.delete(job.runId);
        }
      })();
    }
    maxObserved = Math.max(maxObserved, inFlight.size);
    const counts = queue.counts();
    const busy =
      inFlight.size > 0 ||
      counts.running > 0 ||
      counts.queued > 0 ||
      counts.failed_transient > 0 ||
      pending.size > 0;
    if (!busy) break;
    await new Promise((r) => setTimeout(r, 10));
  }

  const counts = queue.counts();
  return {
    limit,
    maxObservedConcurrency: maxObserved,
    limitRespected: maxObserved <= limit,
    completed: counts.succeeded,
    exhausted: counts.exhausted,
    staleRecovered,
  };
}
