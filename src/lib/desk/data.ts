import "server-only";
import { cache } from "react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { AttemptStatus } from "@/lib/eng/types";

/**
 * Everything the installed app shows about one person's hiring work, keyed to
 * the email they signed in with: invitations sent to that address, and the
 * tasks and simulations on their account. Display fields only; tokens and
 * employer notes are never read.
 */

export type DeskTone = "pending" | "attention" | "success" | "neutral";

export interface DeskInvitation {
  key: string;
  kind: "engineering" | "simulation";
  id: string;
  title: string;
  organization: string;
  expiresAt: string;
  minutes: number | null;
  /** Engineering invitations open a brief first; simulations are accepted from the inbox. */
  href: string | null;
}

export interface DeskTask {
  key: string;
  kind: "engineering" | "simulation";
  title: string;
  organization: string;
  status: string;
  tone: DeskTone;
  dateLabel: string;
  date: string | null;
  href: string;
  action: string;
  open: boolean;
}

export interface DeskData {
  invitations: DeskInvitation[];
  tasks: DeskTask[];
}

const ENG_STATUS: Record<AttemptStatus, { status: string; tone: DeskTone; action: string; open: boolean }> = {
  accepted: { status: "Setup not finished", tone: "pending", action: "Continue setup", open: true },
  preflight_passed: { status: "Ready to start", tone: "pending", action: "Start task", open: true },
  in_progress: { status: "Timer running", tone: "attention", action: "Return to task", open: true },
  submitted: { status: "With the hiring team", tone: "success", action: "View submission", open: false },
  withdrawn: { status: "Withdrawn", tone: "neutral", action: "View", open: false },
  expired: { status: "Expired", tone: "neutral", action: "View", open: false },
};

type RoleSnapshot = { title?: string; organizationName?: string };
type Named = { name?: string } | null;
type Template = { title?: string } | null;

/** Cached per request, so the app's layout and page share one read. */
export function loadDesk(user: { id: string; email: string }): Promise<DeskData> {
  return loadDeskOnce(user.id, user.email.toLowerCase());
}

const loadDeskOnce = cache(async (userId: string, email: string): Promise<DeskData> => {
  const user = { id: userId };
  const db = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const [attempts, engInvites, simInvites, sessions] = await Promise.all([
    db
      .from("eng_attempts")
      .select("id, invitation_id, scenario_version_id, status, due_at, started_at, submitted_at, created_at, eng_invitations(role_snapshot)")
      .eq("candidate_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("eng_invitations")
      .select("id, status, expires_at, allowed_minutes, role_snapshot")
      .eq("candidate_email", email)
      .eq("status", "invited")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("sim_invitations")
      .select("id, expires_at, organizations(name), sim_templates(title)")
      .eq("candidate_email", email)
      .in("status", ["sent", "opened"])
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("sim_sessions")
      .select("id, status, started_at, submitted_at, created_at, organizations(name), sim_templates(title)")
      .eq("candidate_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type AttemptRow = {
    id: string;
    invitation_id: string;
    scenario_version_id: string | null;
    status: AttemptStatus;
    due_at: string | null;
    started_at: string | null;
    submitted_at: string | null;
    created_at: string;
    eng_invitations: { role_snapshot: RoleSnapshot } | null;
  };
  const attemptRows = (attempts.data ?? []) as unknown as AttemptRow[];

  const versionIds = [...new Set(attemptRows.map((a) => a.scenario_version_id).filter((v): v is string => Boolean(v)))];
  const authored = new Set<string>();
  if (versionIds.length > 0) {
    const { data } = await db.from("eng_scenario_versions").select("id, origin").in("id", versionIds);
    for (const row of (data ?? []) as { id: string; origin: string }[]) if (row.origin === "employer_authored") authored.add(row.id);
  }

  const engTasks: DeskTask[] = attemptRows.map((a) => {
    const st = ENG_STATUS[a.status];
    const snap = a.eng_invitations?.role_snapshot;
    const focus = a.scenario_version_id !== null && authored.has(a.scenario_version_id);
    const base = focus ? `/assess/${a.id}` : `/app/desk/tasks/${a.id}`;
    return {
      key: `eng-${a.id}`,
      kind: "engineering",
      title: snap?.title ?? "Engineering task",
      organization: snap?.organizationName ?? "",
      status: st.status,
      tone: st.tone,
      dateLabel: a.submitted_at ? "Submitted" : a.due_at ? "Due" : "Accepted",
      date: a.submitted_at ?? a.due_at ?? a.created_at,
      href: a.status === "submitted" ? `${base}#report` : base,
      action: st.action,
      open: st.open,
    };
  });

  type SessionRow = { id: string; status: string; started_at: string | null; submitted_at: string | null; created_at: string; organizations: Named; sim_templates: Template };
  const simTasks: DeskTask[] = ((sessions.data ?? []) as unknown as SessionRow[]).map((x) => {
    const open = x.status === "accepted" || x.status === "active";
    const running = x.status === "active";
    return {
      key: `sim-${x.id}`,
      kind: "simulation",
      title: x.sim_templates?.title ?? "Simulation",
      organization: x.organizations?.name ?? "",
      status: open ? (running ? "Timer running" : "Not started") : x.status === "submitted" ? "Being scored" : "Result ready",
      tone: open ? (running ? "attention" : "pending") : x.status === "submitted" ? "pending" : "success",
      dateLabel: open ? (running ? "Started" : "Accepted") : "Submitted",
      date: open ? (x.started_at ?? x.created_at) : x.submitted_at,
      href: open ? `/sim/${x.id}` : `/sim/${x.id}/result`,
      action: open ? (running ? "Resume" : "Begin") : "Open result",
      open,
    };
  });

  const attempted = new Set(attemptRows.map((a) => a.invitation_id));
  type EngInviteRow = { id: string; expires_at: string; allowed_minutes: number; role_snapshot: RoleSnapshot };
  type SimInviteRow = { id: string; expires_at: string; organizations: Named; sim_templates: Template };
  const invitations: DeskInvitation[] = [
    ...((engInvites.data ?? []) as unknown as EngInviteRow[])
      .filter((inv) => !attempted.has(inv.id))
      .map((inv): DeskInvitation => ({
        key: `eng-${inv.id}`,
        kind: "engineering",
        id: inv.id,
        title: inv.role_snapshot.title ?? "Engineering task",
        organization: inv.role_snapshot.organizationName ?? "",
        expiresAt: inv.expires_at,
        minutes: inv.allowed_minutes,
        href: `/app/desk/invitations/${inv.id}`,
      })),
    ...((simInvites.data ?? []) as unknown as SimInviteRow[]).map((inv): DeskInvitation => ({
      key: `sim-${inv.id}`,
      kind: "simulation",
      id: inv.id,
      title: inv.sim_templates?.title ?? "Work simulation",
      organization: inv.organizations?.name ?? "",
      expiresAt: inv.expires_at,
      minutes: null,
      href: null,
    })),
  ].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  const tasks = [...engTasks, ...simTasks].sort((a, b) => Number(b.open) - Number(a.open) || (b.date ?? "").localeCompare(a.date ?? ""));
  return { invitations, tasks };
});
