import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import type { RoleKey } from "@/lib/simulations/types";
import type { AttemptRow, AttemptStatus, InvitationRow } from "@/lib/eng/types";
import { getOwnerPassport, listShares, type ShareSummary } from "@/lib/passport/store";
import { getOrCreateProfile } from "@/lib/profile/store";
import type { PassportData } from "@/lib/passport/view";
import { isPreviewMode } from "@/lib/dev/preview";
import { previewCandidate } from "@/lib/dev/candidate-preview";

/**
 * Everything the candidate pages show, in one shape. Engineering tasks (the
 * desktop app) and browser simulations are normalised into `WorkItem`s so the
 * pages speak about "simulations" without caring which runner holds them.
 */

export type WorkTone = "ready" | "running" | "waiting" | "done" | "closed";

export type WorkItem = {
  id: string;
  title: string;
  from: string | null;
  /** One plain sentence about the task, when the employer wrote one. */
  about: string | null;
  runner: "desktop" | "browser";
  minutes: number | null;
  status: string;
  tone: WorkTone;
  /** "Open until 6 Oct", "Sent 28 Sep". */
  when: string | null;
  action: { href: string; label: string } | null;
  /** Shown instead of a button when the next step happens elsewhere. */
  note: string | null;
  receipt: string | null;
};

export type CandidateOverview = {
  name: string;
  email: string;
  passport: PassportData | null;
  shares: ShareSummary[];
  open: WorkItem[];
  done: WorkItem[];
};

