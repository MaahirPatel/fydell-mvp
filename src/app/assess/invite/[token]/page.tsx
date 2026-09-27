import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import AcceptEngInvitation from "@/components/eng/AcceptEngInvitation";
import EngInvitationBrief from "@/components/eng/EngInvitationBrief";
import { withNext } from "@/lib/auth/safe-next";
import { engAdmin } from "@/lib/eng/context";
import { getInvitationByToken, invitationUsable } from "@/lib/eng/invitations";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task invitation" };
export const dynamic = "force-dynamic";

function Closed({ title, detail }: { title: string; detail: string }) {
  return (
    <CandidateShell>
      <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">{detail}</p>
    </CandidateShell>
  );
}

export default async function EngInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = engAdmin();
  const invitation = await getInvitationByToken(db, token);
  if (!invitation) {
    return <Closed title="This invitation link is not valid" detail="The link may be incomplete, or the employer sent a newer one. Check your latest email or ask them to resend it." />;
  }
  const user = await requireUser();
  if (invitation.accepted_by && user?.id === invitation.accepted_by) {
    const { data: attempt } = await db.from("eng_attempts").select("id").eq("invitation_id", invitation.id).maybeSingle();
    if (attempt) {
      return (
        <CandidateShell>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">You already accepted this invitation</h1>
          <div className="mt-6">
            <ButtonLink href={`/assess/${attempt.id}`} variant="accent" size="lg">
              Continue
            </ButtonLink>
          </div>
        </CandidateShell>
      );
    }
  }
  const usable = invitationUsable(invitation);
  if (usable.ok === false) return <Closed title="This invitation is closed" detail={usable.reason} />;

  const { definition } = await scenarioForVersionId(db, invitation.scenario_version_id);
  const here = `/assess/invite/${token}`;
  const emailMismatch = user && user.email.toLowerCase() !== invitation.candidate_email;

  return (
    <CandidateShell>
      <EngInvitationBrief invitation={invitation} definition={definition}>
        {!user ? (
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withNext("/login", here)} variant="accent" size="lg">
              Sign in to accept
            </ButtonLink>
            <ButtonLink href={withNext("/signup", here)} variant="secondary" size="lg">
              Create an account
            </ButtonLink>
          </div>
        ) : emailMismatch ? (
          <p className="rounded-[var(--radius-panel)] border border-[var(--border-default)] px-4 py-3 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
            This invitation was sent to a different email address than the one you are signed in with ({user.email}). Sign out and sign in with the invited address, or ask the employer to invite this one.
          </p>
        ) : (
          <AcceptEngInvitation token={token} />
        )}
      </EngInvitationBrief>
    </CandidateShell>
  );
}
