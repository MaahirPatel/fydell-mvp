import "server-only";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";

export function isMfaEnforcementEnabled(): boolean {
  return process.env.ADMIN_MFA_REQUIRED === "true";
}

/**
 * Transitional admin sessions use a signed cookie (env credentials), not Supabase AAL2.
 * When ADMIN_MFA_REQUIRED=true, sensitive mutations must be blocked until admins
 * authenticate via Supabase Auth with TOTP (AAL2) — track via ctx.mfaVerified.
 */
export function requireAal2ForSensitiveAction(
  ctx: PlatformAdminContext & { mfaVerified?: boolean }
): { ok: true } | { ok: false; error: string } {
  if (!isMfaEnforcementEnabled()) return { ok: true };
  if (ctx.mfaVerified) return { ok: true };
  return {
    ok: false,
    error:
      "MFA (AAL2) is required for this action. Enroll TOTP for admin@fydell.com and sign in with Supabase Auth MFA before retrying.",
  };
}
