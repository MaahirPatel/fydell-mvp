import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ACTIVE_SESSION_STATUSES = ["accepted", "preflight", "ready", "active", "recovering"];
const EVIDENCE_SESSION_STATUSES = ["submitted", "processing", "receipt_ready"];

type MissionRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  invitation_limit: number;
};

type InviteRow = {
  id: string;
  mission_id: string;
  invited_email: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type SessionRow = {
  id: string;
  mission_id: string;
  fde_user_id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
  attempt_kind?: string | null;
};

type DecisionRow = {
  id: string;
  mission_id: string;
  session_id: string | null;
  decision: string;
  created_at: string;
};

type Blocker = {
  id: string;
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  tone?: "info" | "warning";
};

type ThreadEvent = {
  id: string;
  label: string;
  detail?: string | null;
  timestamp: string;
};

function groupBy<T, K extends string | number>(rows: T[], key: (row: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const row of rows) {
    const k = key(row);
    if (!out[k]) out[k] = [];
    out[k].push(row);
  }
  return out;
}

function buildCta(
  missions: MissionRow[],
  invitesByMission: Record<string, InviteRow[]>,
  sessionsByMission: Record<string, SessionRow[]>,
  decisionsByMission: Record<string, DecisionRow[]>
): { label: string; href: string } {
  for (const mission of missions) {
    const sessions = sessionsByMission[mission.id] || [];
    const decisions = decisionsByMission[mission.id] || [];
    const ready = sessions.find(
      (s) => s.status === "receipt_ready" && !decisions.some((d) => d.session_id === s.id)
    );
    if (ready) return { label: "Review evidence", href: `/app/employer/evidence/${ready.id}` };
  }

  for (const mission of missions) {
    if (["draft", "closed", "archived"].includes(mission.status)) continue;
    const invites = invitesByMission[mission.id] || [];
    if (invites.length === 0) {
      return { label: "Invite an FDE", href: `/app/employer/missions/${mission.id}` };
    }
  }

  const draftMission = missions.find((m) => m.status === "draft");
  if (draftMission) {
    return { label: "Finish your mission", href: `/app/employer/missions/${draftMission.id}` };
  }

  return { label: "Create simulation", href: "/app/employer/simulations/generate" };
}

function pickFocusMissionId(
  missions: MissionRow[],
  invitesByMission: Record<string, InviteRow[]>,
  sessionsByMission: Record<string, SessionRow[]>,
  decisionsByMission: Record<string, DecisionRow[]>
): string | null {
  if (missions.length === 0) return null;

  for (const mission of missions) {
    const sessions = sessionsByMission[mission.id] || [];
    const decisions = decisionsByMission[mission.id] || [];
    const ready = sessions.find(
      (s) => s.status === "receipt_ready" && !decisions.some((d) => d.session_id === s.id)
    );
    if (ready) return mission.id;
  }

  for (const mission of missions) {
    if (["draft", "closed", "archived"].includes(mission.status)) continue;
    const invites = invitesByMission[mission.id] || [];
    if (invites.length === 0) return mission.id;
  }

  const draftMission = missions.find((m) => m.status === "draft");
  if (draftMission) return draftMission.id;

  const openMission = missions.find((m) => !["closed", "archived"].includes(m.status));
  return (openMission || missions[0]).id;
}

function stageIndexFor(
  missionId: string,
  invitesByMission: Record<string, InviteRow[]>,
  sessionsByMission: Record<string, SessionRow[]>,
  decisionsByMission: Record<string, DecisionRow[]>
): number {
  const invites = invitesByMission[missionId] || [];
  const sessions = sessionsByMission[missionId] || [];
  const decisions = decisionsByMission[missionId] || [];

  let idx = 0;
  if (invites.length > 0) idx = 1;
  if (sessions.length > 0) idx = 2;
  if (sessions.some((s) => EVIDENCE_SESSION_STATUSES.includes(s.status))) idx = 3;
  if (decisions.length > 0) idx = 4;
  return idx;
}

function buildBlockers(
  missions: MissionRow[],
  invitesByMission: Record<string, InviteRow[]>,
  sessionsByMission: Record<string, SessionRow[]>,
  decisionsByMission: Record<string, DecisionRow[]>
): Blocker[] {
  const blockers: Blocker[] = [];
  const now = Date.now();

  for (const mission of missions) {
    if (["closed", "archived"].includes(mission.status)) continue;
    const invites = invitesByMission[mission.id] || [];
    const sessions = sessionsByMission[mission.id] || [];
    const decisions = decisionsByMission[mission.id] || [];

    for (const session of sessions) {
      if (session.status === "receipt_ready" && !decisions.some((d) => d.session_id === session.id)) {
        blockers.push({
          id: `evidence-${session.id}`,
          title: `Review evidence for "${mission.title}"`,
          description: "Evidence is ready. Review the findings and record a decision.",
          href: `/app/employer/evidence/${session.id}`,
          actionLabel: "Review",
        });
      }
    }

    if (mission.status === "draft") {
      blockers.push({
        id: `draft-${mission.id}`,
        title: `Finish "${mission.title}"`,
        description: "This mission is still a draft and hasn't been submitted for review.",
        href: `/app/employer/missions/${mission.id}`,
        actionLabel: "Open",
        tone: "warning",
      });
      continue;
    }

    if (invites.length === 0) {
      blockers.push({
        id: `invite-${mission.id}`,
        title: `Invite an FDE to "${mission.title}"`,
        description: "This mission is ready — invite a real FDE to start the simulation.",
        href: `/app/employer/missions/${mission.id}`,
        actionLabel: "Invite",
      });
    }

    const anyAccepted = invites.some((i) => i.status === "accepted");
    for (const invite of invites) {
      if (invite.status === "pending" && invite.expires_at) {
        const daysLeft = (new Date(invite.expires_at).getTime() - now) / (1000 * 60 * 60 * 24);
        if (daysLeft > 0 && daysLeft <= 3) {
          blockers.push({
            id: `expiring-${invite.id}`,
            title: `Invite to ${invite.invited_email} expires soon`,
            description: `This invite for "${mission.title}" expires in ${Math.max(1, Math.round(daysLeft))} day(s).`,
            href: `/app/employer/missions/${mission.id}`,
            tone: "warning",
          });
        }
      }
      if (invite.status === "expired" && !anyAccepted) {
        blockers.push({
          id: `reinvite-${invite.id}`,
          title: `Re-invite an FDE to "${mission.title}"`,
          description: `Your invite to ${invite.invited_email} expired without a response.`,
          href: `/app/employer/missions/${mission.id}`,
          actionLabel: "Invite again",
        });
      }
    }
  }

  return blockers;
}

function buildEvents(
  auditRows: Array<{ id: string; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown>; created_at: string }>,
  missionTitleById: Record<string, string>,
  inviteEmailById: Record<string, string>,
  sessionMissionById: Record<string, string>,
  sessionFdeNameById: Record<string, string>,
  decisionInfoById: Record<string, { missionTitle: string; decision: string }>
): ThreadEvent[] {
  const events: ThreadEvent[] = [];

  for (const row of auditRows) {
    const meta = row.metadata || {};
    const entityId = row.entity_id || "";

    switch (row.action) {
      case "fde_mission.created":
        events.push({
          id: row.id,
          label: "Mission created",
          detail: missionTitleById[entityId] || null,
          timestamp: row.created_at,
        });
        break;
      case "fde_mission.submitted_for_review":
        events.push({
          id: row.id,
          label: "Mission submitted for review",
          detail: missionTitleById[entityId] || null,
          timestamp: row.created_at,
        });
        break;
      case "fde_mission.activated":
        events.push({
          id: row.id,
          label: "Mission activated",
          detail: missionTitleById[entityId] || null,
          timestamp: row.created_at,
        });
        break;
      case "fde_mission.invited": {
        const email = (meta.email as string) || inviteEmailById[entityId] || "an FDE";
        const missionId = meta.missionId as string | undefined;
        events.push({
          id: row.id,
          label: `Invited ${email}`,
          detail: missionId ? missionTitleById[missionId] : null,
          timestamp: row.created_at,
        });
        break;
      }
      case "fde_invitation.accepted": {
        const email = inviteEmailById[entityId] || "The FDE";
        const missionId = meta.missionId as string | undefined;
        events.push({
          id: row.id,
          label: `${email} accepted the invite`,
          detail: missionId ? missionTitleById[missionId] : null,
          timestamp: row.created_at,
        });
        break;
      }
      case "relay_session.started": {
        const fdeName = sessionFdeNameById[entityId];
        const missionId = sessionMissionById[entityId];
        events.push({
          id: row.id,
          label: `${fdeName || "The FDE"} started the mission`,
          detail: missionId ? missionTitleById[missionId] : null,
          timestamp: row.created_at,
        });
        break;
      }
      case "relay_session.submitted": {
        const fdeName = sessionFdeNameById[entityId];
        const missionId = sessionMissionById[entityId];
        events.push({
          id: row.id,
          label: `${fdeName || "The FDE"} submitted their work`,
          detail: missionId ? missionTitleById[missionId] : null,
          timestamp: row.created_at,
        });
        break;
      }
      case "relay_session.evidence_generated": {
        const missionId = sessionMissionById[entityId];
        events.push({
          id: row.id,
          label: "Evidence generated",
          detail: missionId ? missionTitleById[missionId] : null,
          timestamp: row.created_at,
        });
        break;
      }
      case "fde_employer_decision.created": {
        const info = decisionInfoById[entityId];
        const decisionLabel = info?.decision || (meta.decision as string) || "recorded";
        events.push({
          id: row.id,
          label: `Decision recorded: ${decisionLabel}`,
          detail: info?.missionTitle || null,
          timestamp: row.created_at,
        });
        break;
      }
      default:
        break;
    }
  }

  return events;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const organizationId = membership?.organization_id as string | undefined;
  const organizationName =
    (membership?.organizations as { name?: string } | null)?.name || "Your workspace";

  if (!organizationId) {
    return NextResponse.json({
      organizationId: null,
      organizationName,
      missions: [],
      counts: {
        missionsTotal: 0,
        missionsDraft: 0,
        missionsUnderReview: 0,
        missionsActive: 0,
        invitesTotal: 0,
        invitesPending: 0,
        invitesAccepted: 0,
        sessionsActive: 0,
        sessionsAwaitingEvidence: 0,
        sessionsEvidenceReady: 0,
        decisionsTotal: 0,
      },
      focusMission: null,
      blockers: [],
      events: [],
      cta: { label: "Create a mission", href: "/app/employer/missions/new" },
    });
  }

  const { data: missionsData, error: missionsError } = await admin
    .from("fde_missions")
    .select("id, title, status, created_at, invitation_limit")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (missionsError) return NextResponse.json({ error: missionsError.message }, { status: 400 });

  const missions = (missionsData || []) as MissionRow[];
  const missionIds = missions.map((m) => m.id);
  const missionTitleById = Object.fromEntries(missions.map((m) => [m.id, m.title]));

  let invites: InviteRow[] = [];
  let sessions: SessionRow[] = [];
  let decisions: DecisionRow[] = [];

  if (missionIds.length > 0) {
    const [invitesRes, sessionsRes] = await Promise.all([
      admin
        .from("fde_invitations")
        .select("id, mission_id, invited_email, status, expires_at, accepted_at, created_at")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: false }),
      admin
        .from("relay_sessions")
        .select("id, mission_id, fde_user_id, status, started_at, submitted_at, created_at, attempt_kind")
        .in("mission_id", missionIds)
        .order("created_at", { ascending: false }),
    ]);
    invites = (invitesRes.data || []) as InviteRow[];
    // Preview/demonstration attempts never enter production analytics.
    sessions = ((sessionsRes.data || []) as SessionRow[]).filter(
      (s) => !s.attempt_kind || s.attempt_kind === "scored"
    );
  }

  const { data: decisionsData } = await admin
    .from("fde_employer_decisions")
    .select("id, mission_id, session_id, decision, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  decisions = (decisionsData || []) as DecisionRow[];

  const invitesByMission = groupBy(invites, (i) => i.mission_id);
  const sessionsByMission = groupBy(sessions, (s) => s.mission_id);
  const decisionsByMission = groupBy(decisions, (d) => d.mission_id);

  const fdeUserIds = Array.from(new Set(sessions.map((s) => s.fde_user_id)));
  let fdeNameById: Record<string, string> = {};
  if (fdeUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", fdeUserIds);
    fdeNameById = Object.fromEntries(
      (profiles || []).map((p) => [p.id, p.display_name || p.email || "The FDE"])
    );
  }

  const inviteEmailById = Object.fromEntries(invites.map((i) => [i.id, i.invited_email]));
  const sessionMissionById = Object.fromEntries(sessions.map((s) => [s.id, s.mission_id]));
  const sessionFdeNameById = Object.fromEntries(
    sessions.map((s) => [s.id, fdeNameById[s.fde_user_id] || "The FDE"])
  );
  const decisionInfoById = Object.fromEntries(
    decisions.map((d) => [
      d.id,
      { missionTitle: missionTitleById[d.mission_id] || "Mission", decision: d.decision },
    ])
  );

  const entityIds = [
    ...missionIds,
    ...invites.map((i) => i.id),
    ...sessions.map((s) => s.id),
    ...decisions.map((d) => d.id),
  ];

  let events: ThreadEvent[] = [];
  if (entityIds.length > 0) {
    const { data: auditRows } = await admin
      .from("fde_audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .in("entity_id", entityIds)
      .order("created_at", { ascending: false })
      .limit(20);

    events = buildEvents(
      (auditRows || []) as Array<{
        id: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        metadata: Record<string, unknown>;
        created_at: string;
      }>,
      missionTitleById,
      inviteEmailById,
      sessionMissionById,
      sessionFdeNameById,
      decisionInfoById
    );
  }

  const counts = {
    missionsTotal: missions.length,
    missionsDraft: missions.filter((m) => m.status === "draft").length,
    missionsUnderReview: missions.filter((m) => m.status === "under_review").length,
    missionsActive: missions.filter((m) => m.status === "active").length,
    invitesTotal: invites.length,
    invitesPending: invites.filter((i) => i.status === "pending").length,
    invitesAccepted: invites.filter((i) => i.status === "accepted").length,
    sessionsActive: sessions.filter((s) => ACTIVE_SESSION_STATUSES.includes(s.status)).length,
    sessionsAwaitingEvidence: sessions.filter((s) => ["submitted", "processing"].includes(s.status)).length,
    sessionsEvidenceReady: sessions.filter((s) => s.status === "receipt_ready").length,
    decisionsTotal: decisions.length,
  };

  const focusMissionId = pickFocusMissionId(missions, invitesByMission, sessionsByMission, decisionsByMission);
  const focusMissionRow = focusMissionId ? missions.find((m) => m.id === focusMissionId) || null : null;
  const focusMission = focusMissionRow
    ? {
        id: focusMissionRow.id,
        title: focusMissionRow.title,
        status: focusMissionRow.status,
        createdAt: focusMissionRow.created_at,
        stageIndex: stageIndexFor(focusMissionRow.id, invitesByMission, sessionsByMission, decisionsByMission),
        inviteCount: (invitesByMission[focusMissionRow.id] || []).length,
        acceptedInviteCount: (invitesByMission[focusMissionRow.id] || []).filter((i) => i.status === "accepted").length,
        sessionCount: (sessionsByMission[focusMissionRow.id] || []).length,
        activeSessionCount: (sessionsByMission[focusMissionRow.id] || []).filter((s) =>
          ACTIVE_SESSION_STATUSES.includes(s.status)
        ).length,
        evidenceReadyCount: (sessionsByMission[focusMissionRow.id] || []).filter((s) => s.status === "receipt_ready")
          .length,
        decisionCount: (decisionsByMission[focusMissionRow.id] || []).length,
      }
    : null;

  const blockers = buildBlockers(missions, invitesByMission, sessionsByMission, decisionsByMission);
  const cta = buildCta(missions, invitesByMission, sessionsByMission, decisionsByMission);

  return NextResponse.json({
    organizationId,
    organizationName,
    missions: missions.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      createdAt: m.created_at,
      invitationLimit: m.invitation_limit,
    })),
    counts,
    focusMission,
    blockers,
    events,
    cta,
  });
}
