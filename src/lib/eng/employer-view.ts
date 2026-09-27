import "server-only";
import { requireUser } from "@/lib/simulations/auth";
import { resolveMembership, type Admin, type EngMember } from "./context";
import { listMessages } from "./attempts";
import { submissionFor } from "./evidence";
import { listReports } from "./reports";
import { effectiveDueAt, operationalState, type OperationalState } from "./state";
import type { AttemptRow, InvitationRow, MessageRow, ReportRow, RoleRow, RunRow, SubmissionRow, UploadRow } from "./types";

export async function pageMember(): Promise<EngMember | null> {
  const user = await requireUser();
  if (!user) return null;
  return resolveMembership(user.id, user.email);
}

export interface RoleSummary extends RoleRow {
  invited: number;
  inProgress: number;
  ready: number;
}

export async function listRoleSummaries(db: Admin, organizationId: string): Promise<RoleSummary[]> {
  const { data: roles } = await db.from("eng_roles").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false });
  const { data: invitations } = await db.from("eng_invitations").select("id, role_id, status").eq("organization_id", organizationId);
  const { data: attempts } = await db.from("eng_attempts").select("role_id, status").eq("organization_id", organizationId);
  const { data: released } = await db
    .from("eng_reports")
    .select("attempt_id, eng_attempts!inner(role_id, organization_id)")
    .eq("status", "released")
    .eq("eng_attempts.organization_id", organizationId);
  const readyByRole = new Map<string, number>();
  for (const row of released ?? []) {
    const roleId = (row.eng_attempts as unknown as { role_id: string }).role_id;
    readyByRole.set(roleId, (readyByRole.get(roleId) ?? 0) + 1);
  }
  return ((roles as RoleRow[]) ?? []).map((role) => ({
    ...role,
    invited: (invitations ?? []).filter((i) => i.role_id === role.id && i.status !== "withdrawn").length,
    inProgress: (attempts ?? []).filter((a) => a.role_id === role.id && (a.status === "in_progress" || a.status === "preflight_passed")).length,
    ready: readyByRole.get(role.id) ?? 0,
  }));
}

export interface CandidateRow {
  invitation: InvitationRow;
  attempt: AttemptRow | null;
  run: Pick<RunRow, "id" | "status"> | null;
  state: OperationalState;
  dueAt: string | null;
  late: boolean;
  decision: string | null;
}

