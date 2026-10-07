import { jsonError, readJson, str } from "@/lib/eng/context";
import { rateLimit } from "@/lib/security/rate-limit";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";
import { initiateUpload } from "@/lib/eng/uploads";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario } = gate.value;
  const rl = rateLimit(`upload:${attempt.id}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return jsonError(429, "Too many uploads for this attempt. Your work is kept; try again later.");
  const body = await readJson(req);
  const fileName = str(body?.fileName, 255);
  const byteSize = typeof body?.byteSize === "number" ? body.byteSize : NaN;
  try {
    const { upload, signedUrl } = await initiateUpload(db, attempt, scenario, { fileName, byteSize });
    return ok({ uploadId: upload.id, signedUrl });
  } catch (err) {
    return errorResponse(err, "upload-initiate");
  }
}
