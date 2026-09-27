import { CandidateShell } from "@/components/candidate/CandidateShell";
import { ButtonLink } from "@/components/ui/Button";
import AcceptEngInvitation from "@/components/eng/AcceptEngInvitation";
import { withNext } from "@/lib/auth/safe-next";
import { engAdmin } from "@/lib/eng/context";
import { getInvitationByToken, invitationUsable } from "@/lib/eng/invitations";
import { scenarioForVersionId } from "@/lib/eng/scenario-versions";
import { requireUser } from "@/lib/simulations/auth";

export const metadata = { title: "Engineering task invitation | Fydell" };
export const dynamic = "force-dynamic";

function Closed({ title, detail }: { title: string; detail: string }) {
  return (
    <CandidateShell width="narrow">
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
        <CandidateShell width="narrow">
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
  const snapshot = invitation.role_snapshot;
  const here = `/assess/invite/${token}`;
  const emailMismatch = user && user.email.toLowerCase() !== invitation.candidate_email;

  return (
    <CandidateShell width="narrow">
      <p className="text-app-meta text-[var(--text-tertiary)]">{snapshot.organizationName} invited you</p>
      <h1 className="mt-2 text-[24px] font-medium tracking-[-0.02em] text-[var(--text-primary)]">{snapshot.title}</h1>
      {snapshot.companyContext ? <p className="mt-3 text-[14.5px] leading-[1.65] text-[var(--text-secondary)]">{snapshot.companyContext}</p> : null}

      <div className="mt-6 grid gap-3 rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 text-[14px] leading-[1.6] text-[var(--text-secondary)]">
        <p className="text-[var(--text-primary)]">{definition.title}</p>
        <p>{definition.summary}</p>
        <ul className="grid gap-1.5">
          <li>About {definition.targetMinutes} minutes of work, with a {invitation.allowed_minutes}-minute window once you press Start.</li>
          <li>You work locally in your own editor. Fydell does not watch your screen or files.</li>
          <li>Needs: {definition.prerequisites.join(" ")}</li>
          <li>Nothing starts until you finish a setup check and press Start. This invitation expires {new Date(invitation.expires_at).toUTCString()}.</li>
        </ul>
      </div>

      <div className="mt-6">
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
      </div>
      <p className="mt-6 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
        Use a desktop or laptop. A qualified person reviews your work before the employer sees any findings.
      </p>
    </CandidateShell>
  );
}
