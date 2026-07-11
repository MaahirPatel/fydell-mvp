import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { adminNotificationEmail } from "@/lib/ops/platform-roles";

export type OutboxInsert = {
  eventType: string;
  templateKey: string;
  recipientEmail: string;
  recipientName?: string | null;
  replyTo?: string | null;
  subjectOverride?: string | null;
  payload: Record<string, unknown>;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  idempotencyKey: string;
  priority?: number;
};

export async function enqueueEmail(input: OutboxInsert): Promise<{ id: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();

  const { data: suppressed } = await admin
    .from("email_suppressions")
    .select("id")
    .eq("email", input.recipientEmail.toLowerCase())
    .is("resolved_at", null)
    .maybeSingle();

  const row = {
    event_type: input.eventType,
    template_key: input.templateKey,
    recipient_email: input.recipientEmail.toLowerCase(),
    recipient_name: input.recipientName || null,
    reply_to: input.replyTo || adminNotificationEmail(),
    subject_override: input.subjectOverride || null,
    payload: input.payload,
    related_entity_type: input.relatedEntityType || null,
    related_entity_id: input.relatedEntityId || null,
    idempotency_key: input.idempotencyKey,
    priority: input.priority ?? 100,
    status: suppressed ? "suppressed" : "pending",
    last_error: suppressed ? "Recipient is suppressed" : null,
  };

  const { data, error } = await admin
    .from("email_outbox")
    .upsert(row, { onConflict: "idempotency_key" })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(inner: string): string {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#07080B;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#0B0D12;border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden">
      <div style="padding:22px 28px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <span style="color:#F4F5F7;font-weight:650;font-size:18px;letter-spacing:-0.03em">fydell</span>
      </div>
      <div style="padding:28px;color:#F4F5F7">${inner}</div>
    </div>
    <p style="text-align:center;color:rgba(244,245,247,0.4);font-size:12px;margin-top:18px">
      Fydell · Work-based hiring evidence for finance teams
    </p>
  </div>`;
}

function p(text: string): string {
  return `<p style="color:rgba(244,245,247,0.72);font-size:15px;line-height:1.6;margin:0 0 14px">${text}</p>`;
}

function h1(text: string): string {
  return `<h1 style="font-size:22px;line-height:1.2;margin:0 0 12px;font-weight:560">${text}</h1>`;
}

function link(href: string, label: string): string {
  return `<p style="margin:0"><a href="${href}" style="color:#5662FF">${label}</a></p>`;
}

/** @deprecated alias — use renderEmailTemplate */
export function renderPilotTemplates(
  templateKey: string,
  payload: Record<string, unknown>
): { subject: string; html: string } {
  return renderEmailTemplate(templateKey, payload);
}

export function renderEmailTemplate(
  templateKey: string,
  payload: Record<string, unknown>
): { subject: string; html: string } {
  const name = escapeHtml(String(payload.fullName || "there"));
  const company = escapeHtml(String(payload.companyName || ""));
  const role = escapeHtml(String(payload.roleBeingHired || payload.roleTitle || ""));
  const reference = escapeHtml(String(payload.publicReference || ""));
  const email = escapeHtml(String(payload.workEmail || payload.email || ""));
  const adminUrl = escapeHtml(
    String(payload.adminUrl || "https://www.fydell.com/admin/pilot-requests")
  );
  const siteUrl = escapeHtml(String(payload.siteUrl || "https://www.fydell.com"));
  const actionUrl = escapeHtml(String(payload.actionUrl || `${siteUrl}/login`));
  const extra = escapeHtml(String(payload.message || payload.body || ""));

  const templates: Record<string, { subject: string; html: string }> = {
    pilot_request_received: {
      subject: "We received your Fydell pilot request",
      html: shell(
        `${h1("Request received")}${p(`Hi ${name},`)}${p(
          `We received your pilot request for <strong style="color:#F4F5F7">${company}</strong> (${role}). Reference: <strong style="color:#F4F5F7">${reference}</strong>.`
        )}${p("A member of the Fydell team will reply within one business day.")}${link(siteUrl, "Visit fydell.com")}`
      ),
    },
    admin_new_pilot_request: {
      subject: `New pilot request: ${company} — ${role}`,
      html: shell(
        `${h1("New pilot request")}${p(
          `<strong style="color:#F4F5F7">${name}</strong> (${email}) from <strong style="color:#F4F5F7">${company}</strong>`
        )}${p(`Role: ${role}`)}${p(`Reference: ${reference}`)}${link(adminUrl, "Open in admin")}`
      ),
    },
    organization_workspace_invite: {
      subject: `Your Fydell workspace for ${company}`,
      html: shell(
        `${h1("Workspace ready")}${p(`Hi ${name},`)}${p(
          `Your Fydell pilot workspace for <strong style="color:#F4F5F7">${company}</strong> is ready. Check your inbox for the secure account invitation, then sign in to continue setup.`
        )}${link(`${siteUrl}/login`, "Go to Fydell")}`
      ),
    },
    pilot_request_needs_information: {
      subject: `We need a bit more detail — ${reference || company}`,
      html: shell(
        `${h1("Quick follow-up")}${p(`Hi ${name},`)}${p(
          `Thanks for your Fydell pilot request${reference ? ` (${reference})` : ""}. Could you share a little more detail so we can configure Project Meridian correctly?`
        )}${extra ? p(extra) : ""}${link("mailto:admin@fydell.com", "Reply to admin@fydell.com")}`
      ),
    },
    pilot_request_approved: {
      subject: `Your Fydell pilot is approved — ${company}`,
      html: shell(
        `${h1("Pilot approved")}${p(`Hi ${name},`)}${p(
          `Your Fydell pilot for <strong style="color:#F4F5F7">${company}</strong> is approved. You’ll receive a secure invitation to set up your workspace next.`
        )}${link(actionUrl, "Open Fydell")}`
      ),
    },
    organization_member_invite: {
      subject: `You’re invited to ${company} on Fydell`,
      html: shell(
        `${h1("Team invitation")}${p(`Hi ${name},`)}${p(
          `You’ve been invited to join <strong style="color:#F4F5F7">${company}</strong> on Fydell.`
        )}${link(actionUrl, "Accept invitation")}`
      ),
    },
    candidate_work_trial_invite: {
      subject: `Your Project Meridian work trial invitation`,
      html: shell(
        `${h1("Work trial invitation")}${p(`Hi ${name},`)}${p(
          `${company} invited you to complete a Project Meridian work trial${role ? ` for ${role}` : ""}.`
        )}${link(actionUrl, "Start work trial")}`
      ),
    },
    candidate_session_reminder: {
      subject: "Reminder: finish your Fydell work trial",
      html: shell(
        `${h1("Session reminder")}${p(`Hi ${name},`)}${p(
          "Your Project Meridian session is still open. Finish when you have a focused block of time."
        )}${link(actionUrl, "Continue session")}`
      ),
    },
    candidate_submission_received: {
      subject: "We received your Fydell submission",
      html: shell(
        `${h1("Submission received")}${p(`Hi ${name},`)}${p(
          "Your work trial submission was received. The hiring team will review your evidence shortly."
        )}`
      ),
    },
    employer_session_submitted: {
      subject: `Candidate submitted — ${name || "session"}`,
      html: shell(
        `${h1("Candidate submitted")}${p(
          `A candidate has submitted their Project Meridian session for <strong style="color:#F4F5F7">${company}</strong>.`
        )}${link(actionUrl, "Open dashboard")}`
      ),
    },
    report_ready: {
      subject: `Evidence report ready — ${company || "Fydell"}`,
      html: shell(
        `${h1("Report ready")}${p(`Hi ${name},`)}${p(
          "A candidate evidence report is ready for review."
        )}${link(actionUrl, "View report")}`
      ),
    },
    invitation_expiring: {
      subject: "Your Fydell invitation expires soon",
      html: shell(
        `${h1("Invitation expiring")}${p(`Hi ${name},`)}${p(
          "Your invitation will expire soon. Accept it to keep access to your workspace."
        )}${link(actionUrl, "Accept invitation")}`
      ),
    },
    outcome_checkin_30_day: {
      subject: "30-day hire outcome check-in",
      html: shell(
        `${h1("30-day check-in")}${p(`Hi ${name},`)}${p(
          `Quick check-in on the hire outcome for <strong style="color:#F4F5F7">${company}</strong>. Your feedback helps calibrate Project Meridian.`
        )}${link(actionUrl, "Share outcome")}`
      ),
    },
    outcome_checkin_90_day: {
      subject: "90-day hire outcome check-in",
      html: shell(
        `${h1("90-day check-in")}${p(`Hi ${name},`)}${p(
          `90-day outcome check-in for <strong style="color:#F4F5F7">${company}</strong>.`
        )}${link(actionUrl, "Share outcome")}`
      ),
    },
    email_delivery_internal_failure: {
      subject: "Fydell email delivery failure",
      html: shell(
        `${h1("Delivery failure")}${p(
          `A transactional email failed permanently${reference ? ` (ref ${reference})` : ""}. Review the Email Center and retry if appropriate.`
        )}${link(adminUrl, "Open Email Center")}`
      ),
    },
  };

  return (
    templates[templateKey] || {
      subject: String(payload.subject || "Fydell notification"),
      html: shell(p(escapeHtml(String(payload.body || "")))),
    }
  );
}
