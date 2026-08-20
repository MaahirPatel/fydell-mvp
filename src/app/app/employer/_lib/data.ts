import "server-only";
/**
 * Org-scoped reads for the employer dashboard. All queries go through the
 * admin client after membership was checked by the caller.
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import {
  isPreviewMode,
  previewInvitations,
  previewMetrics,
  previewNeedsReview,
  previewOperationalSnapshot,
  previewReports,
} from "@/lib/dev/preview";
import { invitationTruth } from "@/lib/contracts/lifecycle";
import { hoursSince, hoursUntil } from "@/lib/time/elapsed";

export const INVITATION_STATUS_LABEL: Record<string, string> = {
  sent: "Invited",
  opened: "Opened",
  accepted: "Accepted",
  started: "In progress",
  completed: "Completed",
  expired: "Expired",
  revoked: "Revoked",
};

const SESSION_PROGRESS_LABEL: Record<string, string> = {
  accepted: "Not started",
  active: "In progress",
  submitted: "Scoring",
  analyzed: "Report ready",
  report_ready: "Report ready",
};

interface AnalysisRunEmbed {
  status: string;
  result: {
    total?: number;
    performance?: number | null;
    bandLabel?: string;
  } | null;
}

interface SessionEmbed {
  id: string;
  status: string;
  submitted_at: string | null;
  sim_analysis_runs: AnalysisRunEmbed[] | AnalysisRunEmbed | null;
}

function first<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function completedRun(
  runs: AnalysisRunEmbed[] | AnalysisRunEmbed | null | undefined
): AnalysisRunEmbed | null {
  const list = Array.isArray(runs) ? runs : runs ? [runs] : [];
  return list.find((r) => r.status === "complete" && r.result) || null;
}

function roleTitleFor(roleKey: string | undefined): string {
  if (!roleKey) return "";
  return ROLE_BY_KEY[roleKey as RoleKey]?.title || roleKey;
}

/** V2 uses `performance`; legacy micro scoring used `total`. */
function scoreFromResult(result: AnalysisRunEmbed["result"]): number | null {
  if (!result) return null;
  if (typeof result.performance === "number") return result.performance;
  if (typeof result.total === "number") return result.total;
  return null;
}

function formatResult(run: AnalysisRunEmbed | null): string | null {
  if (!run?.result) return null;
  const score = scoreFromResult(run.result);
  const { bandLabel } = run.result;
  if (typeof score === "number" && bandLabel) return `${bandLabel} · ${score}/100`;
  if (bandLabel) return bandLabel;
  if (typeof score === "number") return `${score}/100`;
  return null;
}

async function decidedSessionIds(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  sessionIds: string[]
): Promise<Set<string>> {
  if (sessionIds.length === 0) return new Set();
  const { data } = await admin
    .from("sim_employer_decisions")
    .select("session_id")
    .in("session_id", sessionIds);
  return new Set((data || []).map((d) => d.session_id as string));
}

export interface InvitationRecord {
  invitationId: string;
  name: string;
  email: string;
  roleKey: string;
  roleTitle: string;
  simulation: string;
  status: string;
  statusLabel: string;
  progress: string;
  result: string | null;
  sessionId: string | null;
  reportReady: boolean;
  canResend: boolean;
  canRevoke: boolean;
  createdAt: string;
  emailDelivery: string | null;
}

