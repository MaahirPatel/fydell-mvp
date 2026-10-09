import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { accountDisplayName } from "@/lib/auth/account-name";
import { withNext } from "@/lib/auth/safe-next";
import { getProfile } from "@/lib/profile/store";
import { loadWorkspaceContexts } from "@/lib/workspace/contexts";
import { loadDesk } from "@/lib/desk/data";
import { CandidateAccountProvider } from "@/components/candidate/CandidateAccount";
import DeskShell from "@/components/desk/DeskShell";

export const metadata = { title: { default: "Fydell", template: "%s | Fydell" } };
export const dynamic = "force-dynamic";

/** The installed app opens here: one window for invitations, tasks, reports and the profile. */
export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) {
    const asked = (await headers()).get("x-pathname") ?? "/app/desk";
    redirect(withNext("/login", asked.startsWith("/app/desk") ? asked : "/app/desk"));
  }
  const [name, profile, contexts, desk] = await Promise.all([
    accountDisplayName(user.id, user.email),
    getProfile(user.id).catch(() => null),
    loadWorkspaceContexts(user.id).catch(() => null),
    loadDesk(user).catch((err: unknown) => {
      console.error("[desk] could not load invitations", err);
      return { invitations: [], tasks: [] };
    }),
  ]);
  const account = { name, email: user.email, avatarUrl: profile?.avatarUrl || null, contexts };
  return (
    <CandidateAccountProvider account={account}>
      <DeskShell account={account} invitations={desk.invitations}>
        {children}
      </DeskShell>
    </CandidateAccountProvider>
  );
}
