import Link from "next/link";
import { getPublicProfile } from "@/lib/profile/store";
import { profileGroupsForSnapshots } from "@/lib/passport/capability/store";
import { CandidateShell, PublicHeaderLink } from "@/components/candidate/CandidateShell";
import PassportView from "@/components/passport/PassportView";
import ProfileOverview from "@/components/profile/ProfileOverview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Engineering Profile", robots: { index: false, follow: false } };

/**
 * Public engineering profile behind a passport share link. Reuses the share
 * mechanics (token, revocation, field projection); the profile layer adds
 * identity, connected-account labels, and a privacy-filtered evidence
 * timeline above the shared passport section.
 */
export default async function SharedProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getPublicProfile(token);

  if (shared.status !== "ok") {
    return (
      <CandidateShell width="narrow" action={<PublicHeaderLink />}>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text-primary)]">
          {shared.status === "revoked" ? "This link was revoked." : shared.status === "expired" ? "This link has expired." : "This profile link is not valid."}
        </h1>
        <p className="mt-3 text-app-body leading-[1.6] text-[var(--text-secondary)]">
          {shared.status === "revoked"
            ? "The engineer stopped sharing this profile. Ask them for a new link if you still need it."
            : shared.status === "expired"
              ? "The engineer set this link to stop working after a set time. Ask them for a new link if you still need it."
              : "Check that the full link was copied. Links stop working when the engineer revokes them."}
        </p>
        <Link href="/" className="mt-6 inline-flex text-app-body font-medium underline underline-offset-4">Go to Fydell</Link>
      </CandidateShell>
    );
  }

  const { profile, accounts, timeline, passport } = shared.public;
  const shownProjects = passport.projects.filter((p) => p.status !== "stale");
  // Reports are shown only for projects whose evidence this link shares.
  const capabilityGroups = await profileGroupsForSnapshots(shownProjects.filter((p) => p.evidence.length).map((p) => p.id).filter((id): id is string => !!id));
  const shownAccounts = [
    ...accounts.filter((a) => a.provider !== "github"),
    ...(passport.githubLogin ? [{ provider: "github" as const, label: passport.githubLogin }] : []),
  ];

  return (
    <CandidateShell width="wide" action={<PublicHeaderLink />}>
      <ProfileOverview
        profile={profile}
        accounts={shownAccounts}
        projects={shownProjects}
        presentations={passport.presentations}
        capabilityGroups={capabilityGroups}
        capabilities={passport.capabilities}
        roleSuggestions={passport.roleSuggestions}
        timeline={timeline}
        mode="shared"
        actions={
          <a
            href="#evidence"
            className="inline-flex h-9 items-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
          >
            See the evidence
          </a>
        }
      />

      <section id="evidence" className="mt-14 scroll-mt-24 border-t border-[var(--border-default)] pt-10">
        <PassportView passport={passport} mode="shared" />
      </section>

      <p className="mt-6 text-center text-app-meta text-[var(--text-tertiary)]">
        Hiring? <Link href="/signup?as=employer" className="underline underline-offset-4">Create a workspace</Link> to review shared profiles with your team.
      </p>
    </CandidateShell>
  );
}
