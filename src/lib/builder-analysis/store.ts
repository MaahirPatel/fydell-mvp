import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ANALYSIS_LIMITS, BUILDER_ANALYSIS_VERSION, type AnalysisRow, type BuilderAnalysisReport } from "./types";

/** A run still marked running after this long was interrupted and is reported as failed. */
const STALE_RUNNING_MS = 10 * 60_000;

type Row = {
  id: string;
  status: AnalysisRow["status"];
  report: BuilderAnalysisReport | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

function toRow(r: Row): AnalysisRow {
  const stale = r.status === "running" && Date.now() - new Date(r.created_at).getTime() > STALE_RUNNING_MS;
  return {
    id: r.id,
    status: stale ? "failed" : r.status,
    report: r.report && r.report.version === BUILDER_ANALYSIS_VERSION ? r.report : null,
    error: stale ? "The analysis was interrupted. Run it again." : r.error,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  };
}

export async function latestAnalysis(ownerId: string): Promise<AnalysisRow | null> {
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .select("id,status,report,error,created_at,completed_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data as Row) : null;
}

/** The newest complete report, used to reuse unchanged repository measurements. */
export async function latestCompleteReport(ownerId: string): Promise<BuilderAnalysisReport | null> {
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .select("id,status,report,error,created_at,completed_at")
    .eq("owner_id", ownerId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data as Row).report : null;
}

export type StartResult =
  | { started: true; id: string }
  | { started: false; reason: "running"; id: string }
  | { started: false; reason: "cooldown"; retryAfterSeconds: number };

/** The cooldown only guards re-reading the same sources; adding or removing one allows a run at once. */
export async function beginAnalysis(ownerId: string, opts: { sourcesChanged: boolean }): Promise<StartResult> {
  const latest = await latestAnalysis(ownerId);
  if (latest?.status === "running") return { started: false, reason: "running", id: latest.id };
  if (latest?.status === "complete" && latest.report && !opts.sourcesChanged) {
    const wait = new Date(latest.createdAt).getTime() + ANALYSIS_LIMITS.cooldownMinutes * 60_000 - Date.now();
    if (wait > 0) return { started: false, reason: "cooldown", retryAfterSeconds: Math.ceil(wait / 1000) };
  }
  const { data, error } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .insert({ owner_id: ownerId, status: "running", analysis_version: BUILDER_ANALYSIS_VERSION })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start the analysis.");
  return { started: true, id: (data as { id: string }).id };
}

export async function completeAnalysis(id: string, report: BuilderAnalysisReport): Promise<void> {
  await createAdminSupabaseClient()
    .from("builder_analyses")
    .update({ status: "complete", report, error: null, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running");
}

export async function failAnalysis(id: string, message: string): Promise<void> {
  await createAdminSupabaseClient()
    .from("builder_analyses")
    .update({ status: "failed", error: message.slice(0, 300), completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running");
}
