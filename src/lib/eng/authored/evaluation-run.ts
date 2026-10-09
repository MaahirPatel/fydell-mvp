import "server-only";
import type { Admin } from "../context";
import { recordEngEvent } from "../events";
import { asPackage, asProtected, type PackageFile } from "../authoring/package";
import { selectRunner } from "../authoring/runner";
import { failRun } from "../evaluation/queue";
import { downloadArchive } from "../uploads";
import type { ReportBrief, ReportRow, RunRow, ScenarioVersionRow, SubmissionRow, UploadRow } from "../types";
import { sha256Hex, unzipFiles } from "./archive";
import { runAuthoredEvaluation, type MappedEvaluation } from "./evaluate";
import { asManifest, filesMatchManifest, manifestSha256 } from "./manifest";

export const AUTOMATED_REVIEWER = "Automated test evaluation";

export function reportBriefFor(runId: string, evaluation: MappedEvaluation): ReportBrief {
  return {
    summary: evaluation.summary,
    strengths: evaluation.acceptance.filter((a) => a.state === "confirmed").map((a) => `Tests confirmed: ${a.text}`),
    gaps: evaluation.acceptance.filter((a) => a.state === "not_confirmed").map((a) => `Tests did not confirm: ${a.text}`),
    limitations: evaluation.limitations,
    followUps: [],
    dimensions: [],
    authored: {
      evaluationRunId: runId,
      runner: evaluation.runner,
      acceptance: evaluation.acceptance,
      criteria: evaluation.criteria,
      reviewerNote: null,
    },
  };
}

export async function readSubmittedFiles(db: Admin, upload: Pick<UploadRow, "storage_path" | "sha256">): Promise<PackageFile[]> {
  const bytes = await downloadArchive(db, upload.storage_path);
  if (!bytes) throw new Error("archive_missing");
  if (sha256Hex(bytes) !== upload.sha256) throw new Error("archive_hash_mismatch");
  try {
    return unzipFiles(bytes);
  } catch {
    throw new Error("archive_invalid");
  }
}

/** Creates the draft report for this run, or points the existing draft at it. Released versions are never edited. */
async function writeDraftReport(db: Admin, run: RunRow, version: ScenarioVersionRow, brief: ReportBrief): Promise<void> {
  const { data: reports } = await db.from("eng_reports").select("*").eq("attempt_id", run.attempt_id).order("version", { ascending: false });
  const list = (reports as ReportRow[]) ?? [];
  const draft = list.find((r) => r.status === "draft");
  if (draft) {
    await db.from("eng_reports").update({ evaluation_run_id: run.id, brief, findings: [], reviewer_email: AUTOMATED_REVIEWER }).eq("id", draft.id).eq("status", "draft");
    return;
  }
  const released = list.find((r) => r.status === "released");
  const { error } = await db.from("eng_reports").insert({
    attempt_id: run.attempt_id,
    evaluation_run_id: run.id,
    version: (list[0]?.version ?? 0) + 1,
    status: "draft",
    brief,
    findings: [],
    rubric_version: version.rubric_version,
    reviewer_email: AUTOMATED_REVIEWER,
    change_reason: released ? "Re-evaluated against the same tests." : null,
    supersedes_id: released?.id ?? null,
  });
  if (error && error.code !== "23505") throw new Error(`Could not create the report draft: ${error.message}`);
}

/**
 * Evaluates one submission to an employer-authored work sample: the sealed
 * files from storage, overlaid with the public and protected tests, run on
 * the authoring runner. If no runner is available the run is blocked with an
 * operator-visible reason; nothing is recorded as a result.
 */
