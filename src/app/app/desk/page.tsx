import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { loadDesk } from "@/lib/desk/data";
import { accountDisplayName } from "@/lib/auth/account-name";
import { DeskSection, InvitationList, TaskList } from "@/components/desk/DeskLists";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function DeskHomePage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Fdesk");
  const [{ invitations, tasks }, name] = await Promise.all([loadDesk(user), accountDisplayName(user.id, user.email)]);
  const open = tasks.filter((t) => t.open);
  const done = tasks.filter((t) => !t.open);
  const first = name.split(/\s+/)[0] || name;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-app-page text-[var(--text-primary)]">Welcome back, {first}</h1>
        <p className="mt-1 text-app-body text-[var(--text-secondary)]">
          Signed in as <span className="font-medium text-[var(--text-primary)]">{user.email}</span>. Invitations sent to this address arrive in your inbox, and every task you accept stays on this account.
        </p>
      </div>

      {invitations.length > 0 ? (
        <DeskSection title="New invitations" count={invitations.length}>
          <InvitationList invitations={invitations} />
        </DeskSection>
      ) : null}

      {open.length > 0 ? (
        <DeskSection title="Waiting on you" count={open.length}>
          <TaskList tasks={open} />
        </DeskSection>
      ) : null}

      {invitations.length === 0 && open.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you"
          description={`Simulations are invite-only. When a hiring team invites ${user.email}, the invitation appears in your inbox with its deadline. Until then you can try the practice simulation or add projects to your profile.`}
          action={
            <ButtonLink href="/app/candidate/practice" variant="primary" size="sm">
              Try the practice simulation
            </ButtonLink>
          }
          secondary={
            <ButtonLink href="/app/desk/profile" variant="quiet" size="sm">
              Open your profile
            </ButtonLink>
          }
        />
      ) : null}

      {done.length > 0 ? (
        <DeskSection title="Submitted" count={done.length}>
          <TaskList tasks={done} />
        </DeskSection>
      ) : null}
    </div>
  );
}
