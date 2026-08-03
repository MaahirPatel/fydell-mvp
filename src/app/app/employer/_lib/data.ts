import "server-only";
/**
 * Org-scoped reads for the employer dashboard. All queries go through the
 * admin client after membership was checked by the caller.
 */
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";

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
  result: { total?: number; bandLabel?: string } | null;
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

function formatResult(run: AnalysisRunEmbed | null): string | null {
  if (!run?.result) return null;
  const { total, bandLabel } = run.result;
  if (typeof total === "number" && bandLabel) return `${bandLabel} · ${total}/100`;
  if (bandLabel) return bandLabel;
  return null;
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
}

export async function getInvitationRecords(
  organizationId: string,
  limit = 200
): Promise<InvitationRecord[]> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_invitations")
    .select(
      "id, candidate_email, candidate_name, status, expires_at, created_at, sim_templates(title, role_key), sim_sessions(id, status, submitted_at, sim_analysis_runs(status, result))"
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
      statusLabel: INVITATION_STATUS_LABEL[status] || status,
      progress: session
        ? SESSION_PROGRESS_LABEL[session.status] || session.status
        : "Not started",
      result: formatResult(run),
      sessionId: session?.id || null,
      reportReady,
      canResend: ["sent", "opened", "expired"].includes(status),
      canRevoke: ["sent", "opened"].includes(status),
      createdAt: inv.created_at,
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
}

export async function getReportRecords(
  organizationId: string,
  limit = 300
): Promise<ReportRecord[]> {
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

  return (data || []).map((s) => {
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
      score: typeof run?.result?.total === "number" ? run.result.total : null,
      bandLabel: run?.result?.bandLabel || null,
      completedAt: s.submitted_at,
    };
  });
}

export interface OverviewMetrics {
  inProgress: number;
  completed: number;
  reportsReady: number;
}

export async function getOverviewMetrics(organizationId: string): Promise<OverviewMetrics> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("sim_sessions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .limit(1000);
  const sessions = data || [];
  return {
    inProgress: sessions.filter((s) => ["accepted", "active"].includes(s.status)).length,
    completed: sessions.filter((s) =>
      ["submitted", "analyzed", "report_ready"].includes(s.status)
    ).length,
    reportsReady: sessions.filter((s) => ["analyzed", "report_ready"].includes(s.status)).length,
  };
}
