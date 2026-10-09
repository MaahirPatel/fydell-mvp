/** Helpers shared by scripts/accept-simulation-journeys.ts and its child process. */
import { readFileSync } from "node:fs";
import type { Admin } from "../src/lib/eng/context";
import type { ScenarioPackage } from "../src/lib/eng/authoring/package";
import { recordEngEvent } from "../src/lib/eng/events";
import type { RunRow } from "../src/lib/eng/types";

export const KILL_POINTS = ["after_storage_upload", "after_upload_row", "after_submission_row", "after_attempt_closed", "after_run_queued"] as const;
export type KillPoint = (typeof KILL_POINTS)[number];

/** Mirrors the queue's lease length. */
export const LEASE_MS = 6 * 60000;

/**
 * Loads .env.local without overriding variables already set in the process,
 * so a freshly pulled sandbox token in the shell wins over a stale one in the file.
 */
export function loadEnvLocal(path = ".env.local"): void {
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
}

export function journeyHandoff(pkg: ScenarioPackage): { handoff: Record<string, string>; ai_use: string } {
  return {
    handoff: Object.fromEntries(
      pkg.submission.handoffPrompts.map((p) => [p.id, `Journey answer for ${p.label}: the change keeps the side effect and its record in one transaction, and the public tests cover it.`]),
    ),
    ai_use: "Asked the built-in assistant one question; wrote the change myself.",
  };
}

/**
 * Claims one specific run the way the queue's claimRun does (same fencing on
 * status and attempt_count, same lease), so a journey never picks up runs
 * that belong to other work in the shared development database.
 */
export async function claimRunById(db: Admin, runId: string, workerId: string, now = new Date()): Promise<RunRow | null> {
  const { data } = await db.from("eng_evaluation_runs").select("*").eq("id", runId).maybeSingle();
  const c = data as RunRow | null;
  if (!c) return null;
  const runnable =
    c.status === "queued" ||
    (c.status === "retryable_failure" && (!c.next_retry_at || new Date(c.next_retry_at) <= now)) ||
    (c.status === "running" && Boolean(c.lease_expires_at) && new Date(c.lease_expires_at as string) < now);
  if (!runnable || c.attempt_count >= c.max_attempts) return null;
  const { data: claimed } = await db
    .from("eng_evaluation_runs")
    .update({
      status: "running",
      attempt_count: c.attempt_count + 1,
      lease_owner: workerId,
      lease_expires_at: new Date(now.getTime() + LEASE_MS).toISOString(),
      started_at: c.started_at ?? now.toISOString(),
    })
    .eq("id", c.id)
    .eq("status", c.status)
    .eq("attempt_count", c.attempt_count)
    .select("*")
    .maybeSingle();
  if (claimed && c.status === "running") {
    await recordEngEvent(db, c.attempt_id, { type: "evaluation_lease_reclaimed", actor: "system", payload: { runId: c.id, previousWorker: c.lease_owner } });
  }
  return (claimed as RunRow | null) ?? null;
}
