import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fydellEmailShell, isResendConfigured, sendResendHtml } from "@/lib/email";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Inbox verification for invitations that are matched to an account by email.
 *
 * Signup is instant and accounts are auto-confirmed, so an account's email
 * says nothing about who controls that inbox. Accepting an email-matched
 * invitation therefore needs a separate proof: a one-time code Fydell sends
 * to the address, entered back by the signed-in account. Invitation links do
 * not count, because the employer is shown the same link to copy and share.
 *
 * Without an email provider, development writes the code to the server log;
 * production refuses to issue a code it cannot deliver.
 */

export const CODE_TTL_MS = 15 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODES_PER_HOUR = 5;

type Account = { id: string; email: string };

export class InboxVerificationRequiredError extends Error {
  readonly code = "email_unverified";
  readonly email: string;
  constructor(email: string) {
    super(`Confirm that you control ${email} before accepting this invitation.`);
    this.name = "InboxVerificationRequiredError";
    this.email = email;
  }
}

export function inboxVerificationResponse(err: InboxVerificationRequiredError): NextResponse {
  return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function codeHash(userId: string, email: string, code: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("Email verification is not configured on this server.");
  return createHmac("sha256", key).update(`inbox-code:${userId}:${email}:${code}`).digest("hex");
}

export async function isInboxVerified(user: Account): Promise<boolean> {
  const email = normalizedEmail(user.email);
  if (!user.id || !email) return false;
  const { data } = await createAdminSupabaseClient()
    .from("email_inbox_verifications")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("email", email)
    .maybeSingle();
  return Boolean(data);
}

export async function assertInboxVerified(user: Account): Promise<void> {
  if (!(await isInboxVerified(user))) throw new InboxVerificationRequiredError(normalizedEmail(user.email));
}

export type SendCodeResult =
  | { ok: true; delivery: "email" | "dev_log"; expiresAt: string }
  | { ok: true; delivery: "already_verified" }
  | { ok: false; reason: "cooldown" | "hourly_limit"; retryAfterSeconds: number }
  | { ok: false; reason: "no_email" | "email_unavailable" | "send_failed" };

export async function sendInboxCode(user: Account, now = new Date()): Promise<SendCodeResult> {
  const email = normalizedEmail(user.email);
  if (!user.id || !email) return { ok: false, reason: "no_email" };
  if (await isInboxVerified(user)) return { ok: true, delivery: "already_verified" };

  const db = createAdminSupabaseClient();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentError } = await db
    .from("email_verification_codes")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", hourAgo)
    .order("created_at", { ascending: false });
  if (recentError) throw new Error("Could not check recent verification codes.");
  const rows = recent ?? [];
  const latest = rows[0] ? new Date(rows[0].created_at as string).getTime() : 0;
  if (latest && now.getTime() - latest < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "cooldown", retryAfterSeconds: Math.ceil((latest + RESEND_COOLDOWN_MS - now.getTime()) / 1000) };
  }
  if (rows.length >= MAX_CODES_PER_HOUR) {
    const oldest = new Date(rows[rows.length - 1].created_at as string).getTime();
    return { ok: false, reason: "hourly_limit", retryAfterSeconds: Math.max(1, Math.ceil((oldest + 60 * 60 * 1000 - now.getTime()) / 1000)) };
  }

  const delivery: "email" | "dev_log" | null = isResendConfigured()
    ? "email"
    : process.env.NODE_ENV !== "production"
      ? "dev_log"
      : null;
  if (!delivery) return { ok: false, reason: "email_unavailable" };

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS).toISOString();
  const nowIso = now.toISOString();
  await db
    .from("email_verification_codes")
    .update({ consumed_at: nowIso })
    .eq("user_id", user.id)
    .is("consumed_at", null);
  const { data: row, error } = await db
    .from("email_verification_codes")
    .insert({ user_id: user.id, email, code_hash: codeHash(user.id, email, code), expires_at: expiresAt, created_at: nowIso })
    .select("id")
    .single();
  if (error || !row) throw new Error("Could not create a verification code.");

  if (delivery === "dev_log") {
    console.info(`[email-verification] development only, email is not configured. Code for ${email}: ${code} (expires ${expiresAt})`);
    return { ok: true, delivery, expiresAt };
  }

  const sent = await sendResendHtml({
    to: email,
    subject: `${code} is your Fydell confirmation code`,
    html: fydellEmailShell(
      `<h1 style="color:#08090C;font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">Confirm your email</h1>
       <p style="color:#3A445C;font-size:15px;line-height:1.6;margin:0 0 18px">Enter this code on Fydell to confirm that this address is yours. It expires in 15 minutes.</p>
       <p style="font-size:28px;font-weight:600;letter-spacing:0.2em;color:#08090C;margin:0 0 18px">${code}</p>
       <p style="color:#6B7488;font-size:13px;line-height:1.6;margin:0">If you did not ask for this, you can ignore this email. Nobody can accept an invitation for you without this code.</p>`
    ),
  });
  if (!sent.ok) {
    await db.from("email_verification_codes").update({ consumed_at: nowIso }).eq("id", row.id);
    console.error(`[email-verification] send failed for user ${user.id}: ${sent.error ?? "unknown error"}`);
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true, delivery, expiresAt };
}

