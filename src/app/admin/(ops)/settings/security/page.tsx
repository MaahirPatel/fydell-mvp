import { isMfaEnforcementEnabled } from "@/lib/ops/mfa";

export const dynamic = "force-dynamic";

export default function AdminSecurityMfaPage() {
  const enforced = isMfaEnforcementEnabled();

  return (
    <div className="max-w-2xl">
      <h1 className="text-[28px]" style={{ fontWeight: 540, letterSpacing: "-0.035em" }}>
        Security · MFA
      </h1>
      <p className="mt-2 text-[14px] text-[rgba(244,245,247,0.62)]">
        Platform administrators must enroll TOTP MFA before high-risk mutations are enabled in
        production.
      </p>

      <div className="mt-8 rounded-[14px] border border-[rgba(255,255,255,0.095)] p-5 text-[14px]">
        <p className="text-[12px] uppercase tracking-[0.05em] text-[rgba(244,245,247,0.4)]">
          Enforcement
        </p>
        <p className="mt-2">
          <span className={enforced ? "text-[#67D9A0]" : "text-[#E9B949]"}>
            ADMIN_MFA_REQUIRED={enforced ? "true" : "false"}
          </span>
        </p>
        <ol className="mt-5 list-decimal space-y-2 pl-5 text-[rgba(244,245,247,0.72)]">
          <li>
            Ensure <code className="text-[#F4F5F7]">admin@fydell.com</code> has accepted the
            Supabase Auth invitation (bootstrap script).
          </li>
          <li>
            In Supabase Dashboard → Authentication → Users, open the admin user and enable MFA /
            or sign in through Supabase Auth and enroll TOTP in Account → Security.
          </li>
          <li>
            Use an authenticator app (1Password, Google Authenticator, Authy) to store the TOTP
            secret.
          </li>
          <li>
            Set <code className="text-[#F4F5F7]">ADMIN_MFA_REQUIRED=true</code> in Vercel after
            enrollment is verified.
          </li>
          <li>
            Sensitive actions (grant/revoke super_admin, remove suppressions) will then require
            AAL2.
          </li>
        </ol>
        <p className="mt-5 text-[13px] text-[rgba(244,245,247,0.5)]">
          Transitional env-password admin login cannot satisfy AAL2 by itself. Long-term, admin
          access should use Supabase Auth + MFA exclusively.
        </p>
      </div>
    </div>
  );
}
