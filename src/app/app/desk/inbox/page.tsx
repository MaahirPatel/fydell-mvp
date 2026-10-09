import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { loadDesk } from "@/lib/desk/data";
import { isInboxVerified } from "@/lib/security/email-verification";
import { InboxVerificationGate } from "@/components/security/InboxVerificationGate";
import { DeskSection, InvitationList } from "@/components/desk/DeskLists";

export const metadata = { title: "Inbox" };
export const dynamic = "force-dynamic";

export default async function DeskInboxPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Fdesk%2Finbox");
  const [{ invitations }, verified] = await Promise.all([loadDesk(user), isInboxVerified(user).catch(() => false)]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-app-page text-[var(--text-primary)]">Inbox</h1>
        <p className="mt-1 text-app-body text-[var(--text-secondary)]">
          Invitations sent to <span className="font-medium text-[var(--text-primary)]">{user.email}</span>. If a hiring team used another address, sign in with that one to see it.
        </p>
      </div>

      {!verified && invitations.length > 0 ? (
        <div className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-4">
          <p className="mb-3 text-app-body text-[var(--text-primary)]">Confirm this inbox once before accepting. Fydell emails a code to {user.email} to prove the invitation reached you.</p>
          <InboxVerificationGate email={user.email.toLowerCase()} verified={false}>
            <p className="text-app-body text-[var(--text-secondary)]">Inbox confirmed. You can accept invitations below.</p>
          </InboxVerificationGate>
        </div>
      ) : null}

      <DeskSection title="Waiting for you" count={invitations.length}>
        {invitations.length === 0 ? (
          <p className="rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-4 py-6 text-app-body text-[var(--text-secondary)]">
            No invitations right now. When a hiring team invites {user.email}, it appears here and in the inbox at the top right.
          </p>
        ) : (
          <InvitationList invitations={invitations} />
        )}
      </DeskSection>
    </div>
  );
}
