import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { engAdmin } from "@/lib/eng/context";
import { getAttemptForCandidate } from "@/lib/eng/attempts";
import { loadCandidateContext } from "@/lib/eng/candidate-view";
import { buildCandidateReport } from "@/lib/eng/candidate-report";
import type { SimulationReportSummary } from "./contract";
import { parseWorkSampleSummary, workSampleSummary } from "./simulation";
import { UUID, type Failure } from "./ids";

/** Work samples are selected for applications with this key prefix and the passport_work_samples id. */
export const SAMPLE_PREFIX = "sample:";

export type WorkSampleEntry = { id: string; attemptId: string; includedAt: string; summary: SimulationReportSummary };

type Row = { id: string; attempt_id: string; included_at: string; summary: unknown };

function toEntry(r: Row): WorkSampleEntry | null {
  const summary = parseWorkSampleSummary(r.summary);
  return summary ? { id: r.id, attemptId: r.attempt_id, includedAt: r.included_at, summary } : null;
}

/** Work-sample reports the engineer chose to include in their Passport. */
export async function listWorkSamples(ownerId: string): Promise<WorkSampleEntry[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_work_samples")
    .select("id,attempt_id,included_at,summary")
    .eq("owner_id", ownerId)
    .is("removed_at", null)
    .order("included_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as Row[]).map(toEntry).filter((e): e is WorkSampleEntry => e !== null);
}

export async function getWorkSampleRow(ownerId: string, id: string): Promise<WorkSampleEntry | null> {
  if (!UUID.test(id)) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_work_samples")
    .select("id,attempt_id,included_at,summary")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .is("removed_at", null)
    .maybeSingle();
  return data ? toEntry(data as Row) : null;
}

export type IncludableReport = { attemptId: string; title: string; releasedAt: string | null };

/** Submitted attempts with a released report that are not yet in the Passport. */
export async function listIncludableReports(ownerId: string): Promise<IncludableReport[]> {
  const db = engAdmin();
  const { data: attempts } = await db
    .from("eng_attempts")
    .select("id")
    .eq("candidate_user_id", ownerId)
    .eq("status", "submitted")
    .eq("is_preview", false)
    .order("submitted_at", { ascending: false })
    .limit(10);
  const ids = ((attempts ?? []) as Array<{ id: string }>).map((a) => a.id);
  if (ids.length === 0) return [];
  const included = new Set((await listWorkSamples(ownerId)).map((s) => s.attemptId));
  const { data: reports } = await db.from("eng_reports").select("attempt_id,released_at").in("attempt_id", ids).eq("status", "released");
  const released = new Map(((reports ?? []) as Array<{ attempt_id: string; released_at: string | null }>).map((r) => [r.attempt_id, r.released_at]));
  const out: IncludableReport[] = [];
  for (const id of ids) {
    if (included.has(id) || !released.has(id)) continue;
    try {
      const row = await getAttemptForCandidate(db, id, ownerId);
      const { scenario } = await loadCandidateContext(db, row);
      out.push({ attemptId: id, title: scenario.title, releasedAt: released.get(id) ?? null });
    } catch {
      continue;
    }
  }
  return out;
}

/** Adds the candidate-visible part of a released report. Idempotent per attempt. */
export async function includeWorkSample(ownerId: string, attemptId: string): Promise<{ ok: true; entry: WorkSampleEntry } | Failure> {
  const db = engAdmin();
  let summary: SimulationReportSummary;
  let reportId: string;
  try {
    const row = await getAttemptForCandidate(db, attemptId, ownerId);
    const { attempt, scenario } = await loadCandidateContext(db, row);
    const report = await buildCandidateReport(db, attempt, scenario);
    if (!report) return { ok: false, status: 409, error: "This work sample has no released report yet." };
    const { data: released } = await db.from("eng_reports").select("id").eq("attempt_id", attempt.id).eq("status", "released").maybeSingle();
    if (!released) return { ok: false, status: 409, error: "This work sample has no released report yet." };
    reportId = (released as { id: string }).id;
    summary = workSampleSummary(attempt.id, scenario.title, report);
  } catch {
    return { ok: false, status: 404, error: "That work sample was not found." };
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("passport_work_samples")
    .insert({ owner_id: ownerId, attempt_id: attemptId, report_id: reportId, summary })
    .select("id,attempt_id,included_at,summary")
    .single();
  if (data) {
    const entry = toEntry(data as Row);
    if (entry) return { ok: true, entry };
  }
  if (error?.code === "23505") {
    const existing = (await listWorkSamples(ownerId)).find((s) => s.attemptId === attemptId);
    if (existing) return { ok: true, entry: existing };
  }
  return { ok: false, status: 500, error: "Could not add the work sample. Try again." };
}

/** Removes it from the Passport and from future applications. Applications already sent keep their pinned version until revoked. */
export async function removeWorkSample(ownerId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("passport_work_samples")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .is("removed_at", null)
    .select("id");
  return (data ?? []).length > 0;
}
