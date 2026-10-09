import "server-only";
import { requireUser } from "@/lib/simulations/auth";
import { resolveMembership, type Admin, type EngMember } from "./context";
import { listMessages } from "./attempts";
import { candidateIdentity } from "./candidate-label";
import { submissionFor } from "./evidence";
import { listReports } from "./reports";
import { AUTOMATED_REVIEWER } from "./authored/evaluation-run";
import { namesByEmail, namesById } from "./people";
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
  const { data: invitations } = await db.from("eng_invitations").select("id, role_id, status").eq("organization_id", organizationId).eq("is_preview", false);
  const { data: attempts } = await db.from("eng_attempts").select("role_id, status").eq("organization_id", organizationId).eq("is_preview", false);
  const { data: released } = await db
    .from("eng_reports")
    .select("attempt_id, eng_attempts!inner(role_id, organization_id, is_preview)")
    .eq("status", "released")
    .eq("eng_attempts.organization_id", organizationId)
    .eq("eng_attempts.is_preview", false);
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

export interface TeamQueueItem {
  attemptId: string;
  candidate: string;
  roleTitle: string;
  waitingOn: TeamQueueAction;
  since: string;
}

/**
 * What the hiring team has to do next, most urgent first:
 * technical: the trusted test run failed for platform reasons; retry it (never the candidate's fault).
 * response: the candidate responded to the released report and nobody has resolved it.
 * review: results are ready and nobody has started the report.
 * continue_review: a reviewer has started (a team note or an edited draft) but the report is not released.
 * decision / hold: the report is released and there is no final decision.
 */
export type TeamQueueAction = "technical" | "response" | "review" | "continue_review" | "decision" | "hold";

export const TEAM_QUEUE_ACTION_LABEL: Record<TeamQueueAction, string> = {
  technical: "Resolve technical issue",
  response: "Read response",
  review: "Review submission",
  continue_review: "Continue review",
  decision: "Record decision",
  hold: "On hold: record a final decision",
};

const TECHNICAL_RUN_STATES = new Set(["retryable_failure", "blocked", "failed", "permanent_failure"]);
const REVIEWABLE_RUN_STATES = new Set(["human_review", "ready"]);

/**
 * Submitted engineering attempts waiting on the hiring team. Attempts whose
 * tests are still running are left out (nobody can act yet), as are previews.
 */
export async function listTeamQueue(db: Admin, organizationId: string, limit = 8): Promise<TeamQueueItem[]> {
  const { data: attempts } = await db
    .from("eng_attempts")
    .select("id, role_id, invitation_id, submitted_at")
    .eq("organization_id", organizationId)
    .eq("is_preview", false)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .limit(200);
  const rows = (attempts ?? []) as { id: string; role_id: string; invitation_id: string; submitted_at: string | null }[];
  if (rows.length === 0) return [];
  const ids = rows.map((a) => a.id);
  const [{ data: reports }, { data: drafts }, { data: notes }, { data: decisions }, { data: invitations }, { data: roles }, { data: runs }, { data: responses }] = await Promise.all([
    db.from("eng_reports").select("attempt_id, released_at").in("attempt_id", ids).eq("status", "released"),
    db.from("eng_reports").select("attempt_id, created_at").in("attempt_id", ids).eq("status", "draft").neq("reviewer_email", AUTOMATED_REVIEWER),
    db.from("eng_review_notes").select("attempt_id, created_at").in("attempt_id", ids).order("created_at", { ascending: true }),
    db.from("eng_decisions").select("attempt_id, decision, created_at").in("attempt_id", ids).order("created_at", { ascending: false }),
    db.from("eng_invitations").select("id, candidate_name, candidate_email, candidate_handle").in("id", rows.map((a) => a.invitation_id)),
    db.from("eng_roles").select("id, title").in("id", [...new Set(rows.map((a) => a.role_id))]),
    db.from("eng_evaluation_runs").select("attempt_id, status, created_at").in("attempt_id", ids).neq("status", "canceled").order("created_at", { ascending: false }),
    db.from("eng_report_responses").select("attempt_id, created_at").in("attempt_id", ids).eq("status", "open").order("created_at", { ascending: true }),
  ]);
  const releasedAt = new Map<string, string>();
  for (const r of reports ?? []) {
    const prev = releasedAt.get(r.attempt_id as string);
    const at = (r.released_at as string | null) ?? "";
    if (!prev || at > prev) releasedAt.set(r.attempt_id as string, at);
  }
  const draftAt = new Map<string, string>();
  for (const d of [...(drafts ?? []), ...(notes ?? [])]) if (!draftAt.has(d.attempt_id as string)) draftAt.set(d.attempt_id as string, d.created_at as string);
  const latestRun = new Map<string, { status: string; at: string }>();
  for (const r of runs ?? []) if (!latestRun.has(r.attempt_id as string)) latestRun.set(r.attempt_id as string, { status: r.status as string, at: r.created_at as string });
  const openResponse = new Map<string, string>();
  for (const r of responses ?? []) if (!openResponse.has(r.attempt_id as string)) openResponse.set(r.attempt_id as string, r.created_at as string);
  const latestDecision = new Map<string, { decision: string; at: string }>();
  for (const d of decisions ?? []) {
    if (!latestDecision.has(d.attempt_id as string)) latestDecision.set(d.attempt_id as string, { decision: d.decision as string, at: d.created_at as string });
  }
  const invById = new Map((invitations ?? []).map((i) => [i.id as string, i as Pick<InvitationRow, "candidate_name" | "candidate_email" | "candidate_handle">]));
  const roleTitle = new Map((roles ?? []).map((r) => [r.id as string, r.title as string]));
  const out: TeamQueueItem[] = [];
  for (const a of rows) {
    const decision = latestDecision.get(a.id);
    const released = releasedAt.get(a.id);
    const run = latestRun.get(a.id);
    const response = openResponse.get(a.id);
    let next: { waitingOn: TeamQueueAction; since: string } | null = null;
    if (released === undefined && run && TECHNICAL_RUN_STATES.has(run.status)) next = { waitingOn: "technical", since: run.at };
    else if (released !== undefined && response) next = { waitingOn: "response", since: response };
    else if (released !== undefined) {
      if (!decision) next = { waitingOn: "decision", since: released };
      else if (decision.decision === "hold") next = { waitingOn: "hold", since: decision.at };
    } else if (draftAt.has(a.id)) next = { waitingOn: "continue_review", since: draftAt.get(a.id) ?? a.submitted_at ?? "" };
    else if (!run || REVIEWABLE_RUN_STATES.has(run.status)) next = { waitingOn: "review", since: a.submitted_at ?? "" };
    if (!next) continue;
    const inv = invById.get(a.invitation_id);
    out.push({
      attemptId: a.id,
      candidate: inv ? candidateIdentity(inv).primary : "Candidate",
      roleTitle: roleTitle.get(a.role_id) ?? "Role",
      ...next,
    });
  }
  return out.sort((x, y) => x.since.localeCompare(y.since)).slice(0, limit);
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
  draft: ReportRow | null;
  reportHistory: Pick<ReportRow, "id" | "version" | "status" | "released_at" | "change_reason" | "reviewer_email">[];
  run: Pick<
    RunRow,
    "id" | "status" | "results" | "summary" | "executor" | "environment_version" | "suite_version" | "finished_at" | "last_error_code" | "last_error_detail"
  > | null;
  submission: SubmissionRow | null;
  files: UploadRow["file_list"];
  messages: MessageRow[];
  decisions: { id: string; decision: string; notes: string; reportVersion: number | null; by: string | null; at: string }[];
  notes: { id: string; body: string; by: string | null; at: string }[];
  flags: { id: string; findingId: string; reason: string; by: string | null; at: string; resolvedAt: string | null }[];
  /** Display name for each reviewer email on this attempt's reports, falling back to the email. */
  reviewerNames: Record<string, string>;
}

