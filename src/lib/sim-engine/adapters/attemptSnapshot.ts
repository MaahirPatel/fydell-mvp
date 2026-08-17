/**
 * Durable attempt snapshot.
 *
 * What a candidate produced has to survive a refresh, a closed laptop and a
 * failed request. Engine instrumentation does not: raw telemetry stays in the
 * session and is never written to a shared product table, so a snapshot carries
 * candidate work and world state only.
 *
 * The snapshot is versioned because a stored shape outlives the code that wrote
 * it. An unrecognised version is refused rather than silently coerced into the
 * current shape, which would fabricate work the candidate never did.
 */
import type { JsonValue, SimulationAttempt } from "../types";

export const DURABLE_SNAPSHOT_VERSION = 1;

/** Everything except `telemetry`, which is intentionally not persisted. */
export type DurableAttemptSnapshot = {
  snapshotVersion: number;
  attempt: Omit<SimulationAttempt, "telemetry">;
};

export function toDurableSnapshot(attempt: SimulationAttempt): DurableAttemptSnapshot {
  // Destructured out rather than deleted so the omission is visible and the
  // compiler enforces it if `SimulationAttempt` gains fields later.
  const { telemetry: _telemetry, ...durable } = attempt;
  return { snapshotVersion: DURABLE_SNAPSHOT_VERSION, attempt: durable };
}

export type SnapshotRestoreResult =
  | { ok: true; attempt: SimulationAttempt }
  | { ok: false; reason: "not_a_snapshot" | "unsupported_version" };

/**
 * Rebuild an attempt from stored JSON. Telemetry restarts empty because it was
 * never persisted; that is honest rather than a gap to paper over.
 */
export function fromDurableSnapshot(value: unknown): SnapshotRestoreResult {
  if (!isRecord(value)) return { ok: false, reason: "not_a_snapshot" };

  const version = value.snapshotVersion;
  const stored = value.attempt;
  if (typeof version !== "number" || !isRecord(stored)) {
    return { ok: false, reason: "not_a_snapshot" };
  }
  if (version !== DURABLE_SNAPSHOT_VERSION) {
    return { ok: false, reason: "unsupported_version" };
  }
  if (typeof stored.id !== "string" || !isRecord(stored.metadata)) {
    return { ok: false, reason: "not_a_snapshot" };
  }

  return {
    ok: true,
    attempt: { ...(stored as unknown as Omit<SimulationAttempt, "telemetry">), telemetry: [] },
  };
}

/** Structured candidate work owned by a surface rather than the core attempt. */
export function readExtras(attempt: SimulationAttempt, key: string): JsonValue | undefined {
  return attempt.extras?.[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
