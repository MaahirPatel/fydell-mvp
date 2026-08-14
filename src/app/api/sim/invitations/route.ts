import { NextRequest, NextResponse } from "next/server";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { createInvitation, validateInviteRows } from "@/lib/simulations/db";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fydellEmailShell, isResendConfigured, sendResendHtml } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { ensureOrgPilotCohort } from "@/lib/pilot/cohort";
import { PILOT_EVALUATION_SLUG } from "@/lib/simulations/content/micro-ops-yield";
import { invitationTruth } from "@/lib/contracts/lifecycle";

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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data || [] });
}

/** POST: create invitations (single or batch) for a published simulation. */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const org = await requireOrgMember(user.id);
  if (!org) return NextResponse.json({ error: "No organization" }, { status: 403 });

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
        const sent = await sendResendHtml({
          to: candidate.email,
          subject: `${org.organizationName} invited you to a Fydell work simulation`,
          html: fydellEmailShell(
            `<p style="margin:0 0 12px">Hi${candidate.name ? ` ${candidate.name}` : ""},</p>
             <p style="margin:0 0 12px"><strong>${org.organizationName}</strong> invited you to complete a Data Analyst work simulation on Fydell (${PILOT_EVALUATION_SLUG}). Expect about 20 minutes of focused desktop work, then a short follow-up.</p>
             <p style="margin:0 0 20px"><a href="${inviteUrl}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review the invitation</a></p>
             <p style="margin:0;color:#6B7280;font-size:13px">Nothing starts until you consent and press Start. This link expires ${new Date(invitation.expires_at).toLocaleDateString()}.</p>`
          ),
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
        `${candidate.email}: ${err instanceof Error ? err.message : "failed to invite"}`
      );
    }
  }

  return NextResponse.json({ ok: true, created, errors, emailConfigured: emailReady });
}
