import { jsonError } from "@/lib/eng/context";
import { recordEngEvent } from "@/lib/eng/events";
import { errorResponse } from "@/lib/eng/http";
import { sha256Hex, zipFiles } from "@/lib/eng/authored/archive";
import { authoredCandidateAttempt } from "@/lib/eng/authored/route-helpers";

/** The starter project as published, zipped. Available once the candidate has accepted the terms. */
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await authoredCandidateAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, user, authored } = gate.value;
  const { attempt, pkg } = authored;
  if (!attempt.consented_at) return jsonError(409, "Review and accept the task terms before downloading the project.");
  if (attempt.status === "withdrawn" || attempt.status === "expired") return jsonError(409, "This attempt is closed.");
  try {
    const bytes = zipFiles(pkg.starterFiles);
    const sha256 = sha256Hex(bytes);
    await recordEngEvent(db, attempt.id, { type: "starter_downloaded", actor: "candidate", actorUserId: user.id, payload: { sha256 } });
    const name = pkg.brief.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "starter";
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${name}-starter.zip"`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-SHA256": sha256,
      },
    });
  } catch (err) {
    return errorResponse(err, "authored-starter");
  }
}
