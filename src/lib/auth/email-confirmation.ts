import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProductionDeployment } from "@/lib/email";
import { appUrl } from "@/lib/app-url";
import { withNext } from "@/lib/auth/safe-next";

/**
 * Production always requires a confirmed email address. Elsewhere accounts are
 * confirmed on creation so local and preview testing does not depend on a
 * mailer, unless FYDELL_REQUIRE_EMAIL_CONFIRMATION=true opts a non-production
 * environment into the production behavior.
 */
export function emailConfirmationRequired(): boolean {
  if (isProductionDeployment()) return true;
  return process.env.FYDELL_REQUIRE_EMAIL_CONFIRMATION === "true";
}

export function confirmationRedirect(next: string | null): string {
  return `${appUrl()}${withNext("/auth/callback", next)}`;
}

export function checkEmailPath(email: string, next: string | null): string {
  const path = withNext("/auth/check-email", next);
  return `${path}${path.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}`;
}

/** Sends (or re-sends) the confirmation link through Supabase Auth's mailer. */
export async function sendConfirmationEmail(supabase: SupabaseClient, email: string, next: string | null): Promise<{ ok: boolean }> {
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmationRedirect(next) } });
  if (error) console.error(`[email-confirmation] resend failed: ${error.message}`);
  return { ok: !error };
}

export function isEmailNotConfirmed(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "email_not_confirmed" || /email not confirmed|not confirmed|confirm your email/i.test(error.message ?? "");
}
