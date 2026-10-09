import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createInvitation, getVersionContent, validateInviteRows } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fydellEmailShell, isResendConfigured, sendResendHtml } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { ensureOrgPilotCohort } from "@/lib/pilot/cohort";
import { ROLE_BY_KEY } from "@/lib/simulations/roles";
import { invitationEmailCopy } from "@/lib/simulations/invitation-copy";
import { isMicroContent } from "@/lib/simulations/micro-types";
import type { RoleKey } from "@/lib/simulations/types";
import { invitationTruth } from "@/lib/contracts/lifecycle";
import { capabilityDeniedMessage, orgCan } from "@/lib/orgs/capabilities";
import { publicErrorMessage } from "@/lib/security/public-error";

export const runtime = "nodejs";

/** GET: list this organization's invitations with session status. */
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("sim_invitations")
    .select(
      "id, candidate_email, candidate_name, status, email_delivery, expires_at, accepted_at, created_at, resend_count, sim_templates(slug, title, role_key), sim_sessions(id, status, submitted_at)"
    )
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[sim:invitations]", error.message);
    return NextResponse.json({ error: "Invitations could not be loaded. Try again." }, { status: 500 });
  }
  return NextResponse.json({ invitations: data || [] });
}

/** POST: create invitations (single or batch) for a published simulation. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });
  if (!orgCan(org.role, "manage_candidates"))
    return NextResponse.json({ error: capabilityDeniedMessage("manage_candidates") }, { status: 403 });

  let body: {
    templateId?: string;
    candidates?: { email: string; name?: string }[];
    expiresInDays?: number;
    usePilotCohort?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  let templateId = body.templateId;
  let cohortId: string | null = null;
  let templateVersionId: string | null = null;
  let expiresInDays: number | undefined;

  // October pilot path: invite into the org cohort (pinned evaluation version).
  if (body.usePilotCohort === true) {
    const cohort = await ensureOrgPilotCohort(org.organizationId, user.id);
    if (cohort.status === "closed") {
      return NextResponse.json(
        { error: "The pilot cohort is closed. Re-open it before inviting candidates." },
        { status: 409 }
      );
    }
    if (cohort.status === "draft") {
      return NextResponse.json(
        { error: "Open the pilot cohort before inviting candidates." },
        { status: 409 }
      );
    }
    if (cohort.status === "paused") {
      return NextResponse.json(
        { error: "The pilot cohort is paused. Resume it before inviting candidates." },
        { status: 409 }
      );
    }
    cohortId = cohort.id;
    templateId = cohort.template_id;
    templateVersionId = cohort.template_version_id;
    expiresInDays = cohort.invitation_expires_days;
  }

  if (!templateId)
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  const { valid, errors } = validateInviteRows(body.candidates || []);
  if (valid.length === 0)
    return NextResponse.json(
      { error: errors[0] || "At least one valid candidate email is required", errors },
      { status: 400 }
    );

  if (typeof body.expiresInDays === "number" && Number.isFinite(body.expiresInDays)) {
    expiresInDays = Math.min(60, Math.max(1, Math.round(body.expiresInDays)));
  }

  // Describe the assessment the candidate is actually invited to.
  const { data: template } = await admin
    .from("sim_templates")
    .select("title, role_key, current_version_id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  const versionContent = await getVersionContent(
    (templateVersionId || template.current_version_id) as string
  ).catch(() => null);
  const emailFacts = {
    simulationTitle: (template.title as string) || "Work simulation",
    roleTitle: ROLE_BY_KEY[template.role_key as RoleKey]?.title ?? "technical",
    durationMinutes: versionContent?.durationMinutes ?? 30,
    requiresDesktop: Boolean(isMicroContent(versionContent) && versionContent.engineering),
  };

  const emailReady = isResendConfigured();
  const created: {
    id: string;
    email: string;
    inviteUrl: string;
    emailDelivery: string;
    deliveryLabel: string;
  }[] = [];

  for (const candidate of valid) {
    try {
      const { data: duplicate } = await admin
        .from("sim_invitations")
        .select("id")
        .eq("organization_id", org.organizationId)
        .eq("template_id", templateId)
        .eq("candidate_email", candidate.email)
        .in("status", ["sent", "opened", "accepted", "started"])
        .limit(1)
        .maybeSingle();
      if (duplicate) {
        errors.push(
          `${candidate.email}: this candidate already has an active invitation. Resend or revoke it first.`
        );
        continue;
      }

      const { invitation, token } = await createInvitation({
        organizationId: org.organizationId,
        templateId,
        templateVersionId,
        cohortId,
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        invitedBy: user.id,
        expiresInDays,
      });
      const inviteUrl = `${appUrl()}/invite/${token}`;

      let delivery = "not_configured";
      if (emailReady) {
        const copy = invitationEmailCopy({
          organizationName: org.organizationName,
          candidateName: candidate.name,
          ...emailFacts,
          inviteUrl,
          expiresAt: invitation.expires_at,
        });
        const sent = await sendResendHtml({
          to: candidate.email,
          subject: copy.subject,
          html: fydellEmailShell(copy.html),
        });
        delivery = sent.ok ? "sent" : "failed";
      }
      await admin
        .from("sim_invitations")
        .update({ email_delivery: delivery })
        .eq("id", invitation.id);
      const deliveryLabel = invitationTruth({
        status: "sent",
        emailDelivery: delivery,
      }).label;
      created.push({
        id: invitation.id,
        email: candidate.email,
        inviteUrl,
        emailDelivery: delivery,
        deliveryLabel,
      });
    } catch (err) {
      errors.push(
        `${candidate.email}: ${publicErrorMessage(err, "failed to invite")}`
      );
    }
  }

  return NextResponse.json({ ok: true, created, errors, emailConfigured: emailReady });
}
