import AuthShell from "@/components/auth/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/contact";

const REASONS: Record<string, string> = {
  unaffiliated:
    "Your account is active, but you have not chosen how you use Fydell yet. Pick hiring or developer to continue. If you were invited to a task, open the invitation link again.",
  awaiting_org_approval:
    "Your company setup was received and is awaiting Fydell approval before mission invitations are enabled.",
  partner_pending:
    "Your partner application was received. Partner access is approval-gated - we'll follow up once it's reviewed.",
  no_org: "Your account is not part of a hiring workspace yet. Ask a workspace owner to add you, or choose how you use Fydell.",
  org_create_failed: "We could not create your workspace. Try again, or contact us and we will set it up.",
  no_user_or_supabase: "We could not resolve your workspace. Sign in again or contact support.",
};

export default async function SetupRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason || "unaffiliated";
  const copy = REASONS[reason] || REASONS.unaffiliated;

  return (
    <AuthShell title="One more step" description={copy}>
      <div className="flex flex-wrap gap-3">
        {reason === "partner_pending" ? null : (
          <ButtonLink href="/signup/role" variant="primary" size="lg">
            Choose how you use Fydell
          </ButtonLink>
        )}
        <ButtonLink href={CONTACT_MAILTO} variant="secondary" size="lg">
          Contact {CONTACT_EMAIL}
        </ButtonLink>
        <ButtonLink href="/api/platform/logout" variant="quiet" size="lg">
          Sign out
        </ButtonLink>
      </div>
    </AuthShell>
  );
}