function day(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const ENG: Record<AttemptStatus, { status: string; tone: WorkTone; action: string }> = {
  accepted: { status: "Setup not finished", tone: "ready", action: "Finish setup" },
  preflight_passed: { status: "Ready to start", tone: "ready", action: "Start the task" },
  in_progress: { status: "Timer running", tone: "running", action: "Go back to the task" },
  submitted: { status: "Sent to the hiring team", tone: "done", action: "See my receipt" },
  withdrawn: { status: "Withdrawn", tone: "closed", action: "View" },
  expired: { status: "Expired", tone: "closed", action: "View" },
};

function roleTitle(rk?: string | null) {
  return (rk && ROLE_BY_KEY[rk as RoleKey]?.title) || null;
}

export async function loadCandidateWork(user: { id: string; email: string }): Promise<{ open: WorkItem[]; done: WorkItem[] }> {
  if (isPreviewMode()) {
    const p = previewCandidate();
    return { open: p.open, done: p.done };
  }
  const admin = createAdminSupabaseClient();
  const email = user.email.toLowerCase();
  const [{ data: invitations }, { data: sessions }, { data: credentials }, { data: engInvites }, { data: engAttempts }] = await Promise.all([
    admin
      .from("sim_invitations")
      .select("id, status, expires_at, created_at, organizations(name), sim_templates(title, role_key)")
      .eq("candidate_email", email)
      .in("status", ["sent", "opened"])
      .order("created_at", { ascending: false }),
    admin
      .from("sim_sessions")
      .select("id, status, started_at, submitted_at, created_at, organizations(name), sim_templates(title, role_key)")
      .eq("candidate_user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("sim_credentials")
      .select("id, credential_number, status, issued_at, session_id")
      .eq("candidate_user_id", user.id)
      .order("issued_at", { ascending: false }),
    admin
      .from("eng_invitations")
      .select("id, status, expires_at, allowed_minutes, role_snapshot")
      .eq("candidate_email", email)
      .in("status", ["invited", "accepted"])
      .order("created_at", { ascending: false }),
    admin.from("eng_attempts").select("id, invitation_id, status, submitted_at").eq("candidate_user_id", user.id),
  ]);

  const attemptByInvite = new Map(
    ((engAttempts ?? []) as Pick<AttemptRow, "id" | "invitation_id" | "status" | "submitted_at">[]).map((a) => [a.invitation_id, a]),
  );
  const receiptBySession = new Map((credentials ?? []).map((c) => [c.session_id as string, c]));

  const open: WorkItem[] = [];
  const done: WorkItem[] = [];

  type EngInvite = Pick<InvitationRow, "id" | "status" | "expires_at" | "allowed_minutes" | "role_snapshot">;
  for (const inv of (engInvites ?? []) as EngInvite[]) {
    const attempt = attemptByInvite.get(inv.id) ?? null;
    const base = {
      id: `eng-${inv.id}`,
      title: inv.role_snapshot.title,
      from: inv.role_snapshot.organizationName || null,
      about: inv.role_snapshot.companyContext || null,
      runner: "desktop" as const,
      minutes: inv.allowed_minutes ?? null,
      note: null,
      receipt: null,
    };
    if (!attempt) {
      open.push({
        ...base,
        status: "Invitation waiting",
        tone: "ready",
        when: inv.expires_at ? `Open until ${day(inv.expires_at)}` : null,
        action: { href: `/assess/invitations/${inv.id}`, label: "Read the invitation" },
      });
      continue;
    }
    const st = ENG[attempt.status];
    const item: WorkItem = {
      ...base,
      status: st.status,
      tone: st.tone,
      when: attempt.status === "submitted" ? (attempt.submitted_at ? `Sent ${day(attempt.submitted_at)}` : null) : inv.expires_at ? `Open until ${day(inv.expires_at)}` : null,
      action: { href: `/assess/${attempt.id}`, label: st.action },
    };
    (attempt.status === "submitted" || st.tone === "closed" ? done : open).push(item);
  }

  for (const x of sessions ?? []) {
    const t = x.sim_templates as { title?: string; role_key?: string } | null;
    const o = x.organizations as { name?: string } | null;
    const base = {
      id: `sim-${x.id}`,
      title: t?.title ?? "Simulation",
      from: o?.name ?? null,
      about: roleTitle(t?.role_key),
      runner: "browser" as const,
      minutes: null,
      note: null,
    };
    if (x.status === "accepted" || x.status === "active") {
      const running = x.status === "active";
      open.push({
        ...base,
        status: running ? "Timer running" : "Ready to start",
        tone: running ? "running" : "ready",
        when: running ? `Started ${day(x.started_at)}` : null,
        action: { href: `/sim/${x.id}`, label: running ? "Go back to the task" : "Start the task" },
        receipt: null,
      });
      continue;
    }
    const receipt = receiptBySession.get(x.id);
    const scoring = x.status === "submitted";
    done.push({
      ...base,
      status: scoring ? "Sent to the hiring team" : "Result ready",
      tone: scoring ? "waiting" : "done",
      when: x.submitted_at ? `Sent ${day(x.submitted_at)}` : null,
      action: { href: `/sim/${x.id}/result`, label: scoring ? "Check progress" : "See my result" },
      receipt: receipt ? `${receipt.credential_number}${receipt.status === "revoked" ? " (revoked)" : ""}` : null,
    });
  }

  for (const inv of invitations ?? []) {
    const t = inv.sim_templates as { title?: string; role_key?: string } | null;
    const o = inv.organizations as { name?: string } | null;
    open.push({
      id: `inv-${inv.id}`,
      title: t?.title ?? "Simulation",
      from: o?.name ?? null,
      about: roleTitle(t?.role_key),
      runner: "browser",
      minutes: null,
      status: "Invitation waiting",
      tone: "ready",
      when: inv.expires_at ? `Open until ${day(inv.expires_at)}` : null,
      action: null,
      note: "Open the link in your invitation email to start.",
      receipt: null,
    });
  }

  return { open, done };
}

export async function loadCandidateOverview(user: { id: string; email: string }): Promise<CandidateOverview> {
  if (isPreviewMode()) return previewCandidate();
  const fallback = user.email.split("@")[0];
  const [work, profile, passport, shares] = await Promise.all([
    loadCandidateWork(user),
    getOrCreateProfile(user.id, fallback),
    getOwnerPassport(user.id),
    listShares(user.id),
  ]);
  return {
    name: profile.displayName.trim() || fallback,
    email: user.email,
    passport,
    shares,
    ...work,
  };
}

/** A passport counts as built once it holds at least one analysed project. */
export function passportBuilt(passport: PassportData | null): boolean {
  return Boolean(passport && passport.projects.some((p) => p.status !== "stale" && p.status !== "failed"));
}

export function activeShares(shares: readonly ShareSummary[]): ShareSummary[] {
  const now = Date.now();
  return shares.filter((s) => !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt).getTime() > now));
}

export function initials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
