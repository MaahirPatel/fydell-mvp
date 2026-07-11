import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { enqueueEmail } from "@/lib/ops/email-outbox";
import { writeAudit } from "@/lib/ops/platform-roles";
import { appUrl } from "@/lib/app-url";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export type ApprovePilotInput = {
  pilotRequestId: string;
  actorEmail: string;
  organizationName?: string;
  website?: string | null;
  employerEmail?: string;
  employerName?: string;
};

/**
 * Idempotent approve → create organization → invite employer.
 * Safe to retry: uses converted_organization_id when present.
 */
export async function approvePilotRequest(input: ApprovePilotInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required to approve pilots");
  }
  const admin = getSupabaseAdmin();

  const { data: request, error } = await admin
    .from("pilot_requests")
    .select("*")
    .eq("id", input.pilotRequestId)
    .single();
  if (error || !request) throw new Error(error?.message || "Pilot request not found");

  if (request.converted_organization_id) {
    return {
      organizationId: request.converted_organization_id as string,
      reused: true,
    };
  }

  const orgName = (
    input.organizationName ||
    request.company_name ||
    request.company ||
    "New organization"
  ).trim();
  const employerEmail = (
    input.employerEmail ||
    request.work_email ||
    request.email ||
    ""
  )
    .trim()
    .toLowerCase();
  const employerName = (input.employerName || request.full_name || request.name || "").trim();
  if (!employerEmail) throw new Error("Employer email is required");

  let slug = slugify(orgName) || `org-${Date.now().toString(36)}`;
  const { data: slugClash } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugClash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: orgName,
      slug,
      website: input.website || request.company_website || null,
      owner_email: employerEmail,
      status: "pending",
      pilot_stage: "setup",
      created_from_pilot_request_id: request.id,
      billing_email: employerEmail,
    })
    .select("id, name, slug")
    .single();
  if (orgError || !org) throw new Error(orgError?.message || "Could not create organization");

  const now = new Date().toISOString();
  await admin
    .from("pilot_requests")
    .update({
      status: "workspace_created",
      approved_at: now,
      converted_organization_id: org.id,
    })
    .eq("id", request.id);

  await admin.from("pilot_request_events").insert([
    {
      pilot_request_id: request.id,
      event_type: "approved",
      old_status: request.status,
      new_status: "approved",
      description: `Approved by ${input.actorEmail}`,
    },
    {
      pilot_request_id: request.id,
      event_type: "workspace_created",
      new_status: "workspace_created",
      description: `Organization created: ${org.name}`,
      metadata: { organization_id: org.id, slug: org.slug },
    },
  ]);

  const invited = await admin.auth.admin.inviteUserByEmail(employerEmail, {
    data: {
      full_name: employerName,
      organization_id: org.id,
      organization_role: "owner",
    },
    redirectTo: `${appUrl()}/login`,
  });

  const supabaseUserId = invited.data.user?.id || null;
  const inviteStatus = invited.error ? "failed" : "sent";

  const { data: invitation } = await admin
    .from("invitations")
    .insert({
      email: employerEmail,
      invitation_type: "organization_member",
      organization_id: org.id,
      organization_role: "owner",
      status: inviteStatus,
      supabase_user_id: supabaseUserId,
      last_sent_at: now,
      send_count: 1,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (supabaseUserId) {
    await admin.from("organization_members").upsert(
      {
        organization_id: org.id,
        user_id: supabaseUserId,
        role: "owner",
        status: "invited",
        invited_at: now,
      },
      { onConflict: "organization_id,user_id" }
    );
    await admin.from("organizations").update({ owner_id: supabaseUserId }).eq("id", org.id);
  }

  await enqueueEmail({
    eventType: "organization_workspace_invite",
    templateKey: "organization_workspace_invite",
    recipientEmail: employerEmail,
    recipientName: employerName,
    payload: {
      fullName: employerName,
      companyName: orgName,
      siteUrl: appUrl(),
      publicReference: request.public_reference,
    },
    relatedEntityType: "organization",
    relatedEntityId: org.id,
    idempotencyKey: `organization-invite:${invitation?.id || org.id}:1`,
    priority: 10,
  });

  await admin.from("pilot_request_events").insert({
    pilot_request_id: request.id,
    event_type: "invitation_sent",
    description: invited.error
      ? `Auth invite failed: ${invited.error.message}`
      : `Employer invitation queued for ${employerEmail}`,
    metadata: { invitation_id: invitation?.id || null },
  });

  await writeAudit({
    actorEmail: input.actorEmail,
    action: "pilot_request_approved",
    entityType: "pilot_request",
    entityId: request.id,
    organizationId: org.id,
    after: {
      organization_id: org.id,
      slug: org.slug,
      employer_email: employerEmail,
    },
  });

  return {
    organizationId: org.id,
    invitationId: invitation?.id || null,
    reused: false,
    inviteError: invited.error?.message || null,
  };
}
