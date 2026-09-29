import "server-only";
import { createHash, randomUUID } from "crypto";
import type { Admin } from "./context";
import { AttemptError } from "./attempts";
import { recordEngEvent } from "./events";
import type { ScenarioDefinition } from "./scenarios/types";
import { submissionWindow } from "./state";
import type { AttemptRow, UploadRow } from "./types";
import { inspectArchive, ZIP_LIMITS, type ZipAccepted, type ZipRejection } from "./zip";

export const SUBMISSION_BUCKET = "eng-submissions";
const MAX_UPLOADS_PER_ATTEMPT = 25;

export async function initiateUpload(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  input: { fileName: string; byteSize: number }
): Promise<{ upload: UploadRow; signedUrl: string }> {
  if (attempt.status !== "in_progress") throw new AttemptError("Uploads open once the task has started and close after you submit.", 409);
  if (submissionWindow(attempt, scenario.submissionGraceMinutes) === "closed") {
    throw new AttemptError("The submission window has closed. Contact the employer if you need an extension.", 409);
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize <= 0) throw new AttemptError("The file is empty.");
  if (input.byteSize > ZIP_LIMITS.maxArchiveBytes) {
    throw new AttemptError("The archive is larger than 5 MB. Leave out virtual environments, caches and build output.", 413);
  }
  const { count } = await db.from("eng_uploads").select("id", { count: "exact", head: true }).eq("attempt_id", attempt.id);
  if ((count ?? 0) >= MAX_UPLOADS_PER_ATTEMPT) {
    throw new AttemptError("Too many upload attempts for this task. Contact support so we can help.", 429);
  }
  const id = randomUUID();
  const storagePath = `attempts/${attempt.id}/${id}.zip`;
  const { data, error } = await db
    .from("eng_uploads")
    .insert({
      id,
      attempt_id: attempt.id,
      status: "initiated",
      storage_path: storagePath,
      original_filename: input.fileName.slice(0, 255) || null,
      byte_size: Math.round(input.byteSize),
    })
    .select("*")
    .single();
  if (error) throw new AttemptError("Could not start the upload. Try again.", 500);
  const { data: signed, error: signError } = await db.storage.from(SUBMISSION_BUCKET).createSignedUploadUrl(storagePath);
  if (signError || !signed) {
    await db.from("eng_uploads").update({ status: "failed", rejection_code: "storage_unavailable", rejection_detail: "Storage did not issue an upload URL." }).eq("id", id);
    throw new AttemptError("File storage is unavailable right now. Your work is not lost; try again in a minute.", 503);
  }
  return { upload: data as UploadRow, signedUrl: signed.signedUrl };
}

export async function downloadArchive(db: Admin, storagePath: string): Promise<Uint8Array | null> {
  const { data, error } = await db.storage.from(SUBMISSION_BUCKET).download(storagePath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Validates what actually landed in storage, never what the browser claims.
 * An interrupted upload ends as `failed` and can never be submitted.
 */
export async function finalizeUpload(
  db: Admin,
  attempt: AttemptRow,
  scenario: ScenarioDefinition,
  uploadId: string
): Promise<UploadRow> {
  const { data: row } = await db.from("eng_uploads").select("*").eq("id", uploadId).eq("attempt_id", attempt.id).maybeSingle();
  if (!row) throw new AttemptError("Upload not found.", 404);
  const upload = row as UploadRow;
  if (upload.status === "accepted" || upload.status === "rejected") return upload;

  const { data: claimed } = await db
    .from("eng_uploads")
    .update({ status: "validating" })
    .eq("id", upload.id)
    .in("status", ["initiated", "failed"])
    .select("*")
    .maybeSingle();
  if (!claimed) {
    const { data: current } = await db.from("eng_uploads").select("*").eq("id", upload.id).single();
    return current as UploadRow;
  }

  const bytes = await downloadArchive(db, upload.storage_path);
  if (!bytes) {
    const { data } = await db
      .from("eng_uploads")
      .update({ status: "failed", rejection_code: "upload_incomplete", rejection_detail: "The file did not finish uploading. Upload it again." })
      .eq("id", upload.id)
      .select("*")
      .single();
    return data as UploadRow;
  }

  const result: ZipAccepted | ZipRejection = inspectArchive(bytes, scenario.key);
  const now = new Date().toISOString();
  if (result.ok === false) {
    const { data } = await db
      .from("eng_uploads")
      .update({
        status: "rejected",
        byte_size: bytes.length,
        sha256: sha256Hex(bytes),
        rejection_code: result.code,
        rejection_detail: result.path ? `${result.message} (${result.path})` : result.message,
        validated_at: now,
      })
      .eq("id", upload.id)
      .select("*")
      .single();
    await recordEngEvent(db, attempt.id, { type: "upload_rejected", actor: "system", payload: { uploadId: upload.id, code: result.code } });
    return data as UploadRow;
  }

  const sha256 = sha256Hex(bytes);
  const { data } = await db
    .from("eng_uploads")
    .update({
      status: "accepted",
      byte_size: bytes.length,
      sha256,
      entry_count: result.entryCount,
      uncompressed_bytes: result.uncompressedBytes,
      file_list: result.files,
      validated_at: now,
    })
    .eq("id", upload.id)
    .select("*")
    .single();
  await recordEngEvent(db, attempt.id, {
    type: "upload_accepted",
    actor: "system",
    payload: { uploadId: upload.id, sha256, files: result.files.length, ignored: result.ignored.length },
  });
  return data as UploadRow;
}

export async function listUploads(db: Admin, attemptId: string): Promise<UploadRow[]> {
  const { data } = await db.from("eng_uploads").select("*").eq("attempt_id", attemptId).order("created_at", { ascending: false }).limit(10);
  return (data as UploadRow[]) ?? [];
}

/** Re-reads and re-validates the stored bytes, checking them against the recorded hash. */
export async function loadAcceptedArchive(
  db: Admin,
  upload: { storage_path: string; sha256: string | null },
  scenarioKey: string
): Promise<ZipAccepted> {
  const bytes = await downloadArchive(db, upload.storage_path);
  if (!bytes) throw new Error("archive_missing");
  if (sha256Hex(bytes) !== upload.sha256) throw new Error("archive_hash_mismatch");
  const result = inspectArchive(bytes, scenarioKey);
  if (result.ok === false) throw new Error(`archive_invalid:${result.code}`);
  return result;
}
