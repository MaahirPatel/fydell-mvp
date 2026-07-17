import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/app-url";
import { enqueueAction } from "@/lib/fde/action-inbox";

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function audit(
  actor: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const admin = createAdminSupabaseClient();
  const actorIsUuid = actor ? UUID_RE.test(actor) : false;
  await admin.from("fde_audit_logs").insert({
    actor_user_id: actorIsUuid ? actor : null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: actorIsUuid || !actor ? metadata : { ...metadata, actor },
  });
}

export async function ensureFdeProfile(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data: existing } = await admin
    .from("fde_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await admin
    .from("fde_profiles")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error || !created) throw new Error(error?.message || "Could not create FDE profile.");
  return created;
}

export type CreateMissionDraftInput = {
  orgId: string;
  userId: string;
  title: string;
  objective?: string;
  customerContext?: string;
  expectedOutcome?: string;
  systemsContext?: string;
  technicalEnvironment?: string;
  constraints?: string;
  securityConsiderations?: string;
  successMeasures?: string;
  location?: string;
  travelExpectation?: string;
  workArrangement?: string;
  compensationMinimum?: number | null;
  compensationMaximum?: number | null;
  currency?: string;
  hiringTimeline?: string;
  invitationLimit?: number;
};

export async function createMissionDraft(input: CreateMissionDraftInput) {
  const admin = createAdminSupabaseClient();
  const title = input.title.trim();
  if (!title) throw new Error("Mission title is required.");

  const { data: mission, error } = await admin
    .from("fde_missions")
    .insert({
      organization_id: input.orgId,
      title,
      objective: input.objective?.trim() || "",
      customer_context: input.customerContext?.trim() || "",
      expected_outcome: input.expectedOutcome?.trim() || "",
      systems_context: input.systemsContext?.trim() || "",
      technical_environment: input.technicalEnvironment?.trim() || "",
      constraints: input.constraints?.trim() || "",
      security_considerations: input.securityConsiderations?.trim() || "",
      success_measures: input.successMeasures?.trim() || "",
      location: input.location || null,
      travel_expectation: input.travelExpectation || null,
      work_arrangement: input.workArrangement || null,
      compensation_minimum: input.compensationMinimum ?? null,
      compensation_maximum: input.compensationMaximum ?? null,
      currency: input.currency || "USD",
      hiring_timeline: input.hiringTimeline || null,
      invitation_limit: input.invitationLimit ?? 5,
      status: "draft",
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (error || !mission) throw new Error(error?.message || "Could not create mission draft.");

  await audit(input.userId, "fde_mission.created", "fde_mission", mission.id, {
    organizationId: input.orgId,
  });

  return mission;
}

export async function updateMissionDraft(
  missionId: string,
  actorUserId: string,
  patch: Partial<Omit<CreateMissionDraftInput, "orgId" | "userId">>
) {
  const admin = createAdminSupabaseClient();
  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) throw new Error("Mission not found.");
  if (mission.status !== "draft") {
    throw new Error("Only draft missions can be edited.");
  }

  const fieldMap: Record<string, string> = {
    title: "title",
    objective: "objective",
    customerContext: "customer_context",
    expectedOutcome: "expected_outcome",
    systemsContext: "systems_context",
    technicalEnvironment: "technical_environment",
    constraints: "constraints",
    securityConsiderations: "security_considerations",
    successMeasures: "success_measures",
    location: "location",
    travelExpectation: "travel_expectation",
    workArrangement: "work_arrangement",
    compensationMinimum: "compensation_minimum",
    compensationMaximum: "compensation_maximum",
    currency: "currency",
    hiringTimeline: "hiring_timeline",
    invitationLimit: "invitation_limit",
  };

  const update: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(fieldMap)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    update[column] = typeof value === "string" ? value.trim() : value;
  }
  if (Object.keys(update).length === 0) return mission;

  const { data: updated, error } = await admin
    .from("fde_missions")
    .update(update)
    .eq("id", missionId)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not update mission.");

  await audit(actorUserId, "fde_mission.updated", "fde_mission", missionId, {
    fields: Object.keys(update),
  });

  return updated;
}

export async function submitMissionForReview(missionId: string, actorUserId: string) {
  const admin = createAdminSupabaseClient();
  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) throw new Error("Mission not found.");
  if (mission.status !== "draft") {
    throw new Error("Only draft missions can be submitted for review.");
  }
  if (!mission.title?.trim() || !mission.objective?.trim()) {
    throw new Error("Add a title and objective before submitting for review.");
  }

  const { data: updated, error } = await admin
    .from("fde_missions")
    .update({ status: "under_review" })
    .eq("id", missionId)
    .eq("status", "draft")
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not submit mission for review.");

  await audit(actorUserId, "fde_mission.submitted_for_review", "fde_mission", missionId, {});
  return updated;
}

export async function activateMission(missionId: string, actorUserId: string) {
  const admin = createAdminSupabaseClient();
  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) throw new Error("Mission not found.");
  if (!["under_review", "paused"].includes(mission.status)) {
    throw new Error("Mission must be under review (or paused) before it can be activated.");
  }

  const { data: updated, error } = await admin
    .from("fde_missions")
    .update({
      status: "active",
      published_at: mission.published_at || new Date().toISOString(),
    })
    .eq("id", missionId)
    .select("*")
    .single();
  if (error || !updated) throw new Error(error?.message || "Could not activate mission.");

  await audit(actorUserId, "fde_mission.activated", "fde_mission", missionId, {});
  return updated;
}

