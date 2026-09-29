import { jsonError, readJson, str } from "@/lib/eng/context";
import { parseBrief, parseFindings } from "@/lib/eng/citations";
import { errorResponse, ok } from "@/lib/eng/http";
import { releaseReport, saveReportDraft } from "@/lib/eng/reports";
import { reviewerAttempt } from "@/lib/eng/route-helpers";

type Ctx = { params: Promise<{ attemptId: string }> };

/** Saves the reviewer's working draft. Drafts are never visible to the employer. */
export async function PUT(req: Request, { params }: Ctx) {
  const gate = await reviewerAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, reviewer, attempt } = gate.value;
  const body = await readJson(req);
  if (!body) return jsonError(400, "Missing report.");
  const brief = parseBrief(body.brief);
  if (brief.ok === false) return jsonError(400, brief.error);
  const findings = parseFindings(body.findings);
  if (findings.ok === false) return jsonError(400, findings.error);
  const changeReason = str(body.changeReason, 1000) || null;
  const reviewMinutes =
    typeof body.reviewMinutes === "number" && Number.isInteger(body.reviewMinutes) && body.reviewMinutes > 0 && body.reviewMinutes < 600
      ? body.reviewMinutes
      : null;
  try {
    const report = await saveReportDraft(db, attempt, reviewer.email, {
      brief: brief.brief,
      findings: findings.findings,
      changeReason,
      reviewMinutes,
    });
    return ok({ report });
  } catch (err) {
    return errorResponse(err, "report-draft");
  }
}

/** Releases the draft after every citation is checked against the submitted evidence. */
export async function POST(_req: Request, { params }: Ctx) {
  const gate = await reviewerAttempt((await params).attemptId);
  if (gate.ok === false) return gate.response;
  const { db, reviewer, attempt } = gate.value;
  try {
    const report = await releaseReport(db, attempt, reviewer.email);
    return ok({ report });
  } catch (err) {
    return errorResponse(err, "report-release");
  }
}
