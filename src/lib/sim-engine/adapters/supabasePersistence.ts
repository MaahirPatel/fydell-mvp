/**
 * Supabase-backed attempt persistence.
 *
 * The adapter the contract in `persistence.ts` anticipated. Unlike the
 * localStorage adapter, this is real durability: work survives a closed browser
 * and a different device.
 *
 * Two rules drive the design. A save that did not reach the database must never
 * be reported as saved, so `save` throws rather than resolving quietly. And a
 * stale write must never clobber newer server state, so the adapter tracks the
 * revision it last observed and surfaces a conflict for the caller to reconcile
 * instead of forcing its copy through.
 */
import type { SimulationAttempt } from "../types";
import type { SimulationPersistenceAdapter } from "./persistence";
import { fromDurableSnapshot, toDurableSnapshot } from "./attemptSnapshot";
import { loadEngineAttempt, saveEngineAttempt } from "../server/attemptPersistence";

export type AttemptSaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  /** The server holds newer work. Reconcile before saving again. */
  | { kind: "conflict"; serverRevision: number; serverSnapshot: unknown }
  | { kind: "offline" }
  | { kind: "failed"; reason: string };

export class SupabasePersistenceError extends Error {
  constructor(public readonly state: AttemptSaveState) {
    super(`Attempt save did not persist: ${state.kind}`);
    this.name = "SupabasePersistenceError";
  }
}

export class SupabaseSimulationPersistenceAdapter implements SimulationPersistenceAdapter {
  /** Base revision for the next write. Advanced only by a confirmed save. */
  private revision = 0;

  constructor(private readonly sessionId: string) {}

  /** The revision a subsequent save will build on. */
  getRevision(): number {
    return this.revision;
  }

  /**
   * Adopt the server's revision after the caller has reconciled a conflict.
   * Separate from `persist` so resolving a conflict is always deliberate.
   */
  acceptServerRevision(revision: number): void {
    this.revision = revision;
  }

  /** Throws unless the write reached the database. */
  async save(attempt: SimulationAttempt): Promise<void> {
    const state = await this.persist(attempt);
    if (state.kind !== "saved") throw new SupabasePersistenceError(state);
  }

  /** Reports the outcome instead of throwing, for autosave indicators. */
  async persist(attempt: SimulationAttempt): Promise<AttemptSaveState> {
    if (isOffline()) return { kind: "offline" };

    try {
      const result = await saveEngineAttempt(
        this.sessionId,
        this.revision,
        toDurableSnapshot(attempt)
      );

      if (result.status === "saved") {
        this.revision = result.revision;
        return { kind: "saved", at: result.savedAt };
      }
      if (result.status === "conflict") {
        return {
          kind: "conflict",
          serverRevision: result.revision,
          serverSnapshot: result.snapshot,
        };
      }
      return { kind: "failed", reason: result.reason };
    } catch (error) {
      // A rejected action is indistinguishable from a dropped connection here,
      // so report failure rather than guessing which one it was.
      return { kind: "failed", reason: error instanceof Error ? error.message : "unknown" };
    }
  }

  /**
   * `attemptId` is accepted for interface compatibility; a session addresses
   * exactly one attempt, so the session id is authoritative.
   */
  async load(_attemptId: string): Promise<SimulationAttempt | null> {
    const result = await loadEngineAttempt(this.sessionId);
    if (result.status !== "loaded") return null;

    this.revision = result.revision;
    if (result.snapshot === null || result.snapshot === undefined) return null;

    const restored = fromDurableSnapshot(result.snapshot);
    return restored.ok ? restored.attempt : null;
  }
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
