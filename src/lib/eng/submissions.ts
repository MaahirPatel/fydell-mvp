import "server-only";
import type { Admin } from "./context";
import { AttemptError } from "./attempts";
import { recordEngEvent } from "./events";
import type { ScenarioDefinition } from "./scenarios/types";
import { submissionWindow } from "./state";
import { enqueueEvaluation } from "./evaluation/queue";
import type { AttemptRow, Handoff, RunRow, SubmissionRow, UploadRow } from "./types";

export interface Receipt {
  attemptId: string;
  submissionId: string;
  archiveSha256: string;
  archiveBytes: number;
  submittedAt: string;
  late: boolean;
  processing: RunRow["status"] | "not_queued";
  alreadySubmitted: boolean;
}

export function validateHandoff(body: Record<string, unknown>): { ok: true; handoff: Handoff; aiDisclosure: string } | { ok: false; error: string } {
  const field = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() : "");
  const handoff: Handoff = {
    what_changed: field("what_changed"),
    testing: field("testing"),
    risks: field("risks"),
    next_steps: field("next_steps"),
  };
  for (const [key, value] of Object.entries(handoff)) {
    if (value.length > 8000) return { ok: false, error: `Keep "${key.replace("_", " ")}" under 8,000 characters.` };
  }
  if (!handoff.what_changed) return { ok: false, error: "Describe what you changed before submitting." };
  const aiDisclosure = field("ai_use");
  if (aiDisclosure.length > 4000) return { ok: false, error: "Keep the AI assistance note under 4,000 characters." };
  return { ok: true, handoff, aiDisclosure };
}

async function receiptFor(db: Admin, submission: SubmissionRow, alreadySubmitted: boolean): Promise<Receipt> {
  const { data: run } = await db
    .from("eng_evaluation_runs")
    .select("status")
    .eq("submission_id", submission.id)
    .neq("status", "canceled")
    .maybeSingle();
  return {
    attemptId: submission.attempt_id,
    submissionId: submission.id,
    archiveSha256: submission.archive_sha256,
    archiveBytes: submission.archive_bytes,
    submittedAt: submission.submitted_at,
    late: submission.late,
    processing: (run?.status as RunRow["status"]) ?? "not_queued",
    alreadySubmitted,
  };
}

export async function getReceipt(db: Admin, attemptId: string): Promise<Receipt | null> {
  const { data } = await db.from("eng_submissions").select("*").eq("attempt_id", attemptId).maybeSingle();
  return data ? receiptFor(db, data as SubmissionRow, true) : null;
}

/**
 * One accepted operation per attempt: the unique constraint on attempt_id makes
 * double clicks and retries return the original receipt.
 */
export async function submitAttempt(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  input: { uploadId: string; handoff: Handoff; aiDisclosure: string },
  userId: string
): Promise<Receipt> {
  const { data: existing } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).maybeSingle();
  if (existing) return receiptFor(db, existing as SubmissionRow, true);

  if (attempt.status !== "in_progress") throw new AttemptError("This attempt is not open for submission.", 409);
  const window = submissionWindow(attempt, scenario.submissionGraceMinutes);
  if (window === "closed") throw new AttemptError("The submission window has closed. Contact the employer if you need an extension.", 409);

  const { data: uploadRow } = await db.from("eng_uploads").select("*").eq("id", input.uploadId).eq("attempt_id", attempt.id).maybeSingle();
  const upload = uploadRow as UploadRow | null;
  if (!upload) throw new AttemptError("Upload not found for this attempt.", 404);
  if (upload.status !== "accepted" || !upload.sha256 || !upload.byte_size) {
    throw new AttemptError("Upload an archive that passed the checks before submitting.", 409);
  }

  const { data, error } = await db
    .from("eng_submissions")
    .insert({
      attempt_id: attempt.id,
      upload_id: upload.id,
      archive_sha256: upload.sha256,
      archive_bytes: upload.byte_size,
      handoff: input.handoff,
      ai_disclosure: input.aiDisclosure,
      late: window === "late",
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: raced } = await db.from("eng_submissions").select("*").eq("attempt_id", attempt.id).single();
      return receiptFor(db, raced as SubmissionRow, true);
    }
    throw new AttemptError("Could not record the submission. Your archive is saved; try again.", 500);
  }
  const submission = data as SubmissionRow;
  await db.from("eng_attempts").update({ status: "submitted", submitted_at: submission.submitted_at }).eq("id", attempt.id).eq("status", "in_progress");
  await recordEngEvent(db, attempt.id, {
    type: "submission_accepted",
    actor: "candidate",
    actorUserId: userId,
    payload: { submissionId: submission.id, sha256: submission.archive_sha256, late: submission.late },
    clientEventId: "submission_accepted",
  });
  await enqueueEvaluation(db, submission, attempt.scenario_version_id);
  return receiptFor(db, submission, false);
}