export async function getInvitationRecords(
  organizationId: string,
  limit = 200
): Promise<InvitationRecord[]> {
  if (isPreviewMode()) return previewInvitations(limit);
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_invitations")
    .select(
      "id, candidate_email, candidate_name, status, email_delivery, expires_at, created_at, sim_templates(title, role_key), sim_sessions(id, status, submitted_at, sim_analysis_runs(status, result))"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((inv) => {
    const template = first(
      inv.sim_templates as { title?: string; role_key?: string }[] | { title?: string; role_key?: string } | null
    );
    const session = first(inv.sim_sessions as SessionEmbed[] | SessionEmbed | null);
    const run = completedRun(session?.sim_analysis_runs);

    let status = inv.status as string;
    if (["sent", "opened"].includes(status) && new Date(inv.expires_at) < new Date()) {
      status = "expired";
    }

    const reportReady = Boolean(
      session && ["analyzed", "report_ready"].includes(session.status)
    );

    return {
      invitationId: inv.id,
      name: inv.candidate_name || "",
      email: inv.candidate_email,
      roleKey: template?.role_key || "",
      roleTitle: roleTitleFor(template?.role_key),
      simulation: template?.title || "",
      status,
      statusLabel: invitationTruth({
        status,
        emailDelivery: inv.email_delivery as string | null,
      }).label,
      progress: session
        ? SESSION_PROGRESS_LABEL[session.status] || session.status
        : "Not started",
      result: formatResult(run),
      sessionId: session?.id || null,
      reportReady,
      canResend: ["sent", "opened", "expired"].includes(status),
      canRevoke: ["sent", "opened"].includes(status),
      createdAt: inv.created_at,
      emailDelivery: (inv.email_delivery as string) || null,
    };
  });
}

export interface ReportRecord {
  sessionId: string;
  candidate: string;
  email: string;
  roleKey: string;
  roleTitle: string;
  simulation: string;
  score: number | null;
  bandLabel: string | null;
  completedAt: string | null;
  needsReview: boolean;
}

export async function getReportRecords(
  organizationId: string,
  limit = 300
): Promise<ReportRecord[]> {
  if (isPreviewMode()) return previewReports(limit);
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_sessions")
    .select(
      "id, status, submitted_at, sim_templates(title, role_key), sim_invitations(candidate_email, candidate_name), sim_analysis_runs(status, result)"
    )
    .eq("organization_id", organizationId)
    .in("status", ["analyzed", "report_ready"])
    .order("submitted_at", { ascending: false })
    .limit(limit);

  const sessions = data || [];
  const decided = await decidedSessionIds(
    admin,
    sessions.map((s) => s.id as string)
  );

  return sessions.map((s) => {
    const template = first(
      s.sim_templates as { title?: string; role_key?: string }[] | { title?: string; role_key?: string } | null
    );
    const invitation = first(
      s.sim_invitations as
        | { candidate_email?: string; candidate_name?: string }[]
        | { candidate_email?: string; candidate_name?: string }
        | null
    );
    const run = completedRun(s.sim_analysis_runs as AnalysisRunEmbed[] | AnalysisRunEmbed | null);

    return {
      sessionId: s.id,
      candidate: invitation?.candidate_name || invitation?.candidate_email || "Candidate",
      email: invitation?.candidate_email || "",
      roleKey: template?.role_key || "",
      roleTitle: roleTitleFor(template?.role_key),
      simulation: template?.title || "",
      score: scoreFromResult(run?.result ?? null),
      bandLabel: run?.result?.bandLabel || null,
      completedAt: s.submitted_at,
      needsReview: !decided.has(s.id),
    };
  });
}

export interface OverviewMetrics {
  inProgress: number;
  completed: number;
  reportsReady: number;
  needsReview: number;
}

export async function getOverviewMetrics(organizationId: string): Promise<OverviewMetrics> {
  if (isPreviewMode()) return previewMetrics();
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_sessions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .limit(1000);
  const sessions = data || [];
  const reportReady = sessions.filter((s) =>
    ["analyzed", "report_ready"].includes(s.status)
  );
  const decided = await decidedSessionIds(
    admin,
    reportReady.map((s) => s.id as string)
  );

  return {
    inProgress: sessions.filter((s) => ["accepted", "active"].includes(s.status)).length,
    completed: sessions.filter((s) =>
      ["submitted", "analyzed", "report_ready"].includes(s.status)
    ).length,
    reportsReady: reportReady.length,
    needsReview: reportReady.filter((s) => !decided.has(s.id)).length,
  };
}

export interface WorkspaceHealth {
  /** Whether the workspace can actually send an invitation email. */
  emailConfigured: boolean;
  /** Invitations the candidate cannot act on until the workspace intervenes. */
  stalled: { invitationId: string; who: string; reason: string }[];
  /** Analysis runs that failed, so a submitted attempt has no report. */
  failedAnalyses: number;
  /** Attempts submitted with no completed analysis run behind them. */
  awaitingAnalysis: number;
}

/**
 * Everything that is quietly wrong in a workspace, in one read.
 *
 * These are the failures a hiring team otherwise discovers from a candidate
 * email asking why their link does not work.
 */
export async function getWorkspaceHealth(
  organizationId: string,
  invitations: InvitationRecord[]
): Promise<WorkspaceHealth> {
  const emailConfigured = Boolean(process.env.RESEND_API_KEY);

  const stalled = invitations
    .filter(
      (r) =>
        r.status === "expired" ||
        r.emailDelivery === "failed" ||
        r.emailDelivery === "not_configured"
    )
    .map((r) => ({
      invitationId: r.invitationId,
      who: r.name || r.email,
      reason:
        r.emailDelivery === "failed"
          ? "Email failed to send"
          : r.emailDelivery === "not_configured"
            ? "Never emailed, link must be shared"
            : "Invitation expired",
    }));

  if (isPreviewMode()) {
    return { emailConfigured, stalled, failedAnalyses: 0, awaitingAnalysis: 0 };
  }

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_sessions")
    .select("id, status, sim_analysis_runs(status)")
    .eq("organization_id", organizationId)
    .in("status", ["submitted", "analyzed", "report_ready"])
    .limit(1000);

  let failedAnalyses = 0;
  let awaitingAnalysis = 0;
  for (const session of data || []) {
    const runs = session.sim_analysis_runs as { status: string }[] | { status: string } | null;
    const list = Array.isArray(runs) ? runs : runs ? [runs] : [];
    if (list.some((r) => r.status === "complete")) continue;
    if (list.some((r) => r.status === "failed")) failedAnalyses += 1;
    else if (session.status === "submitted") awaitingAnalysis += 1;
  }

  return { emailConfigured, stalled, failedAnalyses, awaitingAnalysis };
}

export async function getNeedsReviewRecords(
  organizationId: string,
  limit = 20
): Promise<ReportRecord[]> {
  if (isPreviewMode()) return previewNeedsReview(limit);
  const reports = await getReportRecords(organizationId, 300);
  return reports.filter((r) => r.needsReview).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Operational snapshot: what needs attention, and what just happened
// ---------------------------------------------------------------------------

/**
 * The thresholds that decide whether something is merely in flight or actually
 * stuck. They live here as named numbers because a queue that calls things
 * urgent without a stated rule trains its reader to ignore it.
 */
export const ATTENTION_RULES = {
  /** An unaccepted invitation this close to expiry still needs a nudge. */
  expiringWithinHours: 48,
  /** Accepted but never started for this long is stalled, not in flight. */
  stalledAfterHours: 72,
  /** A submission whose analysis has not finished by now is late. */
  analysisLateAfterHours: 2,
} as const;

/**
 * `blocking` cannot resolve itself and no candidate can proceed through it.
 * `action` waits on a person in this workspace. `waiting` is the system's turn
 * and is listed only so its silence is accounted for.
 */
export type AttentionSeverity = "blocking" | "action" | "waiting";

export interface AttentionAction {
  label: string;
  /** A destination, or an invitation mutation performed in place. */
  href?: string;
  invitationAction?: "resend" | "copy";
}

export interface AttentionItem {
  key: string;
  invitationId: string;
  candidate: string;
  email: string;
  evaluation: string;
  /** Where the candidate actually is, in the workspace's language. */
  state: string;
  /** Why this is in the queue, phrased as the fact that triggered the rule. */
  reason: string;
  /** When it entered this state, for time-in-state. */
  since: string | null;
  severity: AttentionSeverity;
  primary: AttentionAction;
  secondary?: AttentionAction;
}

export interface ActivityEvent {
  key: string;
  at: string;
  who: string;
  what: string;
  href: string | null;
}

export interface OperationalSnapshot {
  attention: AttentionItem[];
  activity: ActivityEvent[];
}

interface OpsRunEmbed {
  status: string;
  completed_at: string | null;
}

interface OpsSessionEmbed {
  id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  curveball_presented_at: string | null;
  sim_analysis_runs: OpsRunEmbed[] | OpsRunEmbed | null;
}

interface OpsInvitationRow {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  status: string;
  email_delivery: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  sim_templates: { title?: string }[] | { title?: string } | null;
  sim_sessions: OpsSessionEmbed[] | OpsSessionEmbed | null;
}

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  blocking: 0,
  action: 1,
  waiting: 2,
};

function runList(runs: OpsRunEmbed[] | OpsRunEmbed | null | undefined): OpsRunEmbed[] {
  if (Array.isArray(runs)) return runs;
  return runs ? [runs] : [];
}

function reportHref(sessionId: string): string {
  return `/app/employer/candidates/${sessionId}`;
}

/** Deep link that lands on the Candidates table already filtered to one person. */
function candidateHref(email: string): string {
  return `/app/employer/candidates?q=${encodeURIComponent(email)}`;
}

/**
 * Everything the workspace should look at, and everything it has done, from one
 * read of the invitation tree.
 *
 * The two are built together because they answer the same question from
 * opposite ends: the queue is work outstanding, the feed is work completed, and
 * both are derived from the same timestamps. Computing them separately would
 * mean two passes over the same rows that could disagree.
 *
 * Only employer-visible facts are emitted. Nothing here reads a candidate's
 * unsubmitted drafting, which the employer is not entitled to see.
 */
export async function getOperationalSnapshot(
  organizationId: string,
  now: number = Date.now()
): Promise<OperationalSnapshot> {
  if (isPreviewMode()) return previewOperationalSnapshot();

  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_invitations")
    .select(
      "id, candidate_email, candidate_name, status, email_delivery, expires_at, created_at, accepted_at, sim_templates(title), sim_sessions(id, status, started_at, submitted_at, curveball_presented_at, sim_analysis_runs(status, completed_at))"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data || []) as unknown as OpsInvitationRow[];

  const sessionIds = rows
    .map((row) => first(row.sim_sessions)?.id)
    .filter((id): id is string => Boolean(id));

  const { data: decisionRows } = sessionIds.length
    ? await admin
        .from("sim_employer_decisions")
        .select("session_id, decision, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const decisions = (decisionRows || []) as {
    session_id: string;
    decision: string;
    created_at: string;
  }[];
  const decided = new Set(decisions.map((d) => d.session_id));

  const attention: AttentionItem[] = [];
  const activity: ActivityEvent[] = [];

  for (const row of rows) {
    const template = first(row.sim_templates);
    const session = first(row.sim_sessions);
    const runs = runList(session?.sim_analysis_runs);
    const complete = runs.find((r) => r.status === "complete");
    const failed = runs.find((r) => r.status === "failed");

    const who = row.candidate_name || row.candidate_email;
    const evaluation = template?.title || "";
    const expired =
      ["sent", "opened"].includes(row.status) &&
      Date.parse(row.expires_at) < now;

    // --- Activity, oldest facts first; sorted globally further down. --------
    activity.push({
      key: `${row.id}-sent`,
      at: row.created_at,
      who,
      what:
        row.email_delivery === "not_configured"
          ? "Invitation created, not emailed"
          : row.email_delivery === "failed"
            ? "Invitation email failed"
            : "Invitation sent",
      href: candidateHref(row.candidate_email),
    });
    if (row.accepted_at) {
      activity.push({
        key: `${row.id}-accepted`,
        at: row.accepted_at,
        who,
        what: "Invitation accepted",
        href: candidateHref(row.candidate_email),
      });
    }
    if (session?.started_at) {
      activity.push({
        key: `${row.id}-started`,
        at: session.started_at,
        who,
        what: "Simulation started",
        href: candidateHref(row.candidate_email),
      });
    }
    if (session?.curveball_presented_at) {
      activity.push({
        key: `${row.id}-changed`,
        at: session.curveball_presented_at,
        who,
        what: "Changed information released",
        href: candidateHref(row.candidate_email),
      });
    }
    if (session?.submitted_at) {
      activity.push({
        key: `${row.id}-submitted`,
        at: session.submitted_at,
        who,
        what: "Final submission received",
        href: session.id ? reportHref(session.id) : null,
      });
    }
    if (complete?.completed_at && session) {
      activity.push({
        key: `${row.id}-analyzed`,
        at: complete.completed_at,
        who,
        what: "Analysis completed",
        href: reportHref(session.id),
      });
    }
    if (failed?.completed_at && session) {
      activity.push({
        key: `${row.id}-analysis-failed`,
        at: failed.completed_at,
        who,
        what: "Analysis failed",
        href: reportHref(session.id),
      });
    }

    // --- Attention, most severe rule first; one row per candidate. ----------
    const add = (item: Omit<AttentionItem, "invitationId" | "candidate" | "email" | "evaluation">) => {
      attention.push({
        ...item,
        invitationId: row.id,
        candidate: who,
        email: row.candidate_email,
        evaluation,
      });
    };

    if (failed && !complete && session) {
      add({
        key: `${row.id}-analysis-failed`,
        state: "Submitted",
        reason: "Analysis failed, so this submission produced no report.",
        since: failed.completed_at || session.submitted_at,
        severity: "blocking",
        primary: { label: "Open submission", href: reportHref(session.id) },
      });
    } else if (row.email_delivery === "failed") {
      add({
        key: `${row.id}-email-failed`,
        state: "Invited",
        reason: "The invitation email failed to send, so it never arrived.",
        since: row.created_at,
        severity: "blocking",
        primary: { label: "Copy link", invitationAction: "copy" },
        secondary: { label: "Resend", invitationAction: "resend" },
      });
    } else if (expired) {
      add({
        key: `${row.id}-expired`,
        state: "Invited",
        reason: "The invitation expired before it was accepted.",
        since: row.expires_at,
        severity: "action",
        primary: { label: "Resend", invitationAction: "resend" },
      });
    } else if (row.email_delivery === "not_configured") {
      add({
        key: `${row.id}-not-emailed`,
        state: "Invited",
        reason: "Email is not configured, so this link has to be shared by hand.",
        since: row.created_at,
        severity: "action",
        primary: { label: "Copy link", invitationAction: "copy" },
      });
    } else if (session && ["analyzed", "report_ready"].includes(session.status) && !decided.has(session.id)) {
      add({
        key: `${row.id}-needs-review`,
        state: "Report ready",
        reason: "The report is ready and no hiring decision has been recorded.",
        since: complete?.completed_at || session.submitted_at,
        severity: "action",
        primary: { label: "Review", href: reportHref(session.id) },
      });
    } else if (
      session?.status === "submitted" &&
      !complete &&
      (hoursSince(session.submitted_at, now) ?? 0) > ATTENTION_RULES.analysisLateAfterHours
    ) {
      add({
        key: `${row.id}-analysis-late`,
        state: "Submitted",
        reason: `Analysis has been running for longer than ${ATTENTION_RULES.analysisLateAfterHours} hours.`,
        since: session.submitted_at,
        severity: "waiting",
        primary: { label: "Open candidate", href: candidateHref(row.candidate_email) },
      });
    } else if (
      session &&
      session.status === "accepted" &&
      (hoursSince(row.accepted_at, now) ?? 0) > ATTENTION_RULES.stalledAfterHours
    ) {
      add({
        key: `${row.id}-stalled`,
        state: "Accepted",
        reason: `Accepted more than ${ATTENTION_RULES.stalledAfterHours} hours ago and never started.`,
        since: row.accepted_at,
        severity: "action",
        primary: { label: "Open candidate", href: candidateHref(row.candidate_email) },
      });
    } else if (
      !session &&
      ["sent", "opened"].includes(row.status) &&
      (hoursUntil(row.expires_at, now) ?? Infinity) <= ATTENTION_RULES.expiringWithinHours
    ) {
      add({
        key: `${row.id}-expiring`,
        state: row.status === "opened" ? "Opened" : "Invited",
        reason: `This invitation expires within ${ATTENTION_RULES.expiringWithinHours} hours.`,
        since: row.created_at,
        severity: "action",
        primary: { label: "Resend", invitationAction: "resend" },
      });
    }
  }

  for (const decision of decisions) {
    const row = rows.find((r) => first(r.sim_sessions)?.id === decision.session_id);
    if (!row) continue;
    activity.push({
      key: `${decision.session_id}-decision`,
      at: decision.created_at,
      who: row.candidate_name || row.candidate_email,
      what: "Decision recorded",
      href: reportHref(decision.session_id),
    });
  }

  attention.sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return Date.parse(a.since || "") - Date.parse(b.since || "");
  });
  activity.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return { attention, activity };
}
