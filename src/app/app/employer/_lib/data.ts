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
  previewReports,
} from "@/lib/dev/preview";
import { invitationTruth } from "@/lib/contracts/lifecycle";

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
