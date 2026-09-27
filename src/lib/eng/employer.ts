import "server-only";
import type { Admin, EngMember } from "./context";
import { recordEngEvent } from "./events";
import { releasedReport } from "./reports";
import type { AttemptRow, Decision } from "./types";

export const DECISIONS: { key: Decision; label: string }[] = [
  { key: "advance", label: "Advance" },
  { key: "hold", label: "Hold" },
  { key: "decline", label: "Decline" },
];

/**
 * Records a human decision. It never sends anything to the candidate; telling
 * them is a separate, deliberate step outside this action.
 */
export async function recordDecision(db: Admin, member: EngMember, attempt: AttemptRow, decision: Decision, notes: string) {
  if (!DECISIONS.some((d) => d.key === decision)) throw new Error("Choose Advance, Hold or Decline.");
  if (notes.length > 4000) throw new Error("Keep notes under 4,000 characters.");
  const report = await releasedReport(db, attempt.id);
  if (!report) throw new Error("A decision can be recorded once the human-checked report is released.");
  const { data, error } = await db
    .from("eng_decisions")
    .insert({
      attempt_id: attempt.id,
      organization_id: member.organizationId,
      decision,
      notes,
      report_id: report.id,
      decided_by: member.userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not record the decision: ${error.message}`);
  await recordEngEvent(db, attempt.id, {
    type: "decision_recorded",
    actor: "employer",
    actorUserId: member.userId,
    actorEmail: member.email,
    payload: { decision, reportVersion: report.version, candidateNotified: false },
  });
  return data;
}

export async function addNote(db: Admin, member: EngMember, attempt: AttemptRow, body: string) {
  const text = body.trim();
  if (!text || text.length > 4000) throw new Error("Notes must be between 1 and 4,000 characters.");
  const { data, error } = await db
    .from("eng_review_notes")
    .insert({ attempt_id: attempt.id, organization_id: member.organizationId, author_id: member.userId, body: text })
    .select("*")
    .single();
  if (error) throw new Error(`Could not save the note: ${error.message}`);
  return data;
}

export async function flagFinding(db: Admin, member: EngMember, attempt: AttemptRow, findingId: string, reason: string) {
  const report = await releasedReport(db, attempt.id);
  if (!report) throw new Error("There is no released report to flag.");
  if (!report.findings.some((f) => f.id === findingId)) throw new Error("That finding is not in the current report.");
  const text = reason.trim();
  if (!text || text.length > 2000) throw new Error("Explain the problem in up to 2,000 characters.");
  const { data, error } = await db
    .from("eng_finding_flags")
    .insert({
      report_id: report.id,
      attempt_id: attempt.id,
      organization_id: member.organizationId,
      finding_id: findingId,
      reason: text,
      flagged_by: member.userId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`Could not flag the finding: ${error.message}`);
  await recordEngEvent(db, attempt.id, {
    type: "finding_flagged",
    actor: "employer",
    actorUserId: member.userId,
    actorEmail: member.email,
    payload: { reportId: report.id, findingId },
  });
  return data;
}
