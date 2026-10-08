import { readJson, str } from "@/lib/eng/context";
import { errorResponse, ok } from "@/lib/eng/http";
import { orgAttempt } from "@/lib/eng/route-helpers";
import { releaseAuthoredReport } from "@/lib/eng/authored/reports";

/** Releases the automated report for an employer-authored work sample to the candidate. */
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const gate = await orgAttempt((await params).attemptId, "write_reports");
  if (gate.ok === false) return gate.response;
  const body = await readJson(req);
  try {
    const report = await releaseAuthoredReport(gate.value.db, gate.value.attempt, gate.value.member, str(body?.note, 2000));
    return ok({ reportId: report.id, version: report.version });
  } catch (err) {
    return errorResponse(err, "authored-release");
  }
}
