/**
 * Candidate invitation email copy (pure).
 *
 * Describes the assessment the candidate was actually invited to, never a
 * hard-coded one, and escapes every employer- or candidate-supplied value
 * before it enters HTML (SEC-07).
 */

import { escapeHtml } from "./submission-files";

export interface InvitationCopyInput {
  organizationName: string;
  candidateName?: string | null;
  simulationTitle: string;
  roleTitle: string;
  durationMinutes: number;
  /** Engineering scenarios run in the Fydell desktop app. */
  requiresDesktop: boolean;
  inviteUrl: string;
  expiresAt: string;
}

export function invitationEmailCopy(input: InvitationCopyInput): { subject: string; html: string } {
  const org = escapeHtml(input.organizationName);
  const who = input.candidateName ? ` ${escapeHtml(input.candidateName)}` : "";
  const role = escapeHtml(input.roleTitle);
  const title = escapeHtml(input.simulationTitle);
  const href = escapeHtml(input.inviteUrl);
  const expires = escapeHtml(new Date(input.expiresAt).toLocaleDateString("en-US", { dateStyle: "medium" }));
  const minutes = Math.max(1, Math.round(input.durationMinutes));
  const how = input.requiresDesktop
    ? `It is a ${minutes}-minute ${role} work simulation (&ldquo;${title}&rdquo;) that runs in the Fydell desktop app. The invitation page explains how to install it; setup and a practice check happen before the timer starts, and you do not need to install Python or any other tools.`
    : `It is a ${minutes}-minute ${role} work simulation (&ldquo;${title}&rdquo;).`;
  return {
    subject: `${input.organizationName} invited you to a Fydell work simulation`.slice(0, 200),
    html: `<p style="margin:0 0 12px">Hi${who},</p>
<p style="margin:0 0 12px"><strong>${org}</strong> invited you to complete a work simulation on Fydell. ${how}</p>
<p style="margin:0 0 20px"><a href="${href}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review the invitation</a></p>
<p style="margin:0;color:#6B7280;font-size:13px">Nothing starts until you consent and press Start. This link expires ${expires}.</p>`,
  };
}
