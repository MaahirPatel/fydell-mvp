import { readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";
import { initiateUpload } from "@/lib/eng/uploads";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, scenario } = gate.value;
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
