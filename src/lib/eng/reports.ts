import "server-only";
import type { Admin } from "./context";
import { lineCount, validateForRelease, type EvidenceIndex } from "./citations";
import { recordEngEvent } from "./events";
import { scenarioForVersionId } from "./scenario-versions";
import type { AttemptRow, Finding, ReportBrief, ReportRow, RunRow, SubmissionRow, UploadRow } from "./types";
import { loadAcceptedArchive } from "./uploads";

export class ReportError extends Error {
  constructor(message: string, readonly problems: string[] = [], readonly status = 400) {
    super(message);
  }
}

export async function currentRun(db: Admin, attemptId: string): Promise<RunRow | null> {
  const { data } = await db
    .from("eng_evaluation_runs")
    .select("*")
    .eq("attempt_id", attemptId)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as RunRow) ?? null;
}

export async function listReports(db: Admin, attemptId: string): Promise<ReportRow[]> {
  const { data } = await db.from("eng_reports").select("*").eq("attempt_id", attemptId).order("version", { ascending: false });
  return (data as ReportRow[]) ?? [];
}

export async function releasedReport(db: Admin, attemptId: string): Promise<ReportRow | null> {
  const { data } = await db.from("eng_reports").select("*").eq("attempt_id", attemptId).eq("status", "released").maybeSingle();
  return (data as ReportRow) ?? null;
}

export async function buildEvidenceIndex(db: Admin, attempt: AttemptRow, run: RunRow): Promise<{ index: EvidenceIndex; files: Map<string, Uint8Array> }> {
  const { data: submission } = await db.from("eng_submissions").select("*").eq("id", run.submission_id).single();
  const { data: upload } = await db.from("eng_uploads").select("*").eq("id", (submission as SubmissionRow).upload_id).single();
  const { row } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const archive = await loadAcceptedArchive(db, upload as UploadRow, row.scenario_key);
  const files = new Map<string, number>();
  for (const [path, bytes] of archive.contents) files.set(path, lineCount(bytes));
  const { data: messages } = await db.from("eng_messages").select("id").eq("attempt_id", attempt.id);
  const handoff = (submission as SubmissionRow).handoff;
  const handoffFields = new Set(Object.entries(handoff).filter(([, v]) => typeof v === "string" && v.trim()).map(([k]) => k));
  if ((submission as SubmissionRow).ai_disclosure.trim()) handoffFields.add("ai_use");
  return {
    index: {
      files,
      probes: new Map((run.results ?? []).map((r) => [r.id, r.outcome])),
      messageIds: new Set((messages ?? []).map((m) => m.id as string)),
      handoffFields,
    },
    files: archive.contents,
  };
}

/** Creates or updates the single working draft for an attempt. */
export async function saveReportDraft(
  db: Admin,
  attempt: AttemptRow,
  reviewerEmail: string,
  input: { brief: ReportBrief; findings: Finding[]; changeReason: string | null; reviewMinutes: number | null }
): Promise<ReportRow> {
  const run = await currentRun(db, attempt.id);
  if (!run || (run.status !== "human_review" && run.status !== "ready")) {
    throw new ReportError("Reports can be written only after the evaluation has finished.", [], 409);
  }
  const { row } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const reports = await listReports(db, attempt.id);
  const draft = reports.find((r) => r.status === "draft");
  const patch = {
    brief: input.brief,
    findings: input.findings,
    reviewer_email: reviewerEmail,
    change_reason: input.changeReason,
    review_minutes: input.reviewMinutes,
  };
  if (draft) {
    const { data, error } = await db.from("eng_reports").update(patch).eq("id", draft.id).eq("status", "draft").select("*").single();
    if (error) throw new ReportError(`Could not save the draft: ${error.message}`, [], 500);
    return data as ReportRow;
  }
  const latestReleased = reports.find((r) => r.status === "released");
  const { data, error } = await db
    .from("eng_reports")
    .insert({
      ...patch,
      attempt_id: attempt.id,
      evaluation_run_id: run.id,
      version: (reports[0]?.version ?? 0) + 1,
      status: "draft",
      rubric_version: row.rubric_version,
      supersedes_id: latestReleased?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw new ReportError(`Could not create the draft: ${error.message}`, [], 500);
  return data as ReportRow;
}

export async function releaseReport(db: Admin, attempt: AttemptRow, reviewerEmail: string): Promise<ReportRow> {
  const reports = await listReports(db, attempt.id);
  const draft = reports.find((r) => r.status === "draft");
  if (!draft) throw new ReportError("There is no draft to release.", [], 409);
  const run = await currentRun(db, attempt.id);
  if (!run || run.id !== draft.evaluation_run_id) throw new ReportError("The draft is not attached to the current evaluation.", [], 409);
  if (draft.supersedes_id && !draft.change_reason?.trim()) {
    throw new ReportError("Explain what changed in this corrected version before releasing it.", ["A change reason is required for corrections."]);
  }
  const { index } = await buildEvidenceIndex(db, attempt, run);
  const problems = validateForRelease(draft.brief, draft.findings, index);
  if (problems.length > 0) throw new ReportError("The report cannot be released yet.", problems, 422);

  const { error } = await db.rpc("eng_release_report", { p_report_id: draft.id });
  if (error) throw new ReportError(`Could not release the report: ${error.message}`, [], 500);
  await recordEngEvent(db, attempt.id, {
    type: draft.supersedes_id ? "report_correction_released" : "report_released",
    actor: "reviewer",
    actorEmail: reviewerEmail,
    payload: { reportId: draft.id, version: draft.version, changeReason: draft.change_reason },
  });
  const { data } = await db.from("eng_reports").select("*").eq("id", draft.id).single();
  return data as ReportRow;
}
