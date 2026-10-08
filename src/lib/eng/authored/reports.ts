import "server-only";
import type { Admin, EngMember } from "../context";
import { recordEngEvent } from "../events";
import type { ScenarioPackage } from "../authoring/package";
import { ReportError, listReports } from "../reports";
import type { AttemptRow, ReportRow } from "../types";
import { AUTHORED_STATE_LABEL, type AuthoredCandidateReport, type CandidateAcceptanceResult, type EmployerAuthoredEvaluation } from "./types";

type EvaluationRow = {
  run_id: string;
  runner: EmployerAuthoredEvaluation["runner"];
  suite: EmployerAuthoredEvaluation["suite"];
  tests: EmployerAuthoredEvaluation["tests"];
  acceptance: EmployerAuthoredEvaluation["acceptance"];
  criteria: EmployerAuthoredEvaluation["criteria"];
  limitations: string[];
  output: string;
  created_at: string;
};

function toEvaluation(r: EvaluationRow): EmployerAuthoredEvaluation {
  return {
    runId: r.run_id,
    runner: r.runner,
    suite: r.suite,
    tests: r.tests,
    acceptance: r.acceptance,
    criteria: r.criteria,
    limitations: r.limitations,
    output: r.output,
    createdAt: r.created_at,
  };
}

/** Employer-only: includes protected test names and raw output. Never pass this to a candidate view. */
export async function employerEvaluation(db: Admin, attemptId: string, runId?: string): Promise<EmployerAuthoredEvaluation | null> {
  let query = db.from("eng_authored_evaluations").select("*").eq("attempt_id", attemptId);
  if (runId) query = query.eq("run_id", runId);
  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? toEvaluation(data as EvaluationRow) : null;
}

/**
 * The employer releases the automated report to the candidate, optionally
 * with a note. States stay as the tests produced them; a correction is a new
 * evaluation, not an edit.
 */
export async function releaseAuthoredReport(db: Admin, attempt: AttemptRow, member: EngMember, note: string): Promise<ReportRow> {
  const reports = await listReports(db, attempt.id);
  const draft = reports.find((r) => r.status === "draft");
  if (!draft || !draft.brief.authored) throw new ReportError("There is no evaluated report to release yet.", [], 409);
  const { data: run } = await db.from("eng_evaluation_runs").select("id, status").eq("attempt_id", attempt.id).neq("status", "canceled").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run || run.id !== draft.evaluation_run_id) throw new ReportError("The report is not attached to the current evaluation.", [], 409);
  if (run.status !== "human_review" && run.status !== "ready") throw new ReportError("The evaluation has not finished.", [], 409);
  const reviewerNote = note.trim().slice(0, 2000) || null;
  const brief = { ...draft.brief, authored: { ...draft.brief.authored, reviewerNote } };
  const { error: updateError } = await db.from("eng_reports").update({ brief, reviewer_email: member.email }).eq("id", draft.id).eq("status", "draft");
  if (updateError) throw new ReportError(`Could not prepare the report: ${updateError.message}`, [], 500);
  const { error } = await db.rpc("eng_release_report", { p_report_id: draft.id });
  if (error) throw new ReportError(`Could not release the report: ${error.message}`, [], 500);
  await recordEngEvent(db, attempt.id, {
    type: draft.supersedes_id ? "report_correction_released" : "report_released",
    actor: "employer",
    actorUserId: member.userId,
    actorEmail: member.email,
    payload: { reportId: draft.id, version: draft.version, automated: true },
  });
  const { data } = await db.from("eng_reports").select("*").eq("id", draft.id).single();
  return data as ReportRow;
}

/**
 * The candidate's view of a released report. Public test names and outcomes
 * are shown because the tests shipped with the starter; protected tests are
 * reported only as counts under the acceptance criterion they check. No test
 * code, runner output or reference material is read into this object.
 */
export async function buildAuthoredCandidateReport(db: Admin, attempt: AttemptRow, pkg: ScenarioPackage): Promise<AuthoredCandidateReport | null> {
  const { data } = await db.from("eng_reports").select("*").eq("attempt_id", attempt.id).eq("status", "released").maybeSingle();
  const report = data as ReportRow | null;
  const body = report?.brief.authored;
  if (!report || !body) return null;
  const evaluation = await employerEvaluation(db, attempt.id, body.evaluationRunId);
  const publicNames = new Set(pkg.publicTests.map((t) => t.name));
  const acceptance: CandidateAcceptanceResult[] = body.acceptance.map((a) => {
    const mapped = (evaluation?.tests ?? []).filter((t) => t.criterionIds.includes(a.id));
    const publicTests = mapped.filter((t) => t.visibility === "public" && publicNames.has(t.name)).map((t) => ({ name: t.name, outcome: t.outcome }));
    const hidden = mapped.filter((t) => t.visibility === "protected");
    return {
      id: a.id,
      text: a.text,
      state: a.state,
      publicTests,
      evaluationChecks: { passed: hidden.filter((t) => t.outcome === "passed").length, total: hidden.length },
    };
  });
  const rubric = new Map(pkg.rubric.map((r) => [r.id, r]));
  const criteria = body.criteria.map((c) => {
    const r = rubric.get(c.id);
    return {
      id: c.id,
      label: c.label,
      state: c.state,
      stateLabel: c.judgedBy === "reviewer" ? "Not assessed: awaiting reviewer" : AUTHORED_STATE_LABEL[c.state],
      explanation: r?.candidateExplanation ?? "",
      rationale: c.rationale,
      limitations: r?.limitations ?? "",
    };
  });
  return {
    version: report.version,
    releasedAt: report.released_at,
    summary: report.brief.summary,
    reviewerNote: body.reviewerNote,
    acceptance,
    criteria,
    notAssessed: body.criteria.filter((c) => c.state === "not_assessed").map((c) => c.label),
    limitations: report.brief.limitations,
    runner: { label: body.runner.label, isolated: body.runner.isolated },
  };
}