/**
 * Everything an employer page shows for one attempt. Evidence (test results,
 * files, thread, handoff) is included only for roles allowed to read reports,
 * and only once the trusted tests have finished, because those same people
 * write and release the report.
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
    .select("id, status, results, summary, executor, environment_version, suite_version, finished_at, last_error_code, last_error_detail")
    .eq("attempt_id", attempt.id)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const released = reports.find((r) => r.status === "released") ?? null;
  const testsFinished = runRow?.status === "human_review" || runRow?.status === "ready";
  const visible = canSeeEvidence && (released !== null || testsFinished);
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
  const [names, reviewerNames] = await Promise.all([
    namesById(db, [
      ...(decisions ?? []).map((d) => d.decided_by as string),
      ...(notes ?? []).map((n) => n.author_id as string),
      ...(flags ?? []).map((f) => f.flagged_by as string),
    ]),
    canSeeEvidence ? namesByEmail(db, reports.map((r) => r.reviewer_email)) : Promise.resolve({}),
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
    report: canSeeEvidence ? released : null,
    draft: canSeeEvidence ? reports.find((r) => r.status === "draft") ?? null : null,
    reportHistory: canSeeEvidence
      ? reports
          .filter((r) => r.status !== "draft")
          .map((r) => ({ id: r.id, version: r.version, status: r.status, released_at: r.released_at, change_reason: r.change_reason, reviewer_email: r.reviewer_email }))
      : [],
    run: canSeeEvidence ? (runRow as OrgAttemptView["run"]) : null,
    submission,
    files,
    messages,
    decisions: (decisions ?? []).map((d) => ({
      id: d.id as string,
      decision: d.decision as string,
      notes: (d.notes as string) ?? "",
      reportVersion: versionById.get(d.report_id as string) ?? null,
      by: names.get(d.decided_by as string) ?? null,
      at: d.created_at as string,
    })),
    notes: (notes ?? []).map((n) => ({ id: n.id as string, body: n.body as string, by: names.get(n.author_id as string) ?? null, at: n.created_at as string })),
    flags: (flags ?? []).map((f) => ({
      id: f.id as string,
      findingId: f.finding_id as string,
      reason: f.reason as string,
      by: names.get(f.flagged_by as string) ?? null,
      at: f.created_at as string,
      resolvedAt: (f.resolved_at as string) ?? null,
    })),
    reviewerNames,
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
  evaluation_retries_exhausted: "Evaluation retries used up",
  evaluation_blocked: "Evaluation blocked by a platform issue",
  evaluation_requeued: "Tests retried",
  report_released: "Report released",
  report_correction_released: "Corrected report released",
  decision_recorded: "Decision recorded",
  finding_flagged: "Finding flagged for review",
  attempt_withdrawn: "Invitation withdrawn",
  environment_check_run: "Environment check ran",
  public_tests_run: "Public tests ran",
  scenario_event_released: "Scenario update posted to the team thread",
  team_message_sent: "Candidate messaged the team",
  teammate_replied: "Simulated teammate replied",
  assistant_interaction: "Candidate asked the coding assistant",
  assistant_patch_decided: "Candidate decided on an assistant change",
  review_opened: "Candidate opened the review step",
};
