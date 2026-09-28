import "server-only";

/**
 * Idempotency guard for recoverable operations (OPS-07).
 *
 * Worker restarts, desktop disconnects and delayed provider responses must not
 * produce duplicate submissions, double billing, or false candidate failures.
 * Wrap the effectful step: the first call with a key runs it, repeats return
 * the recorded outcome.
 */

export interface IdempotencyRecord<T> {
  key: string;
  outcome: T;
  completedAt: string;
}

export class IdempotencyGuard<T> {
  private records = new Map<string, IdempotencyRecord<T>>();

  /** Runs `effect` once per key; repeats return the original outcome. */
  async run(key: string, effect: () => Promise<T>): Promise<{ outcome: T; duplicate: boolean }> {
    const existing = this.records.get(key);
    if (existing) return { outcome: existing.outcome, duplicate: true };
    const outcome = await effect();
    this.records.set(key, { key, outcome, completedAt: new Date().toISOString() });
    return { outcome, duplicate: false };
  }

  has(key: string): boolean {
    return this.records.has(key);
  }

  size(): number {
    return this.records.size;
  }
}

/** Deterministic idempotency key for a submission attempt. */
export function submissionIdempotencyKey(opts: {
  attemptId: string;
  snapshotHash: string;
}): string {
  return `submit:${opts.attemptId}:${opts.snapshotHash}`;
}
