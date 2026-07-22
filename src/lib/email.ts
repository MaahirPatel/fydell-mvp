import "server-only";
import { Resend } from "resend";
import { appUrl } from "@/lib/app-url";

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) return null;
  return new Resend(key);
}

/** Truthful email-capability check — used to avoid claiming "Sent" when no provider exists. */
export function isResendConfigured(): boolean {
  return client() !== null;
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
  const logo = logoUrl();
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
      Fydell — real work, not interviews<br/>
      <a href="${appUrl()}" style="color:#6B7488">${appUrl().replace(/^https?:\/\//, "")}</a>
    </p>
  </div>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#3B5BFF;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:10px">${label}</a>`;

export async function sendResendHtml(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const c = client();
  if (!c) return { ok: false, error: "RESEND_API_KEY is not configured" };

  try {
    const { data, error } = await c.emails.send({
      from: transactionalFrom(),
      to: params.to,
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
    <p style="margin:0 0 22px">${button(params.resetUrl, "Choose a new password")}</p>
    <p style="color:#6B7488;font-size:13px;line-height:1.6;margin:0">
      If you did not request this, you can ignore this email.<br/><br/>
      Or paste this link into your browser:<br/>
      <a href="${params.resetUrl}" style="color:#3B5BFF;word-break:break-all">${params.resetUrl}</a>
    </p>`;

  return sendResendHtml({
    to: params.to,
    subject: "Reset your Fydell password",
    html: fydellEmailShell(inner),
  });
}

/** Legacy helpers used by older invite paths */
export async function sendInviteEmail(params: {
  to: string;
  name: string;
  employerName: string;
  role: string;
  inviteUrl: string;
}): Promise<boolean> {
  const inner = `
    <h1 style="color:#08090C;font-size:22px;margin:0 0 12px">You've been invited to a Fydell simulation</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${params.name},</p>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 18px">
      ${params.employerName} has invited you to complete a simulation for the
      <strong>${params.role}</strong> role.
    </p>
    <p style="margin:0 0 22px">${button(params.inviteUrl, "Start the simulation")}</p>`;

  const result = await sendResendHtml({
    to: params.to,
    subject: `${params.employerName}: your Fydell work trial`,
    html: fydellEmailShell(inner),
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
      <strong>${params.employerName}</strong> submitted feedback.
      Average rating: <strong>${params.averageRating.toFixed(1)} / 5</strong>.
    </p>`;

  const result = await sendResendHtml({
    to: params.to,
    subject: `Fydell: feedback from ${params.employerName}`,
    html: fydellEmailShell(inner),
  });
  return result.ok;
}
