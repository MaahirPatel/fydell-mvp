import "server-only";
import { Resend } from "resend";
import { appUrl } from "@/lib/app-url";
import { escapeHtml, routeRecipient, safeHref } from "@/lib/email-html";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export { escapeHtml, safeHref } from "@/lib/email-html";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) return null;
  return new Resend(key);
}

/** Truthful email-capability check - used to avoid claiming "Sent" when no provider exists. */
export function isResendConfigured(): boolean {
  return client() !== null;
}

/** Production deployments only; Vercel previews and local development count as non-production. */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";
}

export function transactionalFrom(): string {
  return (
    process.env.EMAIL_FROM_TRANSACTIONAL ||
    process.env.EMAIL_FROM ||
    "Fydell <onboarding@resend.dev>"
  );
}

function logoUrl(): string {
  return `${appUrl()}/brand/fydell-mark.png`;
}

export function fydellEmailShell(inner: string): string {
  const logo = safeHref(logoUrl());
  const home = safeHref(appUrl());
  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#F4F6F9;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E2E6EE;border-radius:16px;overflow:hidden">
      <div style="background:#08090C;padding:22px 28px;display:flex;align-items:center;gap:12px">
        <img src="${logo}" width="36" height="36" alt="Fydell" style="display:block;border-radius:8px" />
        <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:-0.02em">Fydell</span>
      </div>
      <div style="padding:28px">${inner}</div>
    </div>
    <p style="text-align:center;color:#6B7488;font-size:12px;margin-top:18px">
      Fydell - real work, not interviews<br/>
      <a href="${home}" style="color:#6B7488">${escapeHtml(appUrl().replace(/^https?:\/\//, ""))}</a>
    </p>
  </div>`;
}

/** A call-to-action link. The label is plain text and is escaped here. */
export function emailButton(href: string, label: string): string {
  return `<a href="${safeHref(href)}" style="display:inline-block;background:#3B5BFF;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:10px">${escapeHtml(label)}</a>`;
}

export async function sendResendHtml(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "RESEND_API_KEY is not configured" };
  const route = routeRecipient(params.to, isProductionDeployment());
  if ("refused" in route) return { ok: false, error: route.refused };

  try {
    const { data, error } = await c.emails.send({
      from: transactionalFrom(),
      to: route.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo || process.env.EMAIL_REPLY_TO || undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

export type TrackedDelivery = "sent" | "failed" | "not_configured";

/** Template keys for mail sent immediately; the outbox worker never re-renders or retries these. */
export const DIRECT_TEMPLATE_PREFIX = "direct:";

/**
 * Sends now, so the caller can tell the user exactly what happened, and records
 * the attempt in email_outbox so provider webhooks (delivered, bounced) and the
 * admin Email Center see it. The body is not stored: it can carry single-use links.
 * Suppressed recipients are not contacted.
 */
export async function sendTrackedEmail(params: {
  to: string;
  subject: string;
  html: string;
  template: string;
  eventType: string;
  idempotencyKey: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  recipientName?: string | null;
}): Promise<{ delivery: TrackedDelivery; outboxId: string | null; error?: string }> {
  if (!isResendConfigured()) return { delivery: "not_configured", outboxId: null };
  const recipient = params.to.trim().toLowerCase();
  const db = isSupabaseConfigured() ? getSupabaseAdmin() : null;

  if (db) {
    const { data: suppressed } = await db.from("email_suppressions").select("id").eq("email", recipient).is("resolved_at", null).maybeSingle();
    if (suppressed) return { delivery: "failed", outboxId: null, error: "This address bounced or complained before, so Fydell no longer emails it." };
  }

  let outboxId: string | null = null;
  if (db) {
    const { data } = await db
      .from("email_outbox")
      .upsert(
        {
          event_type: params.eventType,
          template_key: `${DIRECT_TEMPLATE_PREFIX}${params.template}`,
          recipient_email: recipient,
          recipient_name: params.recipientName ?? null,
          subject_override: params.subject.slice(0, 300),
          payload: {},
          related_entity_type: params.relatedEntityType ?? null,
          related_entity_id: params.relatedEntityId ?? null,
          idempotency_key: params.idempotencyKey,
          status: "processing",
          attempt_count: 1,
          last_error: null,
          provider_message_id: null,
        },
        { onConflict: "idempotency_key" }
      )
      .select("id")
      .single();
    outboxId = (data?.id as string | undefined) ?? null;
  }

  const sent = await sendResendHtml({ to: recipient, subject: params.subject, html: params.html });
  if (db && outboxId) {
    await db
      .from("email_outbox")
      .update(
        sent.ok
          ? { status: "sent", provider_message_id: sent.id ?? null, sent_at: new Date().toISOString(), last_error: null }
          : { status: "failed", last_error: (sent.error ?? "Send failed").slice(0, 500), attempt_count: 5 }
      )
      .eq("id", outboxId);
  }
  return sent.ok ? { delivery: "sent", outboxId } : { delivery: "failed", outboxId, error: sent.error };
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const inner = `
    <h1 style="color:#08090C;font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Reset your password</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 18px">
      We received a request to reset the password for your Fydell account.
      Click the button below to choose a new password. This link expires soon.
    </p>
    <p style="margin:0 0 22px">${emailButton(params.resetUrl, "Choose a new password")}</p>
    <p style="color:#6B7488;font-size:13px;line-height:1.6;margin:0">
      If you did not request this, you can ignore this email.<br/><br/>
      Or paste this link into your browser:<br/>
      <a href="${safeHref(params.resetUrl)}" style="color:#3B5BFF;word-break:break-all">${escapeHtml(params.resetUrl)}</a>
    </p>`;

  return sendResendHtml({
    to: params.to,
    subject: "Reset your Fydell password",
    html: fydellEmailShell(inner),
  });
}

/** Body of the legacy simulation invite (pure, exported for tests). */
export function inviteEmailHtml(params: { name: string; employerName: string; role: string; inviteUrl: string }): string {
  return `
    <h1 style="color:#08090C;font-size:22px;margin:0 0 12px">You've been invited to a Fydell simulation</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${escapeHtml(params.name)},</p>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 18px">
      ${escapeHtml(params.employerName)} has invited you to complete a simulation for the
      <strong>${escapeHtml(params.role)}</strong> role.
    </p>
    <p style="margin:0 0 22px">${emailButton(params.inviteUrl, "Start the simulation")}</p>`;
}

/** Legacy helpers used by older invite paths */
export async function sendInviteEmail(params: {
  to: string;
  name: string;
  employerName: string;
  role: string;
  inviteUrl: string;
}): Promise<boolean> {
  const result = await sendResendHtml({
    to: params.to,
    subject: `${params.employerName}: your Fydell work trial`,
    html: fydellEmailShell(inviteEmailHtml(params)),
  });
  return result.ok;
}

export async function sendFeedbackNotification(params: {
  to: string;
  employerName: string;
  averageRating: number;
}): Promise<boolean> {
  const inner = `
    <h1 style="color:#08090C;font-size:22px;margin:0 0 12px">New employer feedback</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0">
      <strong>${escapeHtml(params.employerName)}</strong> submitted feedback.
      Average rating: <strong>${escapeHtml(params.averageRating.toFixed(1))} / 5</strong>.
    </p>`;

  const result = await sendResendHtml({
    to: params.to,
    subject: `Fydell: feedback from ${params.employerName}`,
    html: fydellEmailShell(inner),
  });
  return result.ok;
}
