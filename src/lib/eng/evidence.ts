import "server-only";
import { strFromU8 } from "fflate";
import type { Admin } from "./context";
import { scenarioForVersionId } from "./scenario-versions";
import type { AttemptRow, SubmissionRow, UploadRow } from "./types";
import { loadAcceptedArchive } from "./uploads";

const MAX_VIEW_BYTES = 256 * 1024;

export interface SubmittedFile {
  path: string;
  size: number;
  text: string | null;
  truncated: boolean;
  binary: boolean;
}

export async function submissionFor(db: Admin, attemptId: string): Promise<SubmissionRow | null> {
  const { data } = await db.from("eng_submissions").select("*").eq("attempt_id", attemptId).maybeSingle();
  return (data as SubmissionRow) ?? null;
}

/**
 * Reads one file from the archive the candidate submitted, re-verified against
 * its recorded hash, so reviewers and employers see exactly what was graded.
 */
export async function readSubmittedFile(db: Admin, attempt: AttemptRow, path: string): Promise<SubmittedFile | null> {
  const submission = await submissionFor(db, attempt.id);
  if (!submission) return null;
  const { data: upload } = await db.from("eng_uploads").select("*").eq("id", submission.upload_id).single();
  const { row } = await scenarioForVersionId(db, attempt.scenario_version_id);
  const archive = await loadAcceptedArchive(db, upload as UploadRow, row.scenario_key);
  const bytes = archive.contents.get(path);
  if (!bytes) return null;
  const slice = bytes.subarray(0, MAX_VIEW_BYTES);
  const binary = slice.includes(0);
  return {
    path,
    size: bytes.length,
    text: binary ? null : strFromU8(slice),
    truncated: bytes.length > MAX_VIEW_BYTES,
    binary,
  };
}
