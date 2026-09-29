import { jsonError } from "@/lib/eng/context";
import { recordEngEvent } from "@/lib/eng/events";
import { errorResponse } from "@/lib/eng/http";
import { candidateAttempt } from "@/lib/eng/route-helpers";
import { buildStarterArchive } from "@/lib/eng/starter";

export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await candidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, attempt, user } = gate.value;
  if (!attempt.consented_at) return jsonError(409, "Review and accept the task terms before downloading the project.");
  if (attempt.status === "withdrawn" || attempt.status === "expired") return jsonError(409, "This attempt is closed.");
  try {
    const archive = buildStarterArchive();
    await recordEngEvent(db, attempt.id, { type: "starter_downloaded", actor: "candidate", actorUserId: user.id, payload: { sha256: archive.sha256 } });
    return new Response(Buffer.from(archive.bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archive.fileName}"`,
        "Content-Length": String(archive.bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": archive.sha256,
      },
    });
  } catch (err) {
    return errorResponse(err, "starter");
  }
}
