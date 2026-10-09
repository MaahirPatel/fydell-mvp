import type { ReactNode } from "react";
import ProofWorkbench from "@/components/simulations/ProofWorkbench";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/safe-next";
import { proofInviteAccess, startRunFromToken } from "@/lib/sim-engine/proof/db";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/simulations/auth";

export const dynamic = "force-dynamic";

function Notice({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) {
  return (
    <CandidateShell width="narrow">
      <h1 className="text-app-page font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-3 text-app-body leading-[1.65] text-[var(--text-secondary)]">{detail}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </CandidateShell>
  );
}

export default async function WorkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured()) {
    return (
      <main className="p-8 text-[var(--text-secondary)]">
        Workspace is not connected. Fydell cannot start this simulation.
      </main>
    );
  }
  const user = await requireUser();
  const here = `/work/${token}`;
  const access = await proofInviteAccess(token, user);

  switch (access.state) {
    case "invalid":
      return <Notice title="This invitation link is not valid" detail="The link may have been copied incompletely. Ask the company that invited you to send it again." />;
    case "sign_in":
      return (
        <Notice title="Sign in to start" detail="This invitation belongs to one email address. Sign in with that address, or create an account with it.">
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withNext("/login", here)} variant="primary" size="lg">
              Sign in
            </ButtonLink>
            <ButtonLink href={withNext("/signup", here)} variant="secondary" size="lg">
              Create an account
            </ButtonLink>
          </div>
        </Notice>
      );
    case "wrong_email":
      return (
        <Notice
          title="This invitation is for another address"
          detail={`It was sent to ${access.inviteEmail}, and you are signed in as ${user?.email ?? "another account"}. Sign in with the invited address to start.`}
        >
          <ButtonLink href={withNext("/login", here)} variant="primary" size="lg">
            Sign in as {access.inviteEmail}
          </ButtonLink>
        </Notice>
      );
    case "taken":
      return <Notice title="This invitation was already started" detail="Another account started this run. Ask the company that invited you for a new invitation if you need one." />;
    case "unverified":
      return (
        <Notice title="Confirm your email first" detail="The run starts as soon as your email is confirmed, so set aside time before you continue.">
          <InboxVerificationGate email={access.email} verified={false}>
            <ButtonLink href={here} variant="primary" size="lg">
              Continue to the simulation
            </ButtonLink>
          </InboxVerificationGate>
        </Notice>
      );
    case "ready": {
      const started = await startRunFromToken(token, user);
      return <ProofWorkbench runId={started.run.id} token={token} />;
    }
  }
}
