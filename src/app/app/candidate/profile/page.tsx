import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport, listShares } from "@/lib/passport/store";
import { getProfileHub } from "@/lib/profile/store";
import { getPresentations } from "@/lib/passport/presentation-store";
import { listProfileSimulations } from "@/lib/profile/simulations";
import { CandidateShell } from "@/components/candidate/CandidateShell";
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
    getProfileHub(user.id, user.email.split("@")[0]),
    getOwnerPassport(user.id),
    listShares(user.id),
    listProfileSimulations(user.id),
  ]);
  const projects = (passport?.projects ?? []).filter((p) => p.status !== "stale");
  const presentations = await getPresentations(user.id, passport?.projects ?? []);
  const liveShares = shares.filter((s) => !s.revokedAt).length;

  return (
    <CandidateShell width="wide" current="profile">
      <ProfileOverview
        profile={hub.profile}
        accounts={hub.accounts.map((a) => ({ provider: a.provider, label: a.label }))}
        projects={projects}
        presentations={presentations}
        capabilities={passport?.capabilities ?? null}
        roleSuggestions={passport?.roleSuggestions ?? []}
        simulations={simulations}
        timeline={hub.timeline}
        mode="owner"
        actions={
          <>
            <ProfileIdentityForm initial={hub.profile} />
            <Link
              href="/app/candidate/work-record#share"
              className="inline-flex h-9 items-center rounded-[8px] bg-[var(--control-solid)] px-4 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] hover:bg-[var(--control-solid-hover)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--accent-line)]"
            >
              {liveShares ? `Shared · ${liveShares} link${liveShares === 1 ? "" : "s"}` : "Share profile"}
            </Link>
          </>
        }
        emptyAbout={
          <p className="max-w-[60ch] text-[15px] leading-[1.6] text-[var(--text-secondary)]">
            Add a few sentences about what you build and the kind of team you work best in. Use Edit profile above.
          </p>
        }
      />
    </CandidateShell>
  );
}
