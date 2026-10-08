import { requireUser } from "@/lib/simulations/auth";
import { accountDisplayName } from "@/lib/auth/account-name";
import { getProfile } from "@/lib/profile/store";
import { loadWorkspaceContexts } from "@/lib/workspace/contexts";
import { CandidateAccountProvider, type CandidateAccount } from "@/components/candidate/CandidateAccount";

async function loadAccount(): Promise<CandidateAccount | null> {
  const user = await requireUser();
  if (!user) return null;
  const [name, profile, contexts] = await Promise.all([
    accountDisplayName(user.id, user.email),
    getProfile(user.id),
    loadWorkspaceContexts(user.id).catch(() => null),
  ]);
  return {
    name,
    email: user.email,
    avatarUrl: profile?.avatarUrl || null,
    contexts,
  };
}

/**
 * Who is signed in, for the sidebar on every engineer page. Each page still
 * checks the session itself and redirects; this only names the account, and a
 * failure here leaves the pages working with an unnamed sidebar.
 */
export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const account = await loadAccount().catch(() => null);
  if (!account) return children;
  return <CandidateAccountProvider account={account}>{children}</CandidateAccountProvider>;
}