export async function listRoleCandidates(db: Admin, role: RoleRow): Promise<CandidateRow[]> {
  const { data: invitations } = await db.from("eng_invitations").select("*").eq("role_id", role.id).order("created_at", { ascending: false });
  const invs = (invitations as InvitationRow[]) ?? [];
  if (invs.length === 0) return [];
  const { data: attempts } = await db.from("eng_attempts").select("*").in("invitation_id", invs.map((i) => i.id));
  const atts = (attempts as AttemptRow[]) ?? [];
  const attemptIds = atts.map((a) => a.id);
  const [runs, reports, submissions, decisions] = attemptIds.length
    ? await Promise.all([
        db.from("eng_evaluation_runs").select("id, attempt_id, status, created_at").in("attempt_id", attemptIds).neq("status", "canceled").order("created_at", { ascending: false }),
        db.from("eng_reports").select("attempt_id, status").in("attempt_id", attemptIds).eq("status", "released"),
        db.from("eng_submissions").select("attempt_id, late").in("attempt_id", attemptIds),
        db.from("eng_decisions").select("attempt_id, decision, created_at").in("attempt_id", attemptIds).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  return invs.map((invitation) => {
    const attempt = atts.find((a) => a.invitation_id === invitation.id) ?? null;
    const run = attempt ? ((runs.data ?? []).find((r) => r.attempt_id === attempt.id) as Pick<RunRow, "id" | "status"> | undefined) ?? null : null;
    const released = attempt ? (reports.data ?? []).some((r) => r.attempt_id === attempt.id) : false;
    const due = attempt ? effectiveDueAt(attempt) : null;
    return {
      invitation,
      attempt,
      run,
      state: operationalState({ invitation, attempt, run, releasedReport: released ? { status: "released" } : null }),
      dueAt: due ? due.toISOString() : null,
      late: attempt ? Boolean((submissions.data ?? []).find((s) => s.attempt_id === attempt.id)?.late) : false,
      decision: attempt ? (((decisions.data ?? []).find((d) => d.attempt_id === attempt.id)?.decision as string) ?? null) : null,
    };
  });
}

export interface TimelineEvent {
  id: string;
  type: string;
  actor: string;
  actorEmail: string | null;
  payload: Record<string, unknown>;
  at: string;
}

export interface OrgAttemptView {
  attempt: AttemptRow;
  invitation: InvitationRow;
  role: RoleRow;
  state: OperationalState;
  dueAt: string | null;
  timeline: TimelineEvent[];
  canSeeEvidence: boolean;
  report: ReportRow | null;
  reportHistory: Pick<ReportRow, "id" | "version" | "status" | "released_at" | "change_reason" | "reviewer_email">[];
  run: Pick<RunRow, "id" | "status" | "results" | "summary" | "executor" | "environment_version" | "suite_version" | "finished_at"> | null;
  submission: SubmissionRow | null;
  files: UploadRow["file_list"];
  messages: MessageRow[];
  decisions: { id: string; decision: string; notes: string; reportVersion: number | null; by: string | null; at: string }[];
  notes: { id: string; body: string; by: string | null; at: string }[];
  flags: { id: string; findingId: string; reason: string; by: string | null; at: string; resolvedAt: string | null }[];
}

async function emailMap(db: Admin, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  const { data } = await db.from("profiles").select("id, email").in("id", unique);
  for (const row of data ?? []) if (row.email) out.set(row.id as string, row.email as string);
  return out;
}

/**
 * Everything an employer page shows for one attempt. Evidence (report, test
 * results, files, thread, handoff) is included only for roles allowed to read
 * reports, and only once a human-checked report has been released.
 */
export async function orgAttemptView(db: Admin, member: EngMember, attempt: AttemptRow, canSeeEvidence: boolean): Promise<OrgAttemptView> {
  const [{ data: inv }, { data: role }, { data: events }, reports] = await Promise.all([
    db.from("eng_invitations").select("*").eq("id", attempt.invitation_id).single(),
    db.from("eng_roles").select("*").eq("id", attempt.role_id).single(),
    db.from("eng_attempt_events").select("id, event_type, actor, actor_email, payload, created_at").eq("attempt_id", attempt.id).order("created_at"),
    listReports(db, attempt.id),
  ]);
  const invitation = inv as InvitationRow;
  const { data: runRow } = await db
    .from("eng_evaluation_runs")
    .select("id, status, results, summary, executor, environment_version, suite_version, finished_at")
    .eq("attempt_id", attempt.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const released = reports.find((r) => r.status === "released") ?? null;
  const visible = canSeeEvidence && released !== null;
  const due = effectiveDueAt(attempt);

  let submission: SubmissionRow | null = null;
  let files: UploadRow["file_list"] = [];
  let messages: MessageRow[] = [];
  if (visible) {
    submission = await submissionFor(db, attempt.id);
    if (submission) {
      const { data: upload } = await db.from("eng_uploads").select("file_list").eq("id", submission.upload_id).single();
      files = ((upload as Pick<UploadRow, "file_list"> | null)?.file_list) ?? [];
    }
    messages = await listMessages(db, attempt.id);
  }

  const [{ data: decisions }, { data: notes }, { data: flags }] = canSeeEvidence
    ? await Promise.all([
        db.from("eng_decisions").select("id, decision, notes, report_id, decided_by, created_at").eq("attempt_id", attempt.id).order("created_at", { ascending: false }),
        db.from("eng_review_notes").select("id, body, author_id, created_at").eq("attempt_id", attempt.id).order("created_at", { ascending: false }),
        db.from("eng_finding_flags").select("id, finding_id, reason, flagged_by, created_at, resolved_at").eq("attempt_id", attempt.id).order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const emails = await emailMap(db, [
    ...(decisions ?? []).map((d) => d.decided_by as string),
    ...(notes ?? []).map((n) => n.author_id as string),
    ...(flags ?? []).map((f) => f.flagged_by as string),
  ]);
  const versionById = new Map(reports.map((r) => [r.id, r.version]));

  return {
    attempt,
    invitation,
    role: role as RoleRow,
    state: operationalState({ invitation, attempt, run: runRow as Pick<RunRow, "status"> | null, releasedReport: released }),
    dueAt: due ? due.toISOString() : null,
    timeline: (events ?? []).map((e) => ({
      id: e.id as string,
      type: e.event_type as string,
      actor: e.actor as string,
      actorEmail: (e.actor_email as string) ?? null,
      payload: (e.payload as Record<string, unknown>) ?? {},
      at: e.created_at as string,
    })),
    canSeeEvidence,
    report: visible ? released : null,
    reportHistory: canSeeEvidence
      ? reports
          .filter((r) => r.status !== "draft")
          .map((r) => ({ id: r.id, version: r.version, status: r.status, released_at: r.released_at, change_reason: r.change_reason, reviewer_email: r.reviewer_email }))
      : [],
    run: visible ? (runRow as OrgAttemptView["run"]) : null,
    submission,
    files,
    messages,
    decisions: (decisions ?? []).map((d) => ({
      id: d.id as string,
      decision: d.decision as string,
      notes: (d.notes as string) ?? "",
      reportVersion: versionById.get(d.report_id as string) ?? null,
      by: emails.get(d.decided_by as string) ?? null,
      at: d.created_at as string,
    })),
    notes: (notes ?? []).map((n) => ({ id: n.id as string, body: n.body as string, by: emails.get(n.author_id as string) ?? null, at: n.created_at as string })),
    flags: (flags ?? []).map((f) => ({
      id: f.id as string,
      findingId: f.finding_id as string,
      reason: f.reason as string,
      by: emails.get(f.flagged_by as string) ?? null,
      at: f.created_at as string,
      resolvedAt: (f.resolved_at as string) ?? null,
    })),
  };
}

export const EVENT_LABELS: Record<string, string> = {
  invitation_accepted: "Candidate accepted the invitation",
  consent_recorded: "Candidate accepted the task terms",
  starter_downloaded: "Starter project downloaded",
  preflight_code_rejected: "Setup code did not match",
  preflight_passed: "Setup check passed",
  attempt_started: "Timer started",
  requirement_update_released: "Requirement update posted",
  requirement_update_acknowledged: "Candidate acknowledged the update",
  deadline_extended: "Deadline extended",
  upload_rejected: "Upload refused by the archive checks",
  upload_accepted: "Upload passed the archive checks",
  submission_accepted: "Submission accepted",
  evaluation_completed: "Trusted checks finished",
  evaluation_retry_scheduled: "Evaluation environment failed; retry scheduled",
  evaluation_lease_reclaimed: "Evaluation worker stopped; another worker took over",
  evaluation_retries_exhausted: "Evaluation retries used up; Fydell is investigating",
  evaluation_blocked: "Evaluation blocked by a platform issue",
  evaluation_requeued: "Evaluation retried by Fydell",
  report_released: "Human-checked report released",
  report_correction_released: "Corrected report released",
  decision_recorded: "Decision recorded",
  finding_flagged: "Finding flagged for review",
  attempt_withdrawn: "Invitation withdrawn",
};