export async function processAuthoredRun(db: Admin, run: RunRow): Promise<RunRow["status"]> {
  const { data: versionData } = await db.from("eng_scenario_versions").select("*").eq("id", run.scenario_version_id).single();
  const version = versionData as ScenarioVersionRow | null;
  const pkg = version ? asPackage(version.content) : null;
  if (!version || !pkg) return failRun(db, run, "package_unreadable", "The published work-sample package could not be read.", false);
  if (run.harness_sha256 !== version.harness_sha256) return failRun(db, run, "harness_version_mismatch", "The run is pinned to different evaluation tests than the published version.", false);

  const { data: protRow } = await db.from("eng_scenario_version_protected").select("content").eq("version_id", version.id).maybeSingle();
  if (!protRow) return failRun(db, run, "protected_missing", "The evaluation tests for this version are missing.", false);
  const prot = asProtected(protRow.content);

  const { data: submission } = await db.from("eng_submissions").select("*").eq("id", run.submission_id).single();
  const { data: upload } = await db.from("eng_uploads").select("*").eq("id", (submission as SubmissionRow).upload_id).single();
  let files: PackageFile[];
  try {
    files = await readSubmittedFiles(db, upload as UploadRow);
  } catch (error) {
    const code = error instanceof Error ? error.message : "archive_unreadable";
    return failRun(db, run, code, "The stored submission could not be read back and verified.", code === "archive_missing");
  }
  const sub = submission as SubmissionRow;
  const manifest = asManifest(sub.manifest);
  if (sub.manifest_sha256) {
    if (!manifest || manifestSha256(manifest) !== sub.manifest_sha256 || (run.manifest_sha256 && run.manifest_sha256 !== sub.manifest_sha256) || !filesMatchManifest(files, manifest)) {
      return failRun(db, run, "manifest_mismatch", "The stored files do not match the submission manifest. Nothing was evaluated.", false);
    }
  }

  const selection = selectRunner();
  if (selection.ok === false) return failRun(db, run, selection.code, selection.detail, false);

  const outcome = await runAuthoredEvaluation(selection.runner, pkg, prot, files);
  if (outcome.kind === "infrastructure_error") return failRun(db, run, outcome.code, outcome.detail, true);
  const evaluation = outcome.evaluation;

  // The evaluation record and the draft report are written before the run is
  // handed to review, so a crash never leaves a run in review with nothing to
  // review. Both writes are keyed by the run and safe to repeat.
  const { data: held } = await db
    .from("eng_evaluation_runs")
    .select("id")
    .eq("id", run.id)
    .eq("lease_owner", run.lease_owner ?? "")
    .eq("status", "running")
    .maybeSingle();
  if (!held) return "running";

  const { error: evalError } = await db.from("eng_authored_evaluations").insert({
    run_id: run.id,
    attempt_id: run.attempt_id,
    scenario_version_id: version.id,
    runner: evaluation.runner,
    suite: evaluation.suite,
    tests: evaluation.tests,
    acceptance: evaluation.acceptance,
    criteria: evaluation.criteria,
    limitations: evaluation.limitations,
    output: evaluation.output,
  });
  if (evalError && evalError.code !== "23505") {
    return failRun(db, run, "evaluation_record_failed", "The evaluation result could not be stored.", true);
  }
  await writeDraftReport(db, run, version, reportBriefFor(run.id, evaluation));

  const { data: saved } = await db
    .from("eng_evaluation_runs")
    .update({
      status: "human_review",
      results: evaluation.probeResults,
      summary: evaluation.summaryCounts,
      executor: evaluation.runner.name,
      environment_version: evaluation.runner.version,
      finished_at: new Date().toISOString(),
      lease_owner: null,
      lease_expires_at: null,
      last_error_code: null,
      last_error_detail: null,
    })
    .eq("id", run.id)
    .eq("lease_owner", run.lease_owner ?? "")
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (!saved) return "running";

  await recordEngEvent(db, run.attempt_id, {
    type: "evaluation_completed",
    actor: "system",
    payload: { runId: run.id, executor: evaluation.runner.name, isolated: evaluation.runner.isolated, summary: evaluation.summaryCounts },
    clientEventId: `evaluation_completed_${run.id}`,
  });
  return "human_review";
}
