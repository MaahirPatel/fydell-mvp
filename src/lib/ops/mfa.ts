import "server-only";
import type { PlatformAdminContext } from "@/lib/ops/platform-roles";

export function isMfaEnforcementEnabled(): boolean {
  return process.env.ADMIN_MFA_REQUIRED === "true";
}

/**
 * When ADMIN_MFA_REQUIRED=true, sensitive mutations need a Supabase session at
 * AAL2. The transitional env-credential cookie can never satisfy this.
 */
export function requireAal2ForSensitiveAction(
  ctx: PlatformAdminContext
): { ok: true } | { ok: false; error: string } {
  if (!isMfaEnforcementEnabled()) return { ok: true };
  if (ctx.mfaVerified) return { ok: true };
  return {
    ok: false,
    error:
      "Multi-factor verification is required for this action. Sign in with your Fydell account and complete the authenticator check, then retry.",
  };
}
