import "server-only";
import { createHash, randomBytes } from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  employerSelfSignupMode,
  isReservedOrganizationName,
  slugifyOrganization,
  domainsMismatch,
} from "@/lib/org/reserved";

const CONSENT_VERSION = "pilot-consent-2026-07";

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function mintInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function ensureEmployerOnboardingRow(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("employer_onboarding")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const mode = employerSelfSignupMode();
  const { data: created, error } = await admin
    .from("employer_onboarding")
    .insert({
      user_id: userId,
      current_step: 1,
      approval_status: mode === "open" ? "not_required" : "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created;
}

export async function completeEmployerOnboarding(input: {
  userId: string;
  email: string;
  companyName: string;
  companyWebsite?: string | null;
  jobTitle?: string | null;
  companySize?: string | null;
  industry?: string | null;
  timezone?: string | null;
  roleTitle?: string | null;
  roleSeniority?: string | null;
  outcomes?: string[];
  referralSource?: string | null;
}) {
  if (isReservedOrganizationName(input.companyName)) {
    throw new Error("That organization name is reserved and cannot be claimed.");
  }

  const admin = createAdminSupabaseClient();
  const mode = employerSelfSignupMode();
  const mismatch = domainsMismatch(input.email, input.companyWebsite);
  const approval =
    mode === "open" && !mismatch ? "approved" : mode === "disabled" ? "pending" : "pending";
  const orgStatus = approval === "approved" ? "active" : "pending";
  const invitesEnabled = approval === "approved";

  const slugBase = slugifyOrganization(input.companyName);
  const slug = `${slugBase}-${randomBytes(3).toString("hex")}`;

  // Atomic-ish: org → member → role → onboarding (service role). Compensate on failure.
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      name: input.companyName.trim(),
      slug,
      website: input.companyWebsite || null,
      industry: input.industry || null,
      company_size: input.companySize || null,
      timezone: input.timezone || null,
      status: orgStatus,
      pilot_stage: "setup",
      created_by: input.userId,
      owner_id: input.userId,
      owner_email: input.email,
    })
    .select("*")
    .single();

  if (orgErr || !org) throw new Error(orgErr?.message || "Could not create organization.");

  const { error: memErr } = await admin.from("organization_members").insert({
    organization_id: org.id,
    user_id: input.userId,
    role: "owner",
    status: "active",
    invited_by: input.userId,
    joined_at: new Date().toISOString(),
  });

  if (memErr) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(memErr.message);
  }

  const { data: role, error: roleErr } = await admin
    .from("hiring_roles")
    .insert({
      organization_id: org.id,
      title: (input.roleTitle || "FP&A Analyst").trim(),
      seniority: input.roleSeniority || null,
      status: "active",
      first_90_day_outcomes: input.outcomes || [],
      simulation_template_key: "project-meridian",
      invites_enabled: invitesEnabled,
      created_by: input.userId,
      opened_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (roleErr || !role) {
    await admin.from("organization_members").delete().eq("organization_id", org.id);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(roleErr?.message || "Could not create hiring role.");
  }

  await admin.from("employer_onboarding").upsert({
    user_id: input.userId,
    organization_id: org.id,
    current_step: 9,
    company_name: input.companyName.trim(),
    company_website: input.companyWebsite || null,
    job_title: input.jobTitle || null,
    company_size: input.companySize || null,
    industry: input.industry || null,
    timezone: input.timezone || null,
    role_title: role.title,
    role_seniority: input.roleSeniority || null,
    first_90_day_outcomes: input.outcomes || [],
    referral_source: input.referralSource || null,
    domain_mismatch: mismatch,
    approval_status: approval,
    completed_at: new Date().toISOString(),
  });

  await admin.from("profiles").upsert({
    id: input.userId,
    email: input.email,
    company_name: input.companyName.trim(),
    account_type: "employer",
    onboarding_state: "completed",
    onboarding_completed_at: new Date().toISOString(),
  });

  await admin.from("audit_logs").insert({
    actor_email: input.email,
    actor_user_id: input.userId,
    action: "employer.onboarding.completed",
    entity_type: "organization",
    entity_id: org.id,
    metadata: { approval, mismatch, roleId: role.id },
  });

  return { organization: org, role, approval, invitesEnabled };
}

export async function inviteCandidate(input: {
  userId: string;
  email: string;
  organizationId: string;
  hiringRoleId: string;
  candidateEmail: string;
  candidateName: string;
  expiresInDays?: number;
}) {
  const admin = createAdminSupabaseClient();
  const candidateEmail = input.candidateEmail.trim().toLowerCase();

  const { data: role } = await admin
    .from("hiring_roles")
    .select("*")
    .eq("id", input.hiringRoleId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (!role) throw new Error("Hiring role not found.");
  if (!role.invites_enabled) {
    throw new Error("Candidate invitations are disabled until this organization is approved.");
  }

  const { data: template } = await admin
    .from("simulation_templates")
    .select("*")
    .eq("key", role.simulation_template_key || "project-meridian")
    .maybeSingle();

  if (!template) throw new Error("Simulation template missing. Apply migration 010.");

  let { data: candidate } = await admin
    .from("pilot_candidates")
    .select("*")
    .eq("organization_id", input.organizationId)
    .ilike("email", candidateEmail)
    .maybeSingle();

  if (!candidate) {
    const { data: created, error } = await admin
      .from("pilot_candidates")
      .insert({
        organization_id: input.organizationId,
        hiring_role_id: input.hiringRoleId,
        email: candidateEmail,
        full_name: input.candidateName.trim(),
        status: "invited",
        created_by: input.userId,
      })
      .select("*")
      .single();
    if (error || !created) throw new Error(error?.message || "Could not create candidate.");
    candidate = created;
  }

  const token = mintInviteToken();
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(
    Date.now() + (input.expiresInDays ?? 14) * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: invitation, error: invErr } = await admin
    .from("candidate_invitations")
    .insert({
      candidate_id: candidate.id,
      organization_id: input.organizationId,
      hiring_role_id: input.hiringRoleId,
      email: candidateEmail,
      token_hash: tokenHash,
      status: "queued",
      invited_by: input.userId,
      expires_at: expiresAt,
      send_count: 1,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (invErr || !invitation) throw new Error(invErr?.message || "Could not create invitation.");

  const { data: assignment, error: asgErr } = await admin
    .from("simulation_assignments")
    .insert({
      organization_id: input.organizationId,
      hiring_role_id: input.hiringRoleId,
      candidate_id: candidate.id,
      invitation_id: invitation.id,
      simulation_template_id: template.id,
      template_version: template.version,
      status: "invited",
      expires_at: expiresAt,
      created_by: input.userId,
    })
    .select("*")
    .single();

  if (asgErr || !assignment) {
    await admin.from("candidate_invitations").delete().eq("id", invitation.id);
    throw new Error(asgErr?.message || "Could not create assignment.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.fydell.com";
  const acceptUrl = `${appUrl}/candidate/invite/${token}`;

  await admin.from("email_outbox").insert({
    event_type: "candidate_invite",
    template_key: "candidate_work_trial_invite",
    recipient_email: candidateEmail,
    recipient_name: input.candidateName,
    payload: {
      candidateName: input.candidateName,
      acceptUrl,
      roleTitle: role.title,
      organizationId: input.organizationId,
    },
    related_entity_type: "candidate_invitation",
    related_entity_id: invitation.id,
    status: "pending",
    idempotency_key: `invite:${invitation.id}`,
  });

  await admin.from("audit_logs").insert({
    actor_email: input.email,
    actor_user_id: input.userId,
    action: "candidate.invited",
    entity_type: "candidate_invitation",
    entity_id: invitation.id,
    metadata: { candidateId: candidate.id, assignmentId: assignment.id },
  });

  await admin
    .from("candidate_invitations")
    .update({ status: "sent" })
    .eq("id", invitation.id);

  return { candidate, invitation, assignment, acceptUrl, token };
}

export { CONSENT_VERSION };

export async function startPilotSession(input: {
  userId: string;
  assignmentId: string;
}) {
  const admin = createAdminSupabaseClient();

  const { data: assignment } = await admin
    .from("simulation_assignments")
    .select("*")
    .eq("id", input.assignmentId)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found.");

  const { data: cand } = await admin
    .from("pilot_candidates")
    .select("id, auth_user_id, email")
    .eq("id", assignment.candidate_id)
    .maybeSingle();

  if (!cand || cand.auth_user_id !== input.userId) {
    throw new Error("This assignment is not linked to your account.");
  }
  if (["cancelled", "expired"].includes(assignment.status)) {
    throw new Error("This assignment is no longer available.");
  }
  if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) {
    throw new Error("Invitation expired.");
  }

  const { data: existing } = await admin
    .from("pilot_simulation_sessions")
    .select("*")
    .eq("assignment_id", input.assignmentId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "submitted" || existing.status === "completed") {
      return existing;
    }
    return existing;
  }

  const { data: template } = await admin
    .from("simulation_templates")
    .select("*")
    .eq("id", assignment.simulation_template_id)
    .single();

  const startedAt = new Date();
  const deadlineAt = new Date(
    startedAt.getTime() + (template?.duration_minutes || 25) * 60 * 1000
  );

  const stages = [
    "brief",
    "data_room",
    "forecast_model",
    "assumptions",
    "manager_update",
    "recommendation",
  ];

  const { data: session, error } = await admin
    .from("pilot_simulation_sessions")
    .insert({
      assignment_id: input.assignmentId,
      organization_id: assignment.organization_id,
      hiring_role_id: assignment.hiring_role_id,
      candidate_id: assignment.candidate_id,
      template_id: assignment.simulation_template_id,
      template_version: assignment.template_version,
      status: "active",
      started_at: startedAt.toISOString(),
      deadline_at: deadlineAt.toISOString(),
      current_stage: "brief",
      state_version: 1,
      session_state: {},
    })
    .select("*")
    .single();

  if (error || !session) throw new Error(error?.message || "Could not start session.");

  await admin.from("pilot_session_stage_progress").insert(
    stages.map((stage_key) => ({
      session_id: session.id,
      stage_key,
      status: stage_key === "brief" ? "in_progress" : "not_started",
      first_opened_at: stage_key === "brief" ? startedAt.toISOString() : null,
    }))
  );

  await admin.from("pilot_session_events").insert({
    session_id: session.id,
    candidate_id: assignment.candidate_id,
    organization_id: assignment.organization_id,
    event_type: "session_started",
    stage_key: "brief",
    event_sequence: 1,
    event_data: {},
    occurred_at: startedAt.toISOString(),
    client_event_id: `start:${session.id}`,
  });

  await admin
    .from("simulation_assignments")
    .update({ status: "in_progress", started_at: startedAt.toISOString() })
    .eq("id", input.assignmentId);

  return session;
}

export async function autosavePilotSession(input: {
  userId: string;
  sessionId: string;
  stateVersion: number;
  sessionState: Record<string, unknown>;
  currentStage?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("pilot_simulation_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) throw new Error("Session not found.");
  const { data: cand } = await admin
    .from("pilot_candidates")
    .select("auth_user_id")
    .eq("id", session.candidate_id)
    .maybeSingle();
  if (!cand || cand.auth_user_id !== input.userId) throw new Error("Forbidden.");
  if (["submitted", "completed", "cancelled"].includes(session.status)) {
    throw new Error("Session is locked.");
  }
  if (input.stateVersion < session.state_version) {
    return { conflict: true as const, session };
  }

  // Expiry autosubmit path handled by submit with saved state
  if (session.deadline_at && new Date(session.deadline_at) < new Date()) {
    return { expired: true as const, session };
  }

  const { data: updated, error } = await admin
    .from("pilot_simulation_sessions")
    .update({
      session_state: input.sessionState,
      state_version: input.stateVersion + 1,
      last_saved_at: new Date().toISOString(),
      current_stage: input.currentStage || session.current_stage,
    })
    .eq("id", input.sessionId)
    .eq("state_version", session.state_version)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { conflict: false as const, expired: false as const, session: updated };
}

export async function submitPilotSession(input: {
  userId: string;
  sessionId: string;
  finalRecommendation: string;
  executiveMemo: string;
  forceAutosubmit?: boolean;
}) {
  const admin = createAdminSupabaseClient();
  const { data: session } = await admin
    .from("pilot_simulation_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .maybeSingle();

  if (!session) throw new Error("Session not found.");
  const { data: cand } = await admin
    .from("pilot_candidates")
    .select("auth_user_id")
    .eq("id", session.candidate_id)
    .maybeSingle();
  if (!cand || cand.auth_user_id !== input.userId) throw new Error("Forbidden.");

  const { data: existingSub } = await admin
    .from("pilot_session_submissions")
    .select("*")
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (existingSub) {
    return { submission: existingSub, session, duplicate: true };
  }

  const ref = `FYD-SUB-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const { data: submission, error: subErr } = await admin
    .from("pilot_session_submissions")
    .insert({
      session_id: input.sessionId,
      candidate_id: session.candidate_id,
      organization_id: session.organization_id,
      final_recommendation: input.finalRecommendation || "Hold",
      executive_memo: input.executiveMemo || "(autosubmitted)",
      forecast_snapshot: (session.session_state as Record<string, unknown>)?.forecast || {},
      assumption_snapshot: (session.session_state as Record<string, unknown>)?.assumptions || [],
      risk_snapshot: (session.session_state as Record<string, unknown>)?.risks || [],
      submission_snapshot: session.session_state || {},
      submitted_at: now,
    })
    .select("*")
    .single();

  if (subErr || !submission) throw new Error(subErr?.message || "Submit failed.");

  await admin
    .from("pilot_simulation_sessions")
    .update({
      status: "submitted",
      submitted_at: now,
      locked_at: now,
      submission_reference: ref,
    })
    .eq("id", input.sessionId);

  await admin
    .from("simulation_assignments")
    .update({ status: "submitted", submitted_at: now })
    .eq("id", session.assignment_id);

  await admin.from("pilot_session_events").insert({
    session_id: session.id,
    candidate_id: session.candidate_id,
    organization_id: session.organization_id,
    event_type: "session_submitted",
    event_sequence: Date.now(),
    event_data: { ref, autosubmit: Boolean(input.forceAutosubmit) },
    occurred_at: now,
    client_event_id: `submit:${session.id}`,
  });

  const { data: report } = await admin
    .from("evidence_reports_v2")
    .insert({
      session_id: session.id,
      organization_id: session.organization_id,
      candidate_id: session.candidate_id,
      hiring_role_id: session.hiring_role_id,
      status: "awaiting_human_review",
      generated_at: now,
    })
    .select("*")
    .single();

  await admin
    .from("simulation_assignments")
    .update({ status: "report_processing" })
    .eq("id", session.assignment_id);

  await admin.from("audit_logs").insert({
    actor_user_id: input.userId,
    action: "session.submitted",
    entity_type: "pilot_simulation_session",
    entity_id: session.id,
    metadata: { ref, reportId: report?.id },
  });

  return { submission, session, report, reference: ref, duplicate: false };
}
