import "server-only";
import type { Admin } from "./context";
import { listMessages } from "./attempts";
import { submissionFor } from "./evidence";
import { currentRun, listReports } from "./reports";
import type { AttemptRow, InvitationRow, MessageRow, ReportRow, RunRow, SubmissionRow, UploadRow } from "./types";

export interface QueueRow {
  runId: string;
  attemptId: string;
  status: RunRow["status"];
  organizationName: string;
  candidateEmail: string;
  roleTitle: string;
  submittedAt: string | null;
  lastError: string | null;
  attemptCount: number;
  maxAttempts: number;
  reportStatus: "none" | "draft" | "released";
  createdAt: string;
}

/** Newest first. Runs that need a person (review or a platform fault) are what this page is for. */
export async function listReviewQueue(db: Admin): Promise<QueueRow[]> {
  const { data: runs } = await db
    .from("eng_evaluation_runs")
    .select("id, attempt_id, status, attempt_count, max_attempts, last_error_code, created_at")
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(100);
  const list = (runs ?? []) as Pick<RunRow, "id" | "attempt_id" | "status" | "attempt_count" | "max_attempts" | "last_error_code" | "created_at">[];
  if (list.length === 0) return [];
  const attemptIds = [...new Set(list.map((r) => r.attempt_id))];
  const [{ data: attempts }, { data: reports }] = await Promise.all([
    db.from("eng_attempts").select("id, invitation_id, organization_id, submitted_at").in("id", attemptIds),
    db.from("eng_reports").select("attempt_id, status").in("attempt_id", attemptIds).in("status", ["draft", "released"]),
  ]);
  const invIds = (attempts ?? []).map((a) => a.invitation_id as string);
  const orgIds = [...new Set((attempts ?? []).map((a) => a.organization_id as string))];
  const [{ data: invitations }, { data: orgs }] = await Promise.all([
    db.from("eng_invitations").select("id, candidate_email, role_snapshot").in("id", invIds),
    db.from("organizations").select("id, name").in("id", orgIds),
  ]);
  return list.map((run) => {
    const attempt = (attempts ?? []).find((a) => a.id === run.attempt_id);
    const inv = (invitations ?? []).find((i) => i.id === attempt?.invitation_id) as Pick<InvitationRow, "candidate_email" | "role_snapshot"> | undefined;
    const org = (orgs ?? []).find((o) => o.id === attempt?.organization_id);
    const statuses = (reports ?? []).filter((r) => r.attempt_id === run.attempt_id).map((r) => r.status as string);
    return {
      runId: run.id,
      attemptId: run.attempt_id,
      status: run.status,
      organizationName: (org?.name as string) ?? "Unknown workspace",
      candidateEmail: inv?.candidate_email ?? "",
      roleTitle: inv?.role_snapshot.title ?? "",
      submittedAt: (attempt?.submitted_at as string) ?? null,
      lastError: run.last_error_code,
      attemptCount: run.attempt_count,
      maxAttempts: run.max_attempts,
      reportStatus: statuses.includes("released") ? "released" : statuses.includes("draft") ? "draft" : "none",
      createdAt: run.created_at,
    };
  });
}

export interface ReviewerAttemptView {
  attempt: AttemptRow;
  invitation: InvitationRow;
  run: RunRow | null;
  submission: SubmissionRow | null;
  files: UploadRow["file_list"];
  messages: MessageRow[];
  reports: ReportRow[];
  flags: { id: string; findingId: string; reason: string; at: string; resolvedAt: string | null }[];
}

export async function reviewerAttemptView(db: Admin, attempt: AttemptRow): Promise<ReviewerAttemptView> {
  const [{ data: inv }, run, submission, messages, reports, { data: flags }] = await Promise.all([
    db.from("eng_invitations").select("*").eq("id", attempt.invitation_id).single(),
    currentRun(db, attempt.id),
    submissionFor(db, attempt.id),
    listMessages(db, attempt.id),
    listReports(db, attempt.id),
    db.from("eng_finding_flags").select("id, finding_id, reason, created_at, resolved_at").eq("attempt_id", attempt.id).order("created_at", { ascending: false }),
  ]);
  let files: UploadRow["file_list"] = [];
  if (submission) {
    const { data: upload } = await db.from("eng_uploads").select("file_list").eq("id", submission.upload_id).single();
    files = ((upload as Pick<UploadRow, "file_list"> | null)?.file_list) ?? [];
  }
  return {
    attempt,
    invitation: inv as InvitationRow,
    run,
    submission,
    files,
    messages,
    reports,
    flags: (flags ?? []).map((f) => ({
      id: f.id as string,
      findingId: f.finding_id as string,
      reason: f.reason as string,
      at: f.created_at as string,
      resolvedAt: (f.resolved_at as string) ?? null,
    })),
  };
}
