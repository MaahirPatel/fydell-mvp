import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { requireUser } from "@/lib/simulations/auth";
import { accountDisplayName } from "@/lib/auth/account-name";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { getProfileHub } from "@/lib/profile/store";
import { getPresentations } from "@/lib/passport/presentation-store";
import { profileGroupsForSnapshots } from "@/lib/passport/capability/store";
import { listProfileSimulations } from "@/lib/profile/simulations";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { SHARE_HREF } from "@/components/candidate/nav";
import { ButtonLink } from "@/components/ui/Button";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileIdentityForm from "@/components/profile/ProfileIdentityForm";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

/**
 * Old links pointed at this route with repository-import parameters; those
 * belong to the work record now.
 */
export default async function CandidateProfilePage({ searchParams }: { searchParams: Promise<{ github?: string; repos?: string }> }) {
  const params = await searchParams;
  if (params.github || params.repos) {
    const q = new URLSearchParams();
    if (params.github) q.set("github", params.github);
    if (params.repos) q.set("repos", params.repos);
    redirect(`/app/candidate/work-record?${q.toString()}`);
  }

  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/profile")}`);

  const [hub, passport, shares, simulations] = await Promise.all([
    getProfileHub(user.id, await accountDisplayName(user.id, user.email)),
    getOwnerPassport(user.id),
    listShares(user.id),
    listProfileSimulations(user.id),
  ]);
  const projects = (passport?.projects ?? []).filter((p) => p.status !== "stale");
  const [presentations, capabilityGroups] = await Promise.all([
    getPresentations(user.id, passport?.projects ?? []),
    profileGroupsForSnapshots(projects.map((p) => p.id).filter((id): id is string => !!id)),
  ]);
  const liveShares = shares.filter((s) => !s.revokedAt).length;
  const githubLogin = passport?.githubLogin ?? null;
  const accounts = [
    ...hub.accounts.filter((a) => a.provider !== "github").map((a) => ({ provider: a.provider, label: a.label })),
    ...(githubLogin ? [{ provider: "github" as const, label: githubLogin }] : []),
  ];

  return (
    <CandidateShell width="wide" current="profile">
      <ProfileOverview
        profile={hub.profile}
        accounts={accounts}
        projects={projects}
        presentations={presentations}
        capabilityGroups={capabilityGroups}
        capabilities={passport?.capabilities ?? null}
        roleSuggestions={passport?.roleSuggestions ?? []}
        simulations={simulations}
        timeline={hub.timeline}
        mode="owner"
        actions={
          <>
            <ProfileIdentityForm initial={hub.profile} githubLogin={githubLogin} />
            <ButtonLink href={SHARE_HREF} variant="primary" size="sm">
              <Link2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {liveShares ? `Shared · ${liveShares} link${liveShares === 1 ? "" : "s"}` : "Share profile"}
            </ButtonLink>
          </>
        }
        emptyAbout={
          <p className="max-w-[60ch] text-[14px] leading-[1.6] text-[var(--text-secondary)]">
            Add a few sentences about what you build and the kind of team you work best in. Use Edit profile above.
          </p>
        }
      />
    </CandidateShell>
  );
}
