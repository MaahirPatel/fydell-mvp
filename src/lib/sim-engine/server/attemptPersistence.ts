"use server";

/**
 * Server-authorized persistence for engine attempts.
 *
 * Writes go through the service role because `sim_session_state` grants
 * `authenticated` SELECT only — a candidate can read their own state, but no
 * client may write it directly. Every call re-checks that the session belongs to
 * the caller before touching a row.
 *
 * The engine reuses the existing session-state helpers rather than opening a
 * second write path to the same table, so both systems share one definition of
 * optimistic concurrency. The snapshot is namespaced inside the `workspace`
 * JSON so it cannot collide with the v2 runner's own fields, and no engine
 * telemetry is stored.
 */
import {
  getSessionForCandidate,
  getSessionState,
  saveSessionState,
} from "@/lib/simulations/db";
import { requireUser } from "@/lib/simulations/auth";
import type { DurableAttemptSnapshot } from "../adapters/attemptSnapshot";

/** Namespace for engine state inside the shared `workspace` JSON column. */
const ENGINE_KEY = "engineAttempt";

export type AttemptPersistenceFailure =
  | "unauthenticated"
  | "forbidden"
  | "save_failed"
  | "load_failed";

/**
 * String discriminants rather than a boolean `ok`, because this project compiles
 * with `strict: false` and boolean truthiness does not narrow a union there.
 */
export type SaveAttemptResult =
  | { status: "saved"; revision: number; savedAt: string }
  /** A newer revision exists. The caller reconciles; it must not overwrite. */
  | { status: "conflict"; revision: number; snapshot: unknown }
  | { status: "error"; reason: AttemptPersistenceFailure; detail?: string };

export type LoadAttemptResult =
  | { status: "loaded"; revision: number; snapshot: unknown | null }
  | { status: "error"; reason: AttemptPersistenceFailure; detail?: string };

/**
 * Persist a snapshot against a known base revision. A stale base revision
 * returns a conflict with the server's copy instead of clobbering newer work.
 */
export async function saveEngineAttempt(
  sessionId: string,
  baseRevision: number,
  snapshot: DurableAttemptSnapshot
): Promise<SaveAttemptResult> {
  const user = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  try {
    await getSessionForCandidate(sessionId, user.id);
  } catch (error) {
    return { status: "error", reason: "forbidden", detail: messageOf(error) };
  }

  try {
    const current = await getSessionState(sessionId);
    const result = await saveSessionState(sessionId, baseRevision, {
      workspace: { ...current.workspace, [ENGINE_KEY]: snapshot },
    });

    // `in` rather than `result.ok`, which does not narrow under `strict: false`.
    if ("conflict" in result) {
      return {
        status: "conflict",
        revision: result.conflict.revision,
        snapshot: result.conflict.workspace?.[ENGINE_KEY] ?? null,
      };
    }
    return { status: "saved", revision: result.revision, savedAt: new Date().toISOString() };
  } catch (error) {
    return { status: "error", reason: "save_failed", detail: messageOf(error) };
  }
}

/** Read the stored snapshot and the revision a later save must build on. */
export async function loadEngineAttempt(sessionId: string): Promise<LoadAttemptResult> {
  const user = await requireUser();
  if (!user) return { status: "error", reason: "unauthenticated" };

  try {
    await getSessionForCandidate(sessionId, user.id);
  } catch (error) {
    return { status: "error", reason: "forbidden", detail: messageOf(error) };
  }

  try {
    const state = await getSessionState(sessionId);
    return {
      status: "loaded",
      revision: state.revision,
      snapshot: state.workspace?.[ENGINE_KEY] ?? null,
    };
  } catch (error) {
    return { status: "error", reason: "load_failed", detail: messageOf(error) };
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