export type ConfirmCodeResult =
  | { ok: true }
  | { ok: false; reason: "invalid_format" | "no_code" | "expired" | "too_many_attempts" }
  | { ok: false; reason: "wrong_code"; attemptsLeft: number };

export async function confirmInboxCode(user: Account, codeRaw: string, now = new Date()): Promise<ConfirmCodeResult> {
  const email = normalizedEmail(user.email);
  const code = codeRaw.trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid_format" };
  if (!user.id || !email) return { ok: false, reason: "no_code" };

  const db = createAdminSupabaseClient();
  const { data: row } = await db
    .from("email_verification_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("user_id", user.id)
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, reason: "no_code" };
  if (new Date(row.expires_at as string).getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  const attempts = row.attempts as number;
  if (attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const expected = Buffer.from(row.code_hash as string, "hex");
  const actual = Buffer.from(codeHash(user.id, email, code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await db
      .from("email_verification_codes")
      .update({ attempts: attempts + 1 })
      .eq("id", row.id)
      .eq("attempts", attempts);
    const left = MAX_CODE_ATTEMPTS - attempts - 1;
    return left > 0 ? { ok: false, reason: "wrong_code", attemptsLeft: left } : { ok: false, reason: "too_many_attempts" };
  }

  const { data: consumed } = await db
    .from("email_verification_codes")
    .update({ consumed_at: now.toISOString() })
    .eq("id", row.id)
    .eq("attempts", attempts)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (!consumed) return { ok: false, reason: "no_code" };

  const { error } = await db
    .from("email_inbox_verifications")
    .upsert({ user_id: user.id, email, method: "email_code", verified_at: now.toISOString() }, { onConflict: "user_id,email" });
  if (error) throw new Error("Could not record the email confirmation.");
  return { ok: true };
}

export function sendCodeFailureMessage(reason: Exclude<SendCodeResult, { ok: true }>["reason"]): string {
  switch (reason) {
    case "cooldown":
      return "A code was just sent. Wait a minute before asking for another.";
    case "hourly_limit":
      return "Too many codes were requested for this account. Try again later.";
    case "no_email":
      return "This account has no email address to confirm.";
    case "email_unavailable":
      return "Fydell cannot send email right now, so the code could not be sent. Try again later or contact support.";
    case "send_failed":
      return "The code email could not be sent. Try again in a minute.";
  }
}

export function confirmCodeFailureMessage(result: Exclude<ConfirmCodeResult, { ok: true }>): string {
  switch (result.reason) {
    case "invalid_format":
      return "Enter the 6-digit code from the email.";
    case "no_code":
      return "There is no active code for this account. Send a new one.";
    case "expired":
      return "That code has expired. Send a new one.";
    case "too_many_attempts":
      return "Too many wrong codes. Send a new one.";
    case "wrong_code":
      return `That code is not right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left.`;
  }
}
