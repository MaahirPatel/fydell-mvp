import { redirect } from "next/navigation";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import AcceptEngInvitation from "@/components/eng/AcceptEngInvitation";
import EngInvitationBrief from "@/components/eng/EngInvitationBrief";
import { withNext } from "@/lib/auth/safe-next";
import { engAdmin } from "@/lib/eng/context";
import { getInvitationForCandidate, invitationUsable } from "@/lib/eng/invitations";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task invitation" };
export const dynamic = "force-dynamic";

function Closed({ title, detail }: { title: string; detail: string }) {
  return (
    <CandidateShell>
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">{detail}</p>
      <div className="mt-6">
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
    return <Closed title="Invitation not found" detail={`No invitation for ${user.email} matches this page. If you were invited with another address, sign in with that one.`} />;
  }

  const { data: attempt } = await db.from("eng_attempts").select("id, candidate_user_id").eq("invitation_id", invitation.id).maybeSingle();
  if (attempt && attempt.candidate_user_id === user.id) redirect(`/assess/${attempt.id}`);

  const usable = invitationUsable(invitation);
  if (usable.ok === false) return <Closed title="This invitation is closed" detail={usable.reason} />;

  const { definition } = await scenarioForVersionId(db, invitation.scenario_version_id);
  return (
    <CandidateShell>
      <EngInvitationBrief invitation={invitation} definition={definition}>
        <AcceptEngInvitation invitationId={invitation.id} />
      </EngInvitationBrief>
    </CandidateShell>
  );
}
