import "server-only";
import { Resend } from "resend";

// Returns false (instead of throwing) when email isn't configured, so the rest
// of a flow can proceed and surface a "copy the link manually" fallback.

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("re_your")) return null;
  return new Resend(key);
}

const FROM = process.env.EMAIL_FROM ?? "Fydell <noreply@fydell.com>";

const shell = (inner: string) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#F4F6F9;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E2E6EE;border-radius:16px;overflow:hidden">
      <div style="background:#1B2550;padding:22px 28px">
        <span style="color:#fff;font-weight:700;font-size:18px;letter-spacing:-0.01em">fydell</span>
      </div>
      <div style="padding:28px">${inner}</div>
    </div>
    <p style="text-align:center;color:#6B7488;font-size:12px;margin-top:18px">Fydell - real work, not interviews</p>
  </div>`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#1B2550;color:#fff;text-decoration:none;font-weight:600;padding:13px 22px;border-radius:12px">${label}</a>`;

export async function sendInviteEmail(params: {
  to: string;
  name: string;
  employerName: string;
  role: string;
  inviteUrl: string;
}): Promise<boolean> {
  const c = client();
  if (!c) return false;

  const inner = `
    <h1 style="font-family:'Sora',Inter,sans-serif;color:#1B2550;font-size:22px;margin:0 0 12px">You've been invited to a Fydell simulation</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 8px">Hi ${params.name},</p>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 18px">
      ${params.employerName} has invited you to complete a 25-minute analyst simulation for the
      <strong>${params.role}</strong> role. This isn't an interview - it's real financial work, and
      we measure how you think. Use any tools you like, including AI.
    </p>
    <p style="margin:0 0 22px">${button(params.inviteUrl, "Start the simulation")}</p>
    <p style="color:#6B7488;font-size:13px;line-height:1.6;margin:0">
      Or paste this link into your browser:<br>
      <a href="${params.inviteUrl}" style="color:#2563EB">${params.inviteUrl}</a>
    </p>`;

  try {
    await c.emails.send({
      from: FROM,
      to: params.to,
      subject: `${params.employerName}: your Fydell analyst simulation`,
      html: shell(inner)
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendFeedbackNotification(params: {
  to: string;
  employerName: string;
  averageRating: number;
}): Promise<boolean> {
  const c = client();
  if (!c) return false;

  const inner = `
    <h1 style="font-family:'Sora',Inter,sans-serif;color:#1B2550;font-size:22px;margin:0 0 12px">New employer feedback</h1>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 8px">
      <strong>${params.employerName}</strong> just submitted feedback on the pilot.
    </p>
    <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0">
      Average rating across the three questions: <strong>${params.averageRating.toFixed(1)} / 5</strong>.
      Sign in to the admin dashboard to read their comments.
    </p>`;

  try {
    await c.emails.send({
      from: FROM,
      to: params.to,
      subject: `Fydell: feedback from ${params.employerName}`,
      html: shell(inner)
    });
    return true;
  } catch {
    return false;
  }
}
