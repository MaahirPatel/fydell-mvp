import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { ButtonLink } from "@/components/ui/Button";
import { PendingMemberships } from "@/components/eng/TeamManager";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { engAdmin } from "@/lib/eng/context";
import { pendingMemberships } from "@/lib/eng/members";
import { ROLE_LABELS } from "@/lib/eng/permissions";
import { isInboxVerified } from "@/lib/security/email-verification";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Workspace invitations" };
export const dynamic = "force-dynamic";

/** Where a teammate without a workspace lands, so an invitation is never hidden behind role setup. */
export default async function WorkspaceInvitationsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/account/workspace-invitations");
  const pending = await pendingMemberships(engAdmin(), user.id);
  if (pending.length === 0) redirect("/app/employer");

  return (
    <AuthShell
      title="You have a workspace invitation"
      description="Accept it to join that hiring team. You get the access the owner chose for you, and nothing is shared until you accept."
    >
      <div className="grid gap-5">
        <InboxVerificationGate email={user.email.toLowerCase()} verified={await isInboxVerified(user)}>
          <PendingMemberships
            afterAccept="/app/employer"
            items={pending.map((p) => ({ id: p.id, organizationName: p.organizationName, roleLabel: ROLE_LABELS[p.role] }))}
          />
        </InboxVerificationGate>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/signup/role" variant="quiet" size="sm">
            Set up my own account instead
          </ButtonLink>
        </div>
      </div>
    </AuthShell>
  );
}
