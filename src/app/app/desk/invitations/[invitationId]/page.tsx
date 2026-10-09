import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import AcceptEngInvitation from "@/components/eng/AcceptEngInvitation";
import EngInvitationBrief from "@/components/eng/EngInvitationBrief";
import { AuthoredInvitationBrief } from "@/components/work-samples/runtime/AuthoredInvitationBrief";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { engAdmin } from "@/lib/eng/context";
import { getInvitationForCandidate, invitationUsable } from "@/lib/eng/invitations";
import { resolveScenarioVersion } from "@/lib/eng/scenario-versions";
import { candidateTask } from "@/lib/eng/authored/runtime";
import { isInboxVerified } from "@/lib/security/email-verification";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Invitation" };
export const dynamic = "force-dynamic";

function Closed({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid max-w-[640px] gap-4">
      <h1 className="text-app-page text-[var(--text-primary)]">{title}</h1>
      <p className="text-app-body text-[var(--text-secondary)]">{detail}</p>
      <div>
        <ButtonLink href="/app/desk/inbox" variant="secondary" size="md">
          Back to inbox
        </ButtonLink>
      </div>
    </div>
  );
}

export default async function DeskInvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/app/desk/invitations/${invitationId}`)}`);

  const db = engAdmin();
  const invitation = await getInvitationForCandidate(db, invitationId, user.email);
  if (!invitation) {
    return <Closed title="Invitation not found" detail={`No invitation for ${user.email} matches this page. If you were invited with another address, sign in with that one.`} />;
  }

  const { data: attempt } = await db.from("eng_attempts").select("id, candidate_user_id").eq("invitation_id", invitation.id).maybeSingle();
  if (attempt && attempt.candidate_user_id === user.id) redirect(`/app/desk/tasks/${attempt.id}`);

  const usable = invitationUsable(invitation);
  if (usable.ok === false) return <Closed title="This invitation is closed" detail={usable.reason} />;

  const resolved = await resolveScenarioVersion(db, invitation.scenario_version_id);
  const accept = (
    <InboxVerificationGate email={user.email.toLowerCase()} verified={Boolean(invitation.is_preview) || (await isInboxVerified(user))}>
      <AcceptEngInvitation invitationId={invitation.id} taskBase="/app/desk/tasks" />
    </InboxVerificationGate>
  );
  return resolved.origin === "employer_authored" ? (
    <AuthoredInvitationBrief
      task={candidateTask(resolved.pkg)}
      roleTitle={invitation.role_snapshot.title}
      organizationName={invitation.role_snapshot.organizationName}
      companyContext={invitation.role_snapshot.companyContext}
      allowedMinutes={invitation.allowed_minutes}
      expiresAt={invitation.expires_at}
      preview={Boolean(invitation.is_preview)}
    >
      {accept}
    </AuthoredInvitationBrief>
  ) : (
    <EngInvitationBrief invitation={invitation} definition={resolved.definition}>
      {accept}
    </EngInvitationBrief>
  );
}
