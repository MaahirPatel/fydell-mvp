import { Link2 } from "lucide-react";
import { accountDisplayName } from "@/lib/auth/account-name";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { getProfileHub } from "@/lib/profile/store";
import { getPresentations } from "@/lib/passport/presentation-store";
import { profileReportsForSnapshots } from "@/lib/passport/capability/store";
import { listProfileSimulations } from "@/lib/profile/simulations";
import { listWorkSamples } from "@/lib/profile-evidence/work-samples";
import { SHARE_HREF } from "@/components/candidate/nav";
import { ButtonLink } from "@/components/ui/Button";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileIdentityForm from "@/components/profile/ProfileIdentityForm";

/** The signed-in engineer's own profile, as shown on the website workspace and in the installed app. */
export default async function OwnerProfile({ user }: { user: { id: string; email: string } }) {
  const [hub, passport, shares, simulations, workSamples] = await Promise.all([
    getProfileHub(user.id, await accountDisplayName(user.id, user.email)),
    getOwnerPassport(user.id),
    listShares(user.id),
    listProfileSimulations(user.id),
    listWorkSamples(user.id),
  ]);
  const taskDemonstrations = workSamples.map((w) => ({
    id: w.id,
    title: w.summary.title,
    organization: null,
    summary: w.summary.summary,
    checks: w.summary.checks,
    unresolved: w.summary.unresolved,
    releasedAt: w.summary.releasedAt,
    href: `/assess/${w.attemptId}`,
  }));
  const projects = (passport?.projects ?? []).filter((p) => p.status !== "stale");
  const [presentations, reports] = await Promise.all([
    getPresentations(user.id, passport?.projects ?? []),
    profileReportsForSnapshots(projects.map((p) => p.id).filter((id): id is string => !!id)),
  ]);
  const liveShares = shares.filter((s) => !s.revokedAt).length;
  const githubLogin = passport?.githubLogin ?? null;
  const accounts = [
    ...hub.accounts.filter((a) => a.provider !== "github").map((a) => ({ provider: a.provider, label: a.label })),
    ...(githubLogin ? [{ provider: "github" as const, label: githubLogin }] : []),
  ];

  return (
    <ProfileOverview
      profile={hub.profile}
      accounts={accounts}
      projects={projects}
      presentations={presentations}
      capabilityGroups={reports.groups}
      projectDigests={reports.digests}
      taskDemonstrations={taskDemonstrations}
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
  );
}
