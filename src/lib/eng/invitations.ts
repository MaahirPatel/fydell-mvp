import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Admin, EngMember } from "./context";
import { recordEngEvent } from "./events";
import { scenarioForVersionId } from "./scenario-versions";
import type { AttemptRow, InvitationRow, RoleRow, RoleSnapshot } from "./types";
import { appUrl } from "@/lib/app-url";
import { fydellEmailShell, isResendConfigured, sendResendHtml } from "@/lib/email";
import { notifyUser } from "@/lib/notifications/store";
import { normalizeHandle } from "@/lib/profile/handle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const INVITE_TTL_DAYS = 14;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function mintToken(): string {
  return randomBytes(24).toString("base64url");
}

export function inviteUrl(token: string): string {
  return `${appUrl()}/assess/invite/${token}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function normalizeCandidate(emailRaw: unknown, nameRaw: unknown): { email: string; name: string | null } | { error: string } {
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Enter a valid email address." };
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (name.length > 120) return { error: "Keep the name under 120 characters." };
  return { email, name: name || null };
}

export type InviteCandidate = { email: string; name: string | null; handle?: string; userId?: string };

/**
 * Finds the engineer behind an @handle. The email is read server-side from
 * their account so the employer can invite without ever seeing it.
 */
export async function resolveHandleCandidate(db: Admin, raw: string): Promise<InviteCandidate | { error: string }> {
  const normalized = normalizeHandle(raw);
  if ("error" in normalized) return { error: normalized.error };
  const { data: profile } = await db
    .from("engineer_profiles")
    .select("owner_id, display_name")
    .eq("handle", normalized.handle)
    .maybeSingle();
  if (!profile) return { error: `No engineer on Fydell has the handle @${normalized.handle}.` };
  const { data: account } = await db.auth.admin.getUserById(profile.owner_id as string);
  const email = account.user?.email?.toLowerCase();
  if (!email) return { error: `@${normalized.handle} cannot receive invitations right now.` };
  const name = typeof profile.display_name === "string" && profile.display_name.trim() ? profile.display_name.trim().slice(0, 120) : null;
  return { email, name, handle: normalized.handle, userId: profile.owner_id as string };
}

async function deliver(invitation: InvitationRow, token: string, organizationName: string): Promise<InvitationRow["email_delivery"]> {
  if (!isResendConfigured()) return "not_configured";
  const url = inviteUrl(token);
  const hello = invitation.candidate_name ? ` ${escapeHtml(invitation.candidate_name)}` : "";
  const sent = await sendResendHtml({
    to: invitation.candidate_email,
    subject: `${organizationName} invited you to a Fydell engineering task`,
    html: fydellEmailShell(
      `<p style="margin:0 0 12px">Hi${hello},</p>
       <p style="margin:0 0 12px"><strong>${escapeHtml(organizationName)}</strong> invited you to a practical backend task: <strong>${escapeHtml(invitation.role_snapshot.title)}</strong>. You work locally in your own editor for about 50 minutes, then upload your project.</p>
       <p style="margin:0 0 20px"><a href="${url}" style="background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Review the invitation</a></p>
       <p style="margin:0;color:#6B7280;font-size:13px">Nothing starts until you finish setup and press Start. This link expires ${new Date(invitation.expires_at).toUTCString()}.</p>`
    ),
  });
  if (!sent.ok) console.error(`[eng] invitation ${invitation.id} email failed: ${sent.error ?? "unknown error"}`);
  return sent.ok ? "sent" : "failed";
}

export async function createInvitation(
  db: Admin,
  member: EngMember,
  role: RoleRow,
  candidate: InviteCandidate
): Promise<{ invitation: InvitationRow; url: string }> {
  if (role.status !== "published") throw new Error("Publish the role before inviting candidates.");
  const { definition, row } = await scenarioForVersionId(db, role.scenario_version_id);
  const snapshot: RoleSnapshot = {
    title: role.title,
    companyContext: role.company_context,
    organizationName: member.organizationName,
    scenarioKey: row.scenario_key,
    scenarioVersion: row.version,
  };
  const token = mintToken();
  const { data, error } = await db
    .from("eng_invitations")
    .insert({
      organization_id: member.organizationId,
      role_id: role.id,
      scenario_version_id: role.scenario_version_id,
      candidate_email: candidate.email,
      candidate_name: candidate.name,
      candidate_handle: candidate.handle ?? null,
      token_hash: hashInviteToken(token),
      status: "invited",
      role_snapshot: snapshot,
      allowed_minutes: definition.defaultAllowedMinutes,
      expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString(),
      invited_by: member.userId,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("This candidate already has an active invitation for this role. Resend or withdraw it instead.");
    throw new Error(`Could not create invitation: ${error.message}`);
  }
  const invitation = data as InvitationRow;
  const delivery = await deliver(invitation, token, member.organizationName);
  await db.from("eng_invitations").update({ email_delivery: delivery }).eq("id", invitation.id);
  if (candidate.userId) {
    await notifyUser(candidate.userId, {
      kind: "invitation_received",
      title: `${member.organizationName} invited you to a task`,
      body: `${role.title}. Review the details and start when you are ready.`,
      href: `/assess/invitations/${invitation.id}`,
    });
  }
  return { invitation: { ...invitation, email_delivery: delivery }, url: inviteUrl(token) };
}

export async function getInvitationForOrg(db: Admin, id: string, organizationId: string): Promise<InvitationRow | null> {
  const { data } = await db.from("eng_invitations").select("*").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  return (data as InvitationRow) ?? null;
}

/** Resend replaces the token (the old link stops working) and never creates a second attempt. */
export async function resendInvitation(db: Admin, member: EngMember, invitation: InvitationRow): Promise<{ invitation: InvitationRow; url: string }> {
  if (invitation.status !== "invited") throw new Error("Only invitations that have not been accepted can be resent.");
  const token = mintToken();
  const { data, error } = await db
    .from("eng_invitations")
    .update({
      token_hash: hashInviteToken(token),
      resend_count: invitation.resend_count + 1,
      expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString(),
    })
    .eq("id", invitation.id)
    .eq("status", "invited")
    .select("*")
    .single();
  if (error || !data) throw new Error("Could not resend the invitation. Reload and try again.");
  const updated = data as InvitationRow;
  const delivery = await deliver(updated, token, member.organizationName);
  await db.from("eng_invitations").update({ email_delivery: delivery }).eq("id", updated.id);
  return { invitation: { ...updated, email_delivery: delivery }, url: inviteUrl(token) };
}

export async function withdrawInvitation(db: Admin, member: EngMember, invitation: InvitationRow, reason: string): Promise<void> {
  if (invitation.status === "withdrawn") return;
  const { data: attempt } = await db.from("eng_attempts").select("id, status").eq("invitation_id", invitation.id).maybeSingle();
  if (attempt?.status === "submitted") throw new Error("This candidate already submitted. Record a decision instead of withdrawing.");
  const now = new Date().toISOString();
  const { error } = await db
    .from("eng_invitations")
    .update({ status: "withdrawn", withdrawn_at: now, withdrawn_by: member.userId })
    .eq("id", invitation.id)
    .in("status", ["invited", "accepted", "expired"]);
  if (error) throw new Error(`Could not withdraw: ${error.message}`);
  if (attempt) {
    await db.from("eng_attempts").update({ status: "withdrawn" }).eq("id", attempt.id).neq("status", "submitted");
    await recordEngEvent(db, attempt.id as string, {
      type: "attempt_withdrawn",
      actor: "employer",
      actorUserId: member.userId,
      actorEmail: member.email,
      payload: { reason: reason.slice(0, 500) },
    });
  }
}

export async function getInvitationByToken(db: Admin, token: string): Promise<InvitationRow | null> {
  if (!token || token.length > 100) return null;
  const { data } = await db.from("eng_invitations").select("*").eq("token_hash", hashInviteToken(token)).maybeSingle();
  return (data as InvitationRow) ?? null;
}

export function invitationUsable(inv: InvitationRow, now = new Date()): { ok: true } | { ok: false; reason: string } {
  if (inv.status === "withdrawn") return { ok: false, reason: "This invitation was withdrawn by the employer." };
  if (inv.status === "expired" || new Date(inv.expires_at) <= now) return { ok: false, reason: "This invitation has expired. Ask the employer to resend it." };
  return { ok: true };
}

/**
 * Deliberate acceptance by the addressed candidate. Idempotent: accepting
 * again returns the same attempt, and a second account can never take it over.
 */
export async function acceptInvitation(db: Admin, token: string, user: { id: string; email: string }): Promise<AttemptRow> {
  const inv = await getInvitationByToken(db, token);
  if (!inv) throw new Error("Invitation not found. Check the link, or ask the employer to resend it.");
  return acceptLoaded(db, inv, user);
}

/**
 * The signed-in candidate's path from their dashboard, without the emailed
 * link. Only the addressed email can see or accept it.
 */
export async function getInvitationForCandidate(db: Admin, invitationId: string, email: string): Promise<InvitationRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(invitationId)) return null;
  const { data } = await db.from("eng_invitations").select("*").eq("id", invitationId).maybeSingle();
  const inv = (data as InvitationRow) ?? null;
  return inv && inv.candidate_email === email.toLowerCase() ? inv : null;
}

export async function acceptInvitationById(db: Admin, invitationId: string, user: { id: string; email: string }): Promise<AttemptRow> {
  const inv = await getInvitationForCandidate(db, invitationId, user.email);
  if (!inv) throw new Error("Invitation not found for this account.");
  return acceptLoaded(db, inv, user);
}

async function acceptLoaded(db: Admin, inv: InvitationRow, user: { id: string; email: string }): Promise<AttemptRow> {
  const { data: existing } = await db.from("eng_attempts").select("*").eq("invitation_id", inv.id).maybeSingle();
  if (existing) {
    if (existing.candidate_user_id !== user.id) throw new Error("This invitation was already accepted by another account.");
    return existing as AttemptRow;
  }
  const usable = invitationUsable(inv);
  if (usable.ok === false) throw new Error(usable.reason);
  if (user.email.toLowerCase() !== inv.candidate_email) {
    throw new Error(`This invitation was sent to ${inv.candidate_email}. Sign in with that email to accept it.`);
  }
  const { data, error } = await db
    .from("eng_attempts")
    .insert({
      invitation_id: inv.id,
      organization_id: inv.organization_id,
      role_id: inv.role_id,
      scenario_version_id: inv.scenario_version_id,
      candidate_user_id: user.id,
      status: "accepted",
      allowed_minutes: inv.allowed_minutes,
    })
    .select("*")
    .single();
  if (error) {
    const { data: raced } = await db.from("eng_attempts").select("*").eq("invitation_id", inv.id).maybeSingle();
    if (raced && raced.candidate_user_id === user.id) return raced as AttemptRow;
    throw new Error("Could not accept the invitation. Try again.");
  }
  await db
    .from("eng_invitations")
    .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", inv.id)
    .eq("status", "invited");
  await recordEngEvent(db, data.id, {
    type: "invitation_accepted",
    actor: "candidate",
    actorUserId: user.id,
    clientEventId: `accept_${data.id}`,
  });
  return data as AttemptRow;
}