export async function inviteFdeToMission(input: {
  missionId: string;
  invitedBy: string;
  email: string;
  name?: string;
  expiresInDays?: number;
}) {
  const admin = createAdminSupabaseClient();
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Email is required.");

  const { data: mission } = await admin
    .from("fde_missions")
    .select("*")
    .eq("id", input.missionId)
    .maybeSingle();
  if (!mission) throw new Error("Mission not found.");
  if (!["under_review", "active"].includes(mission.status)) {
    throw new Error("Mission must be submitted for review (or active) before inviting an FDE.");
  }

  const { count } = await admin
    .from("fde_invitations")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", input.missionId)
    .in("status", ["pending", "accepted"]);
  if ((count || 0) >= mission.invitation_limit) {
    throw new Error("Invitation limit reached for this mission.");
  }

  const token = mintInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(
    Date.now() + (input.expiresInDays ?? 14) * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: invitation, error } = await admin
    .from("fde_invitations")
    .insert({
      mission_id: input.missionId,
      invited_email: email,
      invited_by_user_id: input.invitedBy,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !invitation) throw new Error(error?.message || "Could not create invitation.");

  const acceptUrl = `${appUrl()}/s/${token}`;

  await admin.from("email_outbox").insert({
    event_type: "fde_mission_invite",
    template_key: "fde_mission_invite",
    recipient_email: email,
    recipient_name: input.name || null,
    payload: {
      acceptUrl,
      missionTitle: mission.title,
      missionId: mission.id,
    },
    related_entity_type: "fde_invitation",
    related_entity_id: invitation.id,
    status: "pending",
    idempotency_key: `fde-invite:${invitation.id}`,
  });

  await audit(input.invitedBy, "fde_mission.invited", "fde_invitation", invitation.id, {
    missionId: mission.id,
    email,
  });

  // If this email already belongs to a registered FDE, surface the invite in
  // their Action Inbox in addition to the outbound email.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile?.id) {
    await enqueueAction({
      userId: existingProfile.id,
      type: "mission_invite",
      title: `You're invited: ${mission.title}`,
      body: "Review the mission details and accept to start your simulation.",
      actionUrl: acceptUrl,
      organizationId: mission.organization_id,
      missionId: mission.id,
      invitationId: invitation.id,
    });
  }

  return { invitation, acceptUrl, token, mission };
}

export async function getInvitationPreview(token: string) {
  const admin = createAdminSupabaseClient();
  const tokenHash = hashInviteToken(token);
  const { data: invitation } = await admin
    .from("fde_invitations")
    .select("*, fde_missions(title, objective, expected_outcome, organization_id)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invitation) throw new Error("Invitation not found.");

  const mission = invitation.fde_missions as {
    title?: string;
    objective?: string;
    expected_outcome?: string;
    organization_id?: string;
  } | null;

  let organizationName: string | null = null;
  if (mission?.organization_id) {
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", mission.organization_id)
      .maybeSingle();
    organizationName = org?.name || null;
  }

  return { invitation, mission, organizationName };
}

export async function acceptInvitation(token: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const tokenHash = hashInviteToken(token);
  const { data: invitation } = await admin
    .from("fde_invitations")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!invitation) throw new Error("Invitation not found.");

  if (invitation.status === "revoked") throw new Error("This invitation was revoked.");
  if (invitation.status === "declined") throw new Error("This invitation was declined.");

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    if (invitation.status === "pending") {
      await admin.from("fde_invitations").update({ status: "expired" }).eq("id", invitation.id);
    }
    throw new Error("This invitation has expired.");
  }

  const { data: userRow, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userRow.user) throw new Error("Could not resolve your account.");
  const email = userRow.user.email?.toLowerCase();
  if (email && email !== invitation.invited_email.toLowerCase()) {
    throw new Error(`Sign in with ${invitation.invited_email} to accept this invitation.`);
  }

  if (invitation.status === "accepted") {
    const { data: existingSession } = await admin
      .from("relay_sessions")
      .select("*")
      .eq("invitation_id", invitation.id)
      .maybeSingle();
    if (existingSession) {
      return { invitation, session: existingSession, duplicate: true };
    }
  }

  await ensureFdeProfile(userId);

  const { data: session, error: sessionErr } = await admin
    .from("relay_sessions")
    .insert({
      mission_id: invitation.mission_id,
      invitation_id: invitation.id,
      fde_user_id: userId,
      status: "accepted",
    })
    .select("*")
    .single();
  if (sessionErr || !session) throw new Error(sessionErr?.message || "Could not create session.");

  await admin
    .from("fde_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      fde_user_id: userId,
    })
    .eq("id", invitation.id);

  await admin.from("profiles").upsert({
    id: userId,
    email: email || undefined,
    account_type: "fde",
  });

  await audit(userId, "fde_invitation.accepted", "fde_invitation", invitation.id, {
    missionId: invitation.mission_id,
    sessionId: session.id,
  });

  const { data: missionRow } = await admin
    .from("fde_missions")
    .select("title, organization_id")
    .eq("id", invitation.mission_id)
    .maybeSingle();

  await enqueueAction({
    userId,
    type: "simulation_ready",
    title: "Simulation ready",
    body: missionRow?.title
      ? `Your simulation for "${missionRow.title}" is ready to start.`
      : "Your simulation is ready to start.",
    actionUrl: `/s/${token}/consent`,
    organizationId: missionRow?.organization_id || null,
    missionId: invitation.mission_id,
    invitationId: invitation.id,
    sessionId: session.id,
  });

  return { invitation, session, duplicate: false };
}
