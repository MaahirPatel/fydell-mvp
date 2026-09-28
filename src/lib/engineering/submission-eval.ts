/**
 * Evaluation of a submitted engineering attempt, and its report projection.
 *
 * The evaluation runs against the files stored in the immutable submission
 * row (UP-05), never against live workspace state, and is idempotent per
 * (submission, snapshot hash, suite version). Report data keeps
 * deterministic test results separate from interpretive analysis (AI-01,
 * REP-03), and states what practice runs do and do not show (WORK-08).
 */

import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { runEvaluation } from "./run";
import { engineeringRunDeps, engineeringScenarioForTemplate } from "./session";
import type { StoredRun } from "./store";
import type { EngineeringRunResult } from "./types";

interface SessionRow {
  id: string;
  template_id: string;
  curveball_presented_at: string | null;
}

function submittedFiles(snapshot: unknown): Record<string, string> | null {
  const s = snapshot as {
    fileSnapshot?: { files?: Record<string, string> };
    workspace?: { files?: Record<string, string> };
  } | null;
  const files = s?.fileSnapshot?.files ?? s?.workspace?.files;
  if (!files || typeof files !== "object") return null;
  return Object.values(files).every((v) => typeof v === "string") && Object.keys(files).length > 0 ? files : null;
}

export type SubmissionEvaluationOutcome =
  | { kind: "not_engineering" }
  | { kind: "no_files"; reason: string }
  | { kind: "evaluated"; runId: string; reused: boolean; result: EngineeringRunResult | null };

export async function evaluateSubmittedSession(sessionId: string): Promise<SubmissionEvaluationOutcome> {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("sim_sessions")
    .select("id, template_id, curveball_presented_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) throw new Error("Session not found");
  const scenarioId = await engineeringScenarioForTemplate((session as SessionRow).template_id);
  if (!scenarioId) return { kind: "not_engineering" };

  const { data: submission } = await admin
    .from("sim_submissions")
    .select("id, snapshot")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!submission) throw new Error("Session has not been submitted");
  const files = submittedFiles(submission.snapshot);
  if (!files) {
    return { kind: "no_files", reason: "No code files were included in the submission, so nothing could be tested." };
  }

  const presented = Boolean((session as SessionRow).curveball_presented_at);
  const deps = await engineeringRunDeps(scenarioId);
  const outcome = await runEvaluation(deps, {
    sessionId,
    submissionId: submission.id as string,
    files,
    updatePresented: () => presented,
  });
  return { kind: "evaluated", ...outcome };
}

export interface EngineeringReport {
  scenarioId: string;
  evaluation:
    | { state: "pending" }
    | { state: "no_files"; reason: string }
    | { state: "finished"; runId: string; completedAt: string | null; result: EngineeringRunResult };
  practice: {
    runCount: number;
    lastRunAt: string | null;
    /** Whether the exact submitted snapshot was run by the candidate before submitting. */
    submittedVersionWasRun: boolean;
    note: string;
  };
}

export async function engineeringReportFor(sessionId: string, templateId: string): Promise<EngineeringReport | null> {
  const scenarioId = await engineeringScenarioForTemplate(templateId);
  if (!scenarioId) return null;
  const deps = await engineeringRunDeps(scenarioId);
  const [evaluations, practice] = await Promise.all([
    deps.store.listRuns(sessionId, "evaluation", 5),
    deps.store.listRuns(sessionId, "practice", 200),
  ]);

  // Prefer a trustworthy finished run; fall back to the latest record.
  const finished = evaluations.find((r) => r.status === "completed") ??
    evaluations.find((r) => r.status !== "running") ??
    null;
  let evaluation: EngineeringReport["evaluation"];
  if (finished && finished.result) {
    evaluation = { state: "finished", runId: finished.id, completedAt: finished.completedAt, result: finished.result };
  } else {
    const admin = createAdminSupabaseClient();
    const { data: submission } = await admin.from("sim_submissions").select("snapshot").eq("session_id", sessionId).maybeSingle();
    evaluation =
      submission && !submittedFiles(submission.snapshot)
        ? { state: "no_files", reason: "No code files were included in the submission, so nothing could be tested." }
        : { state: "pending" };
  }

  const evaluatedHash = finished?.candidateSnapshotHash ?? null;
  const ran = (r: StoredRun) => r.status === "completed" || r.status === "indeterminate";
  const submittedVersionWasRun = Boolean(evaluatedHash && practice.some((r) => ran(r) && r.candidateSnapshotHash === evaluatedHash));
  return {
    scenarioId,
    evaluation,
    practice: {
      runCount: practice.filter(ran).length,
      lastRunAt: practice.find(ran)?.createdAt ?? null,
      submittedVersionWasRun,
      note:
        "Practice runs show that tests were run in the workspace and on which saved version. They do not show whether the candidate read or understood the results, and runs done outside Fydell are not visible.",
    },
  };
}
