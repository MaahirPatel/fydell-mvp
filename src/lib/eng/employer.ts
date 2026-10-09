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
export type CurrentDecision = { id: string; decision: Decision; decidedBy: string | null; createdAt: string };

/** Another reviewer recorded a decision after the one this request was based on. */
export class DecisionConflictError extends Error {
  constructor(readonly current: CurrentDecision | null) {
    super("A teammate recorded a decision since you opened this page. Review theirs before recording yours.");
  }
}

async function latestDecision(db: Admin, attemptId: string): Promise<CurrentDecision | null> {
  const { data } = await db
    .from("eng_decisions")
    .select("id, decision, decided_by, created_at")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id as string, decision: data.decision as Decision, decidedBy: (data.decided_by as string | null) ?? null, createdAt: data.created_at as string } : null;
}

/**
 * `expectedDecisionId` is the latest decision the reviewer saw (null when they
 * saw none). Each new decision names the one it replaces under a unique index,
 * so two reviewers deciding from the same state cannot both succeed.
 */
export async function recordDecision(
  db: Admin,
  member: EngMember,
  attempt: AttemptRow,
  decision: Decision,
  notes: string,
  expectedDecisionId?: string | null,
) {
  if (!DECISIONS.some((d) => d.key === decision)) throw new Error("Choose Advance, Hold or Decline.");
  if (notes.length > 4000) throw new Error("Keep notes under 4,000 characters.");
  const report = await releasedReport(db, attempt.id);
  if (!report) throw new Error("Release the report first. Decisions are recorded against a released report.");
  const latest = await latestDecision(db, attempt.id);
  if (expectedDecisionId !== undefined && (expectedDecisionId ?? null) !== (latest?.id ?? null)) throw new DecisionConflictError(latest);
  const row = {
    attempt_id: attempt.id,
    organization_id: member.organizationId,
    decision,
    notes,
    report_id: report.id,
    decided_by: member.userId,
  };
  let inserted = await db.from("eng_decisions").insert({ ...row, supersedes_key: latest?.id ?? "first" }).select("*").single();
  if (inserted.error?.code === "23505") throw new DecisionConflictError(await latestDecision(db, attempt.id));
  // An environment without migration 081 has no supersedes column; the read check above still applies.
  if (inserted.error && (inserted.error.code === "42703" || inserted.error.code === "PGRST204")) {
    inserted = await db.from("eng_decisions").insert(row).select("*").single();
  }
  const { data, error } = inserted;
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
