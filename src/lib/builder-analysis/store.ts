import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sha256 } from "./hash";
import {
  ANALYSIS_LIMITS,
  BUILDER_ANALYSIS_VERSION,
  READABLE_ANALYSIS_VERSIONS,
  type AnalysisRow,
  type AnalysisVersionSummary,
  type BuilderAnalysisReport,
} from "./types";

/** A run still marked running after this long was interrupted and is reported as failed. */
const STALE_RUNNING_MS = 10 * 60_000;

const COLUMNS = "id,status,report,error,created_at,completed_at,report_hash,supersedes_id";

type Row = {
  id: string;
  status: AnalysisRow["status"];
  report: BuilderAnalysisReport | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
  report_hash: string | null;
  supersedes_id: string | null;
};

const readable = (r: BuilderAnalysisReport | null) =>
  !!r && (READABLE_ANALYSIS_VERSIONS as readonly string[]).includes(r.version);

function isStale(r: Pick<Row, "status" | "created_at">): boolean {
  return r.status === "running" && Date.now() - new Date(r.created_at).getTime() > STALE_RUNNING_MS;
}

function toRow(r: Row): AnalysisRow {
  const stale = isStale(r);
  return {
    id: r.id,
    status: stale ? "failed" : r.status,
    report: readable(r.report) ? r.report : null,
    error: stale ? "The analysis was interrupted. Run it again." : r.error,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    reportHash: r.report_hash,
    supersedesId: r.supersedes_id,
  };
}

export async function latestAnalysis(ownerId: string): Promise<AnalysisRow | null> {
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data as Row) : null;
}

async function latestCompleteRow(ownerId: string): Promise<AnalysisRow | null> {
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .select(COLUMNS)
    .eq("owner_id", ownerId)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toRow(data as Row) : null;
}

/** The newest complete report: the current report, and the source of reusable repository measurements. */
export async function latestCompleteReport(ownerId: string): Promise<BuilderAnalysisReport | null> {
  return (await latestCompleteRow(ownerId))?.report ?? null;
}

/** One stored run of the caller's own. Reading never regenerates anything. */
export async function getAnalysis(ownerId: string, id: string): Promise<AnalysisRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createAdminSupabaseClient().from("builder_analyses").select(COLUMNS).eq("owner_id", ownerId).eq("id", id).maybeSingle();
  return data ? toRow(data as Row) : null;
}

/** Every run, newest first, with which one is current. Failed runs are listed and never replace a good report. */
export async function listAnalysisVersions(ownerId: string, limit = 20): Promise<AnalysisVersionSummary[]> {
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .select("id,status,error,created_at,completed_at,report_hash,input_hash,supersedes_id")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  const rows = (data ?? []) as Array<Omit<Row, "report"> & { input_hash: string | null }>;
  const currentId = rows.find((r) => r.status === "complete")?.id ?? null;
  return rows.map((r) => {
    const stale = isStale(r);
    return {
      id: r.id,
      status: stale ? "failed" : r.status,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      reportHash: r.report_hash,
      inputHash: r.input_hash,
      supersedesId: r.supersedes_id,
      current: r.id === currentId,
      error: stale ? "The analysis was interrupted. Run it again." : r.error,
    };
  });
}

export type StartResult =
  | { started: true; id: string; supersedes: string | null }
  | { started: false; reason: "running"; id: string }
  | { started: false; reason: "cooldown"; retryAfterSeconds: number };

/**
 * Starts a run only when explicitly asked. The cooldown only guards
 * re-reading the same sources; adding or removing one allows a run at once.
 */
export async function beginAnalysis(ownerId: string, opts: { sourcesChanged: boolean }): Promise<StartResult> {
  const latest = await latestAnalysis(ownerId);
  if (latest?.status === "running") return { started: false, reason: "running", id: latest.id };
  if (latest?.status === "complete" && latest.report && !opts.sourcesChanged) {
    const wait = new Date(latest.createdAt).getTime() + ANALYSIS_LIMITS.cooldownMinutes * 60_000 - Date.now();
    if (wait > 0) return { started: false, reason: "cooldown", retryAfterSeconds: Math.ceil(wait / 1000) };
  }
  const supersedes = (await latestCompleteRow(ownerId))?.id ?? null;
  const { data, error } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .insert({ owner_id: ownerId, status: "running", analysis_version: BUILDER_ANALYSIS_VERSION, supersedes_id: supersedes })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start the analysis.");
  return { started: true, id: (data as { id: string }).id, supersedes };
}

/** Records the finished report once. The database refuses any later change to a finished run. */
export async function completeAnalysis(id: string, report: BuilderAnalysisReport): Promise<{ reportHash: string } | null> {
  const reportHash = sha256(report);
  const { data } = await createAdminSupabaseClient()
    .from("builder_analyses")
    .update({
      status: "complete",
      report,
      error: null,
      completed_at: new Date().toISOString(),
      report_hash: reportHash,
      input_hash: report.run?.inputHash ?? null,
      config: report.run?.config ?? null,
    })
    .eq("id", id)
    .eq("status", "running")
    .select("id");
  return (data ?? []).length ? { reportHash } : null;
}

export async function failAnalysis(id: string, message: string): Promise<void> {
  await createAdminSupabaseClient()
    .from("builder_analyses")
    .update({ status: "failed", error: message.slice(0, 300), completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "running");
}
