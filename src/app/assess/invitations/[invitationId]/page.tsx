import { redirect } from "next/navigation";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import AcceptEngInvitation from "@/components/eng/AcceptEngInvitation";
import EngInvitationBrief from "@/components/eng/EngInvitationBrief";
import { withNext } from "@/lib/auth/safe-next";
import { engAdmin } from "@/lib/eng/context";
import { getInvitationForCandidate, invitationUsable } from "@/lib/eng/invitations";
import { resolveScenarioVersion } from "@/lib/eng/scenario-versions";
import { candidateTask } from "@/lib/eng/authored/runtime";
import { AuthoredInvitationBrief } from "@/components/work-samples/runtime/AuthoredInvitationBrief";
import { requireUser } from "@/lib/simulations/auth";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { isInboxVerified } from "@/lib/security/email-verification";

export const metadata = { title: "Engineering task invitation" };
export const dynamic = "force-dynamic";

function Closed({ title, detail, switchTo }: { title: string; detail: string; switchTo?: string }) {
  return (
    <CandidateShell>
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">{detail}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {switchTo ? (
          <ButtonLink href={withNext("/login", switchTo)} variant="accent" size="lg">
            Sign in with another account
          </ButtonLink>
        ) : null}
        <ButtonLink href="/app/candidate" variant="secondary" size="lg">
          Back to your evaluations
        </ButtonLink>
      </div>
    </CandidateShell>
  );
}

export default async function CandidateInvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  const user = await requireUser();
  if (!user) redirect(withNext("/login", `/assess/invitations/${invitationId}`));

  const db = engAdmin();
  const invitation = await getInvitationForCandidate(db, invitationId, user.email);
  if (!invitation) {
    return (
      <Closed
        title="Invitation not found"
        detail={`No invitation for ${user.email} matches this page. If you were invited with another address, sign in with that one.`}
        switchTo={`/assess/invitations/${invitationId}`}
      />
    );
  }

  const { data: attempt } = await db.from("eng_attempts").select("id, candidate_user_id").eq("invitation_id", invitation.id).maybeSingle();
  if (attempt && attempt.candidate_user_id === user.id) redirect(`/assess/${attempt.id}`);

  const usable = invitationUsable(invitation);
  if (usable.ok === false) return <Closed title="This invitation is closed" detail={usable.reason} />;

  const resolved = await resolveScenarioVersion(db, invitation.scenario_version_id);
  const accept = (
    <InboxVerificationGate
      email={user.email.toLowerCase()}
      verified={Boolean(invitation.is_preview) || (await isInboxVerified(user))}
    >
      <AcceptEngInvitation invitationId={invitation.id} />
    </InboxVerificationGate>
  );
  return (
    <CandidateShell>
      {resolved.origin === "employer_authored" ? (
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
      )}
    </CandidateShell>
  );
}
