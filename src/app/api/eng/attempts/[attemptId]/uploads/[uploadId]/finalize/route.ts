import { jsonError } from "@/lib/eng/context";
import { errorResponse, isUuid, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";
import { finalizeUpload } from "@/lib/eng/uploads";

export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ attemptId: string; uploadId: string }> }) {
  const { attemptId, uploadId } = await params;
  if (!isUuid(uploadId)) return jsonError(404, "Upload not found.");
  const gate = await candidateAttempt(attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario } = gate.value;
  try {
    const upload = await finalizeUpload(db, attempt, scenario, uploadId);
    return ok({
      upload: {
        id: upload.id,
        status: upload.status,
        original_filename: upload.original_filename,
        byte_size: upload.byte_size,
        sha256: upload.sha256,
        file_list: upload.file_list,
        rejection_code: upload.rejection_code,
        rejection_detail: upload.rejection_detail,
        created_at: upload.created_at,
      },
    });
  } catch (err) {
    return errorResponse(err, "upload-finalize");
  }
}
